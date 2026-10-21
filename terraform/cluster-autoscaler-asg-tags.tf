locals {
  cluster_autoscaler_asg_tags = {
    "k8s.io/cluster-autoscaler/enabled"                 = "true"
    "k8s.io/cluster-autoscaler/${var.project_name}-eks" = "owned"
    "kubernetes.io/cluster/${var.project_name}-eks"     = "owned"
  }
}

resource "aws_autoscaling_group_tag" "cluster_autoscaler" {
  for_each = local.cluster_autoscaler_asg_tags

  autoscaling_group_name = module.eks.eks_managed_node_groups["general"].node_group_autoscaling_group_names[0]

  tag {
    key                 = each.key
    value               = each.value
    propagate_at_launch = false
  }
}