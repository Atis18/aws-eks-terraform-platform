output "eks_api_allowed_cidr" {
  description = "Public IPv4 CIDR allowed to access the EKS API endpoint"
  value       = local.eks_admin_cidr
}

output "rds_endpoint" {
  description = "Private PostgreSQL endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "rds_database_name" {
  description = "Application database name"
  value       = aws_db_instance.postgres.db_name
}

output "rds_host" {
  description = "RDS PostgreSQL hostname without port"
  value       = aws_db_instance.postgres.address
}

output "rds_master_secret_arn" {
  description = "Secrets Manager ARN for the RDS master credentials"
  value       = aws_db_instance.postgres.master_user_secret[0].secret_arn
}

output "ecr_repository_urls" {
  description = "Private ECR repository URLs for the application"
  value = {
    for name, repository in aws_ecr_repository.app :
    name => repository.repository_url
  }
}