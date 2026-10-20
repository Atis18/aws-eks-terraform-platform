output "eks_api_allowed_cidr" {
  description = "Public IPv4 CIDR allowed to access the EKS API endpoint"
  value       = local.eks_admin_cidr
}