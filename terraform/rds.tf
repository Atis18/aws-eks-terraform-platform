resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "PostgreSQL access from EKS worker nodes"
  vpc_id      = module.vpc.vpc_id

  tags = {
    Name      = "${var.project_name}-rds-sg"
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_eks" {
  security_group_id = aws_security_group.rds.id

  referenced_security_group_id = module.eks.node_security_group_id

  ip_protocol = "tcp"
  from_port   = 5432
  to_port     = 5432

  description = "PostgreSQL from EKS worker nodes"
}

resource "aws_db_instance" "postgres" {
  identifier = "${var.project_name}-postgres"

  engine                   = "postgres"
  engine_version           = "17"
  engine_lifecycle_support = "open-source-rds-extended-support-disabled"
  instance_class           = "db.t4g.medium"

  db_name  = "appdb"
  username = "dbadmin"

  manage_master_user_password = true

  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  multi_az = true

  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [aws_security_group.rds.id]

  publicly_accessible = false
  port                = 5432

  iam_database_authentication_enabled = true

  backup_retention_period    = 1
  auto_minor_version_upgrade = true

  deletion_protection = false
  skip_final_snapshot = true

  tags = {
    Name      = "${var.project_name}-postgres"
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}