# RDS PostgreSQL bootstrap

This procedure is performed after the AWS infrastructure has been
created with Terraform.

## Prerequisites

- RDS PostgreSQL is running in the private database subnets.
- An administrative PostgreSQL connection is available from inside the VPC.
- The RDS master credentials are available in AWS Secrets Manager.
- External Secrets Operator and its Pod Identity association are configured.

## 1. Run database migrations

Connect to the `appdb` database as `dbadmin`.

Run the migrations in order:

1. `db/migrations/001_create_equipments.sql`
2. `db/migrations/002_create_employees.sql`

## 2. Create the application database user

Run:

`db/initialization/001_create_app_user.sql`

This creates the `appuser` role and grants access to the application
tables without database administrator privileges.

## 3. Set the application password

In the PostgreSQL psql session, run:

\password appuser

Enter a strong, unique password when prompted.

Do not store the password in SQL scripts, Git, or Terraform variables.

## 4. Populate AWS Secrets Manager

Open the existing Terraform-managed secret:

`<project_name>/app-db`

Store the following JSON structure:

{
  "PGUSER": "appuser",
  "PGPASSWORD": "<application-password>"
}

The password must match the one assigned to the PostgreSQL role.

Do not create a separate duplicate secret.

## 5. Verify External Secrets synchronization

After deploying External Secrets Operator, SecretStore,
and ExternalSecret, verify that the ExternalSecret becomes Ready.

The generated Kubernetes Secret must be named:

`employee-madness-db`

It must contain the keys PGUSER and PGPASSWORD.

Never print or commit the secret values.

## 6. Verify the backend

- Configure PGHOST using the RDS hostname (without the port).
- Configure PGDATABASE as appdb.
- Enable verified TLS for the RDS connection.
- Deploy the backend.
- Verify that /api/ready returns HTTP 200.
- Verify that protected API endpoints reject requests without
  a valid Firebase ID token.