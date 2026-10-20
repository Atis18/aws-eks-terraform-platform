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