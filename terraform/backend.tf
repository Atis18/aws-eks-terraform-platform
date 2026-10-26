terraform {
  backend "s3" {
    key          = "eks-portfolio/terraform.tfstate"
    region       = "eu-central-1"
    encrypt      = true
    use_lockfile = true
  }
}
