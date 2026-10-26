# AWS deployment and teardown

Run commands from the repository root in Bash. This procedure provisions billable resources. The [local Compose setup](../README.md#run-locally) is the lower-cost way to review the application.

## Prerequisites

- An AWS account and authenticated AWS CLI v2 session with permission to create the resources in `terraform/`.
- Terraform 1.13.5 (the CI version), Helm 3.19.0, kubectl compatible with Kubernetes 1.36, Docker Compose v2, Git and jq.
- A Firebase web application configured as described in the README. Use the same project for frontend builds and backend token verification.
- An AWS budget/billing alert and a reviewed [cost estimate](COSTS.md).
- An existing, separately provisioned S3 state bucket with versioning and appropriate state/lockfile permissions. Follow [state backend setup](STATE-BACKEND.md). State contents and backend credentials must stay outside Git.

The defaults are `eu-central-1` and `eks-portfolio`. If changing region or project name, also update the SecretStore region, ExternalSecret remote key, the backend CA bundle and the ALB CloudFront prefix-list annotation. The installer overrides controller cluster/region values from Terraform outputs.

## 1. Review and provision the foundation

```bash
aws sts get-caller-identity
cp terraform/terraform.tfvars.example terraform/terraform.tfvars

export TF_STATE_BUCKET="YOUR_EXISTING_STATE_BUCKET_NAME"
terraform -chdir=terraform init -backend-config="bucket=$TF_STATE_BUCKET"
terraform -chdir=terraform fmt -check -recursive
terraform -chdir=terraform validate
terraform -chdir=terraform plan -out=foundation.tfplan
```

Edit `terraform.tfvars` before planning if needed. An empty `eks_admin_cidr` detects your current public IPv4 and allows that `/32` on the EKS API. Keep `enable_cloudfront = false` for the first apply.

Review the saved plan and its resource sizes, IAM permissions and deletion settings, then apply it intentionally:

```bash
terraform -chdir=terraform apply foundation.tfplan

export AWS_REGION="$(terraform -chdir=terraform output -raw aws_region)"
export CLUSTER_NAME="$(terraform -chdir=terraform output -raw cluster_name)"
aws eks update-kubeconfig --region "$AWS_REGION" --name "$CLUSTER_NAME"
kubectl config current-context
kubectl get nodes
kubectl get pods -n kube-system
```

Run kubectl with the identity granted cluster access by Terraform. Wait for the EKS nodes and Pod Identity Agent to be ready. Reconcile `eks_admin_cidr` if your administrator IP changes.

## 2. Install controllers

```bash
bash scripts/addons.sh install
kubectl get deployments -n kube-system
kubectl get deployments -n external-secrets
```

Versions are pinned in [`helm/versions.env`](../helm/versions.env). Service accounts are created by Helm and use the Pod Identity associations already defined by Terraform. Do not create a parallel IRSA role or another service account with a different name.

The Load Balancer Controller is configured for Ingress/Service routing; its ALB/NLB Gateway API feature gates are disabled. A future Gateway API adoption requires its CRDs and a separate compatibility review. For upgrades, review the controller/External Secrets release notes and CRD upgrade instructions; Helm does not automatically upgrade every chart's CRDs.

When upgrading EKS, update the autoscaler image to the matching Kubernetes major/minor and rerun the Helm checks. The current pair is EKS 1.36 / autoscaler v1.36.1.

## 3. Initialize RDS and the application secret

Follow [RDS initialization](RDS-INITIALIZATION.md). Use an administrative connection from inside the VPC to:

1. Apply the two schema migrations.
2. Create the restricted `appuser` role.
3. Set a strong password with psql's `\password appuser`.
4. Store matching `PGUSER` and `PGPASSWORD` fields in the existing Secrets Manager secret `eks-portfolio/app-db`.

Terraform creates the secret container only. It does not generate the SQL user or populate the application's secret value. Never give the application the RDS administrator credentials.

## 4. Build and push application images

Configure the real Firebase web settings in the root `.env`. These are compiled into the frontend image.

```bash
docker compose build

export BACKEND_REPO="$(terraform -chdir=terraform output -json ecr_repository_urls | jq -r .backend)"
export FRONTEND_REPO="$(terraform -chdir=terraform output -json ecr_repository_urls | jq -r .frontend)"
export REGISTRY="${BACKEND_REPO%/*}"
export IMAGE_TAG="$(git rev-parse --short HEAD)"

aws ecr get-login-password --region "$AWS_REGION" |
  docker login --username AWS --password-stdin "$REGISTRY"

docker tag eks-portfolio-local-backend "$BACKEND_REPO:$IMAGE_TAG"
docker tag eks-portfolio-local-frontend "$FRONTEND_REPO:$IMAGE_TAG"
docker push "$BACKEND_REPO:$IMAGE_TAG"
docker push "$FRONTEND_REPO:$IMAGE_TAG"
```

Build Linux `amd64` images for the configured x86_64 nodes. On an ARM development machine, set `DOCKER_DEFAULT_PLATFORM=linux/amd64` before building. ECR tags are immutable: rebuilds with changed content need a new tag.

The root Compose configuration's Nginx proxy is a **local bind mount**. It is not baked into the frontend image; ALB handles API routing on AWS.

## 5. Configure and deploy the application

Set the actual Firebase project ID used for the image build:

```bash
export FIREBASE_PROJECT_ID=your-firebase-project-id
export RDS_HOST="$(terraform -chdir=terraform output -raw rds_host)"

kubectl create configmap employee-madness-backend-config \
  --from-literal=PGHOST="$RDS_HOST" \
  --from-literal=PGDATABASE=appdb \
  --from-literal=FIREBASE_PROJECT_ID="$FIREBASE_PROJECT_ID" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f k8s/backend/secretstore.yaml
kubectl apply -f k8s/backend/externalsecret.yaml
kubectl wait --for=condition=Ready externalsecret/employee-madness-db --timeout=180s

kubectl apply -f k8s/backend/service.yaml -f k8s/frontend/service.yaml
kubectl set image --local -f k8s/backend/deployment.yaml \
  backend="$BACKEND_REPO:$IMAGE_TAG" -o yaml | kubectl apply -f -
kubectl set image --local -f k8s/frontend/deployment.yaml \
  frontend="$FRONTEND_REPO:$IMAGE_TAG" -o yaml | kubectl apply -f -

kubectl rollout status deployment/employee-madness-backend --timeout=180s
kubectl rollout status deployment/employee-madness-frontend --timeout=180s
kubectl apply -f k8s/ingress.yaml
kubectl get ingress employee-madness --watch
```

Stop watching once the ALB address appears. The `--local` commands replace image placeholders before applying, and the generated ConfigMap replaces the sample host/project values. Do not subsequently apply the placeholder ConfigMap or Deployments unchanged.

The ALB annotation uses the Frankfurt CloudFront managed prefix list `pl-a3a144ca`. Verify that ID in the target account/region before applying, especially when changing region:

```bash
aws ec2 describe-managed-prefix-lists --region "$AWS_REGION" \
  --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing \
  --query 'PrefixLists[].{Name:PrefixListName,Id:PrefixListId}' --output table
```

If needed, update the annotation to the returned prefix list. Its security-group rule weight also counts toward AWS security-group quotas.

## 6. Add the CloudFront VPC origin

The internal ALB must exist and reach `active` state first.

```bash
export ALB_DNS="$(kubectl get ingress employee-madness -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
export ALB_ARN="$(aws elbv2 describe-load-balancers --region "$AWS_REGION" \
  --query "LoadBalancers[?DNSName=='$ALB_DNS'].LoadBalancerArn | [0]" --output text)"
aws elbv2 wait load-balancer-available --region "$AWS_REGION" --load-balancer-arns "$ALB_ARN"
```

Set these fields in the existing `terraform/terraform.tfvars` using the real values:

```hcl
enable_cloudfront        = true
cloudfront_alb_arn       = "YOUR_INTERNAL_ALB_ARN"
cloudfront_alb_dns_name  = "YOUR_INTERNAL_ALB_DNS_NAME"
```

Then review and apply:

```bash
terraform -chdir=terraform plan -out=edge.tfplan
terraform -chdir=terraform apply edge.tfplan
terraform -chdir=terraform output -raw cloudfront_url
```

Wait for the distribution to deploy. Add its hostname to Firebase Authentication's authorized domains. Run:

```bash
bash scripts/smoke-test.sh "$(terraform -chdir=terraform output -raw cloudfront_url)"
```

Finally test real sign-in, employee/equipment CRUD and a browser reload on `/list`. Check healthy ALB target groups, ExternalSecret readiness and controller logs. A successful Terraform apply alone does not verify application behavior.

## Troubleshooting

| Symptom | Checks |
| --- | --- |
| kubectl times out or access is denied | Administrator `/32`, current AWS identity and kubeconfig context |
| Autoscaler lacks AWS credentials | Pod Identity Agent, namespace and exact `rbac.serviceAccount.name`; association must use `cluster-autoscaler` |
| ExternalSecret is not Ready | Secret value exists, JSON field names, region, secret ARN permission and operator service account |
| Backend is unready | RDS host, migrations, application password, node-to-RDS security-group rule and TLS CA |
| Frontend loads but API does not | Ingress `/api` route, backend Service/target health and browser authorization header |
| Firebase sign-in fails | Provider enabled, matching project IDs, authorized domain and frontend rebuilt after configuration changes |
| CloudFront returns 502/504 | Active ALB, healthy targets, VPC origin status and ALB security-group access from CloudFront |
| ECR push rejects a tag | Immutable tags require a new image tag for changed image contents |

## Ordered teardown

First preserve any data you need. In this portfolio configuration, destroying RDS skips the final snapshot, the application secret has no recovery window, and destroying ECR removes its images.

1. Set `enable_cloudfront = false`, review a Terraform plan, then apply it. Wait until the distribution and its VPC origin are removed.
2. Delete the Ingress **while the Load Balancer Controller is still installed**:

   ```bash
   kubectl delete -f k8s/ingress.yaml --wait=true
   aws elbv2 wait load-balancers-deleted --region "$AWS_REGION" --load-balancer-arns "$ALB_ARN"
   ```

3. Remove application resources and controllers:

   ```bash
   kubectl delete deployment employee-madness-backend employee-madness-frontend
   kubectl delete service employee-madness-backend employee-madness-frontend
   kubectl delete externalsecret employee-madness-db
   kubectl delete secretstore employee-madness-aws
   kubectl delete configmap employee-madness-backend-config
   helm uninstall external-secrets -n external-secrets
   helm uninstall cluster-autoscaler -n kube-system
   helm uninstall aws-load-balancer-controller -n kube-system
   ```

4. Review and apply the infrastructure destroy plan:

   ```bash
   terraform -chdir=terraform plan -destroy -out=destroy.tfplan
   terraform -chdir=terraform apply destroy.tfplan
   ```

5. Verify AWS resource removal and billing: NAT Gateways, Elastic IPs, EC2/EBS, ALB, EKS, RDS, snapshots and retained storage. Retain the separately provisioned state bucket and its state history after teardown. Billing alerts do not stop spending automatically.

## References

- [CloudFront VPC origin prerequisites, lifecycle and security groups](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-vpc-origins.html)
- [AWS Load Balancer Controller Helm installation and CRD upgrades](https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html)
- [EKS Cluster Autoscaler guidance](https://aws.github.io/aws-eks-best-practices/cluster-autoscaling/)
