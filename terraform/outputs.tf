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