locals {
  cloudfront_no_cache_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
  cloudfront_all_viewer_except_host_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
}

resource "aws_cloudfront_vpc_origin" "alb" {
  count = var.enable_cloudfront ? 1 : 0

  vpc_origin_endpoint_config {
    name                   = "${var.project_name}-alb-origin"
    arn                    = var.cloudfront_alb_arn
    http_port              = 80
    https_port             = 443
    origin_protocol_policy = "http-only"

    origin_ssl_protocols {
      items    = ["TLSv1.2"]
      quantity = 1
    }
  }

  lifecycle {
    precondition {
      condition = (
        var.cloudfront_alb_arn != "" &&
        var.cloudfront_alb_dns_name != ""
      )
      error_message = "CloudFront requires the internal ALB ARN and DNS name."
    }
  }

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

resource "aws_cloudfront_distribution" "app" {
  count = var.enable_cloudfront ? 1 : 0

  enabled         = true
  is_ipv6_enabled = true
  comment         = "${var.project_name} application"
  price_class     = "PriceClass_100"

  origin {
    domain_name = var.cloudfront_alb_dns_name
    origin_id   = "internal-alb"

    vpc_origin_config {
      vpc_origin_id = aws_cloudfront_vpc_origin.alb[0].id
    }
  }

  # React frontend: all paths except /api/*
  default_cache_behavior {
    target_origin_id       = "internal-alb"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]

    cache_policy_id = local.cloudfront_no_cache_policy_id
    origin_request_policy_id = local.cloudfront_all_viewer_except_host_id

    compress = true
  }

  # Express API: authenticated requests must not be cached.
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "internal-alb"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = [
      "GET", "HEAD", "OPTIONS",
      "PUT", "POST", "PATCH", "DELETE"
    ]

    cached_methods = ["GET", "HEAD"]

    cache_policy_id = local.cloudfront_no_cache_policy_id
    origin_request_policy_id = local.cloudfront_all_viewer_except_host_id

    compress = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}