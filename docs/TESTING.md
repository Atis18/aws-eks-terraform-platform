# Testing

The CI workflow is in [`ci.yml`](../.github/workflows/ci.yml). It runs on pull requests, branch pushes and manual dispatch. Jobs require no AWS credentials and never run `terraform apply`.

## Test layers

| Layer | What it checks | External dependency |
| --- | --- | --- |
| Backend unit/HTTP | Token acceptance/rejection, CRUD responses, input validation, liveness/readiness failures and verified TLS configuration | None; database calls and token verification are stubbed |
| Frontend | Authentication UI/context, protected routes, forms, CRUD pages, search and authenticated REST clients | jsdom; Firebase and network calls are mocked |
| PostgreSQL integration | Real migrations, UUID defaults, generated names, CRUD, check constraints and foreign-key deletion behavior | Disposable PostgreSQL 17 |
| Platform contracts | Services/ports/selectors, Ingress routing, ConfigMap/secret references, probe ports and controller Pod Identity names | Python and PyYAML |
| Helm rendering | Pinned charts render and their effective service accounts match the Pod Identity names | Helm and chart downloads |
| Terraform validation | Formatting, module/provider initialization and configuration/schema validation | Terraform registry; no AWS account |
| Docker smoke | Both images build; frontend, SPA route, proxied API, database readiness and unauthenticated API rejection work together | Docker Compose |

These checks do not validate AWS permissions against a live account, CloudFront connectivity, RDS failover, real Firebase sign-in or a browser-driven end-to-end user journey.

## Backend

Use Node.js 22:

```bash
npm --prefix apps/backend ci
npm --prefix apps/backend test
npm --prefix apps/backend run test:coverage
```

The coverage command enforces **80% line coverage**. Node prints its coverage report in the job log. The suite includes 39 tests at the time this workflow was introduced; the test runner's current output is the source of truth.

The default test command selects `test/*.test.js` explicitly, so unit tests never unexpectedly connect to a database.

## PostgreSQL integration

Start local Compose as described in the [README](../README.md), then point the integration command at its local database. With the sample local password, on Bash:

```bash
TEST_DATABASE_URL=postgres://appuser:localdevonly@127.0.0.1:5432/appdb \
  npm --prefix apps/backend run test:integration
```

On PowerShell:

```powershell
$env:TEST_DATABASE_URL = 'postgres://appuser:localdevonly@127.0.0.1:5432/appdb'
npm --prefix apps/backend run test:integration
Remove-Item Env:TEST_DATABASE_URL
```

Adapt the URL if you changed the local password; URL-encode special characters. Use only a development/test database. Each test creates a unique schema inside a transaction, applies the actual migrations, and rolls back its changes. The database role needs permission to create schemas.

CI supplies a fresh PostgreSQL 17 service and runs these six tests without mocks. Missing `TEST_DATABASE_URL` fails the integration command rather than silently skipping tests.

## Frontend

```bash
npm --prefix apps/frontend ci
npm --prefix apps/frontend run lint
npm --prefix apps/frontend test
npm --prefix apps/frontend run test:coverage
npm --prefix apps/frontend run build
```

The HTML coverage report is `apps/frontend/coverage/index.html`; CI uploads it as the `frontend-coverage` artifact. Coverage includes application components, pages, context and REST clients. The browser entry point, Firebase wiring, barrel exports and test setup are excluded, as documented in `vitest.config.js`.

## Infrastructure and controllers

Terraform 1.13.5 and Helm 3.19.0 are pinned in CI. Run from the repository root:

Local validation uses a separate data directory so cached S3 backend settings do not interfere. See [state backend setup](STATE-BACKEND.md).

```bash
terraform -chdir=terraform fmt -check -recursive
TF_DATA_DIR=.terraform/ci-check terraform -chdir=terraform init -backend=false -input=false -lockfile=readonly
TF_DATA_DIR=.terraform/ci-check terraform -chdir=terraform validate

python -m pip install -r tests/requirements.txt
python -m unittest discover -s tests -p 'test_*.py' -v

bash -n scripts/*.sh
bash scripts/addons.sh render /tmp/eks-addons
python tests/check_rendered_addons.py /tmp/eks-addons
```

The Helm versions are centralized in [`helm/versions.env`](../helm/versions.env). Rendering writes local manifests only. Installing controllers is a separate, explicit `bash scripts/addons.sh install` command against the current kubeconfig context.

`terraform validate` does not produce a deployment plan or confirm regional service/version availability. Review a real AWS plan separately before provisioning.

## Container smoke test

```bash
docker compose --env-file .env.sample config --quiet
docker compose --env-file .env.sample up --build --wait
bash scripts/smoke-test.sh
docker compose --env-file .env.sample down --volumes
```

The sample Firebase settings permit image builds and infrastructure connectivity checks. They do not provide working sign-in. For an interactive application demo, configure a real Firebase web app in `.env` and follow the README.

The smoke test can also target a deployed application:

```bash
bash scripts/smoke-test.sh https://YOUR_DISTRIBUTION.cloudfront.net
```

The final `down --volumes` command deletes the local database. CI uses it only for its disposable test stack.
