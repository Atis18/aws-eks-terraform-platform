#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-http://127.0.0.1:8080}"
base_url="${base_url%/}"

# Requests go through Nginx (locally) or CloudFront and ALB (on AWS).
curl --fail --silent --show-error --max-time 20 "$base_url/" > /dev/null
curl --fail --silent --show-error --max-time 20 "$base_url/list" > /dev/null
curl --fail --silent --show-error --max-time 20 "$base_url/api/health"
printf '\n'
curl --fail --silent --show-error --max-time 20 "$base_url/api/ready"
printf '\n'

for resource in employees equipments; do
  status=$(curl --silent --show-error --max-time 20 --output /dev/null \
    --write-out '%{http_code}' "$base_url/api/$resource")
  if [[ "$status" != "401" ]]; then
    printf 'Expected unauthenticated %s request to return 401; received %s.\n' "$resource" "$status" >&2
    exit 1
  fi
done

printf 'Smoke checks passed: frontend, SPA route, API, database readiness and auth boundary.\n'
