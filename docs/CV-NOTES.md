# CV project notes

## Suggested CV description

**AWS EKS Terraform Platform — DevOps portfolio project**

Built a Terraform-managed AWS EKS platform for a containerized React/Express application, using private subnets, PostgreSQL RDS, ECR, Helm and EKS Pod Identity. Added GitHub Actions checks for application tests, PostgreSQL migration integration tests, Terraform validation, Helm rendering and Docker Compose smoke tests.

**Stack:** AWS, Terraform, Kubernetes/EKS, Docker, Helm, PostgreSQL, GitHub Actions, React, Node.js/Express.

Hungarian version:

Terraformmal definiált AWS EKS platform egy konténerizált React/Express alkalmazáshoz, privát alhálózatokkal, RDS PostgreSQL-lel, ECR-rel, Helmmel és EKS Pod Identity-val. GitHub Actions ellenőrzések alkalmazástesztekhez, valódi PostgreSQL-migrációs tesztekhez, Terraform-validáláshoz, Helm-rendereléshez és Docker Compose smoke tesztekhez.

Use a successful CI run as evidence for automated checks. Describe live AWS deployment as verified only after completing and recording the deployment checks; do not add an uptime, cost-saving or performance claim without measurements.

## Codecool checklist mapping

| Checklist item | Repository evidence |
| --- | --- |
| Recent project in the target stack | AWS/Terraform/Kubernetes platform focus; appropriate for junior DevOps/cloud roles |
| README: purpose and technologies | Root README with project scope and stack |
| Run without an IDE | Root Docker Compose stack and CLI instructions; Firebase configuration prerequisite is explicit |
| Avoid port 5000 | Frontend 8080, backend 3001, PostgreSQL 5432 |
| Architecture/data diagram | README request-flow diagram and architecture document's ER model |
| Automated testing | Backend/frontend suites, PostgreSQL integration, platform contracts, Helm and container checks |
| Dockerfile | Separate backend and multistage frontend Dockerfiles |
| Commit history | Existing history retained; future changes should use focused, descriptive commits |
| Cloud deployment link | Optional after deployment; no unverified or expired demo URL is advertised |

A junior DevOps/cloud CV can place this project first. A frontend or backend application role may call for a different first project.

## Short interview walkthrough

1. Explain the boundary between Terraform resources, Helm controllers and application manifests.
2. Trace a browser request through CloudFront, the private ALB, the API and RDS.
3. Explain why an IAM Pod Identity association must use the exact Helm service account name.
4. Show a test failure caught by CI, then distinguish mocked HTTP tests from real SQL integration tests.
5. Discuss the two NAT Gateways/Multi-AZ RDS cost tradeoff and the ordered teardown.
6. Explain remaining gaps: tested state recovery, authorization, browser tests, monitoring and availability verification.

## Optional live demo evidence

After an intentional AWS deployment, record the date, commit SHA and sanitized outputs of:

```bash
kubectl get nodes
kubectl get deployments,services,ingress
kubectl get externalsecret
bash scripts/smoke-test.sh "$(terraform -chdir=terraform output -raw cloudfront_url)"
```

Capture the application after sign-in and a sanitized architecture/resource view. Do not capture passwords, ID tokens, secret values, Terraform state or private configuration. Record when the infrastructure was torn down so reviewers know whether a demo URL is expected to be available.
