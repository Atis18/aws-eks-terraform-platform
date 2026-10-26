# Terraform state backend

## Configuration and ownership

The committed `terraform/backend.tf` uses S3 remote state with native locking:

```hcl
terraform {
  backend "s3" {
    key          = "eks-portfolio/terraform.tfstate"
    region       = "eu-central-1"
    encrypt      = true
    use_lockfile = true
  }
}
```

Native S3 locking requires Terraform 1.10 or newer; CI uses 1.13.5. The bucket name is supplied during initialization. Use an AWS CLI profile or environment-based credentials, rather than putting credentials in this block.

The backend expects an existing bucket. This root module does not create or manage it. Provision it separately, using a separate bootstrap configuration/state or an explicit one-time setup. Destroying this platform does not delete a separately managed backend bucket.

## Before a real AWS deployment

1. Create a private S3 bucket in `eu-central-1` with a globally unique name, or use the existing backend bucket.
2. Enable bucket versioning and encryption; keep S3 Block Public Access enabled.
3. Grant the Terraform identity bucket listing, read/write access to the state object, and read/write/delete access to its `.tflock` object. Scope permissions to the intended bucket and object paths.
4. From the repository root, set the real bucket name and initialize:

   ```bash
   export TF_STATE_BUCKET="YOUR_EXISTING_STATE_BUCKET_NAME"
   terraform -chdir=terraform init -backend-config="bucket=$TF_STATE_BUCKET"
   ```

If Terraform reports changed backend settings, first confirm the old environment and its state. Use migration for existing live infrastructure. Reconfiguration to a fresh, empty backend is appropriate only when intentionally starting a new environment after the old one has been fully destroyed, or after a reviewed state recovery.

Keep the backend bucket and its version history after demo teardown. Its lifecycle is separate from the EKS/RDS/application resources. S3 storage and request charges are outside the application's partial cost baseline.

## Local validation and CI

Validation does not need a provisioned state bucket. In a previously initialized working directory, cached backend settings can still refer to a deleted bucket. Use the separate data directory tested for this project:

```bash
TF_DATA_DIR=.terraform/ci-check terraform -chdir=terraform init -backend=false -input=false -lockfile=readonly
TF_DATA_DIR=.terraform/ci-check terraform -chdir=terraform validate
```

The variable is set only for each command. Both commands use the same cache directory; the normal deployment backend settings remain separate. Fresh GitHub Actions checkouts do not contain the old local backend cache.

## State loss

A saved plan contains planning-time snapshots, not the final state resulting from applying that plan. Recreating an empty bucket does not recreate deleted state. If managed AWS resources still exist, recover a current state backup or review imports before applying configuration again.

Do not commit `.terraform/`, state files, saved plans or credentials. The public backend declaration itself can be committed.

## References

- [HashiCorp: S3 backend and permissions](https://developer.hashicorp.com/terraform/language/backend/s3)
- [HashiCorp: TF_DATA_DIR](https://developer.hashicorp.com/terraform/cli/config/environment-variables#tf_data_dir)
- [AWS: backend best practices and native S3 locking](https://docs.aws.amazon.com/prescriptive-guidance/latest/terraform-aws-provider-best-practices/backend.html)
