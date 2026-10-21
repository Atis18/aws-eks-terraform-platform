data "http" "current_ip" {
  count = trimspace(var.eks_admin_cidr) == "" ? 1 : 0

  url = "https://checkip.amazonaws.com/"
}

locals {
  eks_admin_cidr = (
    trimspace(var.eks_admin_cidr) == ""
    ? "${trimspace(data.http.current_ip[0].response_body)}/32"
    : trimspace(var.eks_admin_cidr)
  )
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "21.29.0"

  name               = "${var.project_name}-eks"
  kubernetes_version = "1.36"

  upgrade_policy = {
    support_type = "STANDARD"
  }

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  endpoint_private_access      = true
  endpoint_public_access       = true
  endpoint_public_access_cidrs = [local.eks_admin_cidr]

  enable_cluster_creator_admin_permissions = true

  # Use AWS-owned encryption instead of a customer-managed KMS key.
  encryption_config        = null
  create_kms_key           = false
  attach_encryption_policy = false

  cloudwatch_log_group_retention_in_days = 7

  addons = {
    coredns    = {}
    kube-proxy = {}

    vpc-cni = {
      before_compute = true
    }

    eks-pod-identity-agent = {
      before_compute = true
    }
  }

  eks_managed_node_groups = {
    general = {
      ami_type       = "AL2023_x86_64_STANDARD"
      instance_types = ["m6i.large"]
      capacity_type  = "ON_DEMAND"

      subnet_ids = module.vpc.private_subnets

      min_size     = 2
      desired_size = 2
      max_size     = 4

      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"

          ebs = {
            volume_size           = 30
            volume_type           = "gp3"
            encrypted             = true
            delete_on_termination = true
          }
        }
      }
    }
  }

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}