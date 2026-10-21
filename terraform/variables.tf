variable "aws_region" {
  description = "AWS region for the infrastructure"
  type        = string
  default     = "eu-central-1"
}

variable "project_name" {
  description = "Name prefix for AWS resources"
  type        = string
  default     = "eks-portfolio"
}

variable "eks_admin_cidr" {
  description = "Enter an IPv4 /32 CIDR, or press Enter to automatically use your current public IP."
  type        = string

  validation {
    condition = (
      trimspace(var.eks_admin_cidr) == "" ||
      (
        can(cidrnetmask(trimspace(var.eks_admin_cidr))) &&
        endswith(trimspace(var.eks_admin_cidr), "/32")
      )
    )

    error_message = "Enter a valid IPv4 /32 CIDR, or leave it empty for automatic detection."
  }
}

variable "enable_cloudfront" {
  description = "Create CloudFront after the internal ALB is available"
  type        = bool
  default     = false
}

variable "cloudfront_alb_arn" {
  description = "ARN of the internal ALB created by the Kubernetes Ingress"
  type        = string
  default     = ""
}

variable "cloudfront_alb_dns_name" {
  description = "DNS hostname of the internal ALB, without http://"
  type        = string
  default     = ""
}