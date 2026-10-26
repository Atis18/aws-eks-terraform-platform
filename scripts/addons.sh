#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
source "$repo_root/helm/versions.env"
mode="${1:-render}"

case "$mode" in
  render)
    output_dir="${2:?Usage: bash scripts/addons.sh render OUTPUT_DIRECTORY}"
    mkdir -p "$output_dir"
    helm template aws-load-balancer-controller aws-load-balancer-controller \
      --repo https://aws.github.io/eks-charts --version "$AWS_LB_CHART_VERSION" \
      --namespace kube-system -f "$repo_root/helm/aws-load-balancer-controller/values.yaml" \
      --set-string vpcId=vpc-render-only > "$output_dir/aws-load-balancer-controller.yaml"
    helm template cluster-autoscaler cluster-autoscaler \
      --repo https://kubernetes.github.io/autoscaler --version "$AUTOSCALER_CHART_VERSION" \
      --namespace kube-system -f "$repo_root/helm/cluster-autoscaler/values.yaml" \
      > "$output_dir/cluster-autoscaler.yaml"
    helm template external-secrets external-secrets \
      --repo https://charts.external-secrets.io --version "$EXTERNAL_SECRETS_CHART_VERSION" \
      --namespace external-secrets -f "$repo_root/helm/external-secrets/values.yaml" \
      > "$output_dir/external-secrets.yaml"
    ;;
  install)
    # Run only after terraform apply and aws eks update-kubeconfig.
    cluster=$(terraform -chdir="$repo_root/terraform" output -raw cluster_name)
    region=$(terraform -chdir="$repo_root/terraform" output -raw aws_region)
    vpc=$(terraform -chdir="$repo_root/terraform" output -raw vpc_id)
    helm upgrade --install aws-load-balancer-controller aws-load-balancer-controller \
      --repo https://aws.github.io/eks-charts --version "$AWS_LB_CHART_VERSION" \
      --namespace kube-system -f "$repo_root/helm/aws-load-balancer-controller/values.yaml" \
      --set-string clusterName="$cluster" --set-string region="$region" --set-string vpcId="$vpc" \
      --wait --timeout 10m
    helm upgrade --install cluster-autoscaler cluster-autoscaler \
      --repo https://kubernetes.github.io/autoscaler --version "$AUTOSCALER_CHART_VERSION" \
      --namespace kube-system -f "$repo_root/helm/cluster-autoscaler/values.yaml" \
      --set-string autoDiscovery.clusterName="$cluster" --set-string awsRegion="$region" \
      --wait --timeout 10m
    helm upgrade --install external-secrets external-secrets \
      --repo https://charts.external-secrets.io --version "$EXTERNAL_SECRETS_CHART_VERSION" \
      --namespace external-secrets --create-namespace \
      -f "$repo_root/helm/external-secrets/values.yaml" --wait --timeout 10m
    ;;
  *)
    printf 'Usage: bash scripts/addons.sh {render OUTPUT_DIRECTORY|install}\n' >&2
    exit 2
    ;;
esac
