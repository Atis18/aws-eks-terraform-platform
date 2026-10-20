# AWS Infrastructure Cost Estimate

> **Status:** Work in progress
>
> These are **estimated idle infrastructure costs, not an AWS bill or a guarantee of pricing**.

## Assumptions

| Parameter | Value |
| --- | --- |
| AWS Region | `eu-central-1` (Frankfurt) |
| Currency | USD |
| Pricing model | On-Demand, public list prices |
| Workload | Provisioned and running, with no application/user traffic |
| Availability | Two Availability Zones |
| Comparison periods | 1 hour, 8 hours, 24 hours, and **30 days (720 hours)** |
| Discounts | No Free Tier, educational AWS credits, Savings Plans or Reserved Instances deducted |
| Exclusions | Taxes/VAT, variable data transfer, request-based charges and any unconfigured services |
| Last reviewed | 2026-10-20 |

**How calculations work:** `quantity × unit price × running hours`. Values are rounded to USD cents for period totals. An AWS Pricing Calculator *average month* is commonly **730 hours**, whereas **30 full days = 720 hours**; this document uses 720 hours consistently for its 30-day column.

An idle infrastructure still incurs charges for many **provisioned** resources. Zero user traffic does **not** mean zero billing. For example: EKS nodes may download images, perform health checks, and send logs. Those variable costs are excluded from the baseline, not guaranteed to be zero.

## 1. VPC and networking — defined in Terraform

**Terraform component:** `terraform/vpc.tf` (`terraform-aws-modules/vpc/aws`)

**Architecture:** One VPC across 2 AZs; 2 public, 2 private and 2 database subnets; 1 public NAT Gateway per AZ. NAT Gateways use one Elastic IP each.

### Provisioned resources and idle baseline

| Resource | Quantity | Unit price | Base cost / hour | 8 hours | 24 hours | 30 days (720h) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| NAT Gateway | 2 | **~$0.052 / gateway-hour** | $0.104 | $0.83 | $2.50 | $74.88 |
| Public IPv4 / Elastic IP for NAT | 2 | **$0.005 / IP-hour** | $0.010 | $0.08 | $0.24 | $7.20 |
| VPC | 1 | $0 additional hourly charge | $0 | $0 | $0 | $0 |
| Public subnets | 2 | $0 additional hourly charge | $0 | $0 | $0 | $0 |
| Private subnets | 2 | $0 additional hourly charge | $0 | $0 | $0 | $0 |
| Database subnets | 2 | $0 additional hourly charge | $0 | $0 | $0 | $0 |
| Internet Gateway | 1 | $0 additional hourly charge | $0 | $0 | $0 | $0 |
| Route tables, routes and associations | Multiple | $0 additional hourly charge | $0 | $0 | $0 | $0 |
| RDS subnet group | 1 | $0 additional hourly charge | $0 | $0 | $0 | $0 |
| **VPC subtotal** | | | **$0.114** | **$0.91** | **$2.74** | **$82.08** |

**Notes:**

- Frankfurt NAT Gateway pricing is shown as an **approximate regional rate**. Confirm it using the AWS Pricing Calculator or current AWS pricing before running `terraform apply`.
- NAT Gateway data processing (**approximately $0.052/GB in Frankfurt**) and standard data-transfer charges are **not included** in the idle baseline. Cross-AZ traffic may also cost extra.
- The public IPv4 line represents the **2 NAT-associated Elastic IPs only**. If a future ALB, node, or other service uses additional billable public IPv4 addresses, record them under that component.
- Using a NAT Gateway in each AZ improves resilience and reduces the need for cross-AZ NAT traffic. It also doubles the fixed NAT Gateway cost relative to a single gateway.
- VPC endpoints, if added later, must be listed separately: gateway endpoints and interface endpoints have different pricing models.

**Sources:** [Amazon VPC pricing](https://aws.amazon.com/vpc/pricing/), [AWS NAT Gateway pricing guide](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html), [AWS public IPv4 pricing](https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights/), [AWS Pricing Calculator](https://calculator.aws/).

## 2. EKS Cluster and Managed Node Group

**Terraform component:** `terraform/eks.tf` (`terraform-aws-modules/eks/aws`)

**Architecture:** One EKS cluster running Kubernetes 1.36 with standard support, one managed node group spanning two Availability Zones, and two `m6i.large` EC2 instances at idle capacity.

### Provisioned resources and idle baseline

| Resource | Quantity | Unit price | Base cost / hour | 8 hours | 24 hours | 30 days (720h) |
|---|---:|---:|---:|---:|---:|---:|
| EKS control plane | 1 | $0.100 / cluster-hour | $0.100 | $0.80 | $2.40 | $72.00 |
| EC2 `m6i.large` | 2 | ~$0.115 / instance-hour | $0.230 | $1.84 | $5.52 | $165.60 |
| EBS gp3 root volumes | 60 GiB | ~$0.0952 / GiB-month | ~$0.0079 | $0.06 | $0.19 | $5.71 |
| Managed node group, IAM roles and security groups | Multiple | No additional fixed hourly charge | $0 | $0 | $0 | $0 |
| **EKS subtotal** | | | **~$0.338** | **$2.70** | **$8.11** | **$243.31** |

### Notes

- The baseline assumes two running On-Demand worker nodes (`desired_size = 2`). Costs increase if the node group scales out.
- The node group allows 2–4 nodes, but an autoscaling controller must be configured separately.
- EBS pricing assumes two encrypted, 30 GiB gp3 root volumes with default performance.
- The core EKS addons do not have a separate fixed addon subscription fee; related AWS usage may still be chargeable.
- CloudWatch log ingestion, storage, data transfer and any additional usage-based charges are excluded.
- Prices are estimates and should be rechecked before deployment.

**Sources:** [Amazon EKS pricing](https://aws.amazon.com/eks/pricing/), [EC2 On-Demand pricing](https://aws.amazon.com/ec2/pricing/on-demand/), [EBS pricing](https://aws.amazon.com/ebs/pricing/), [AWS Pricing Calculator](https://calculator.aws/).


## 3. EKS Add-ons — EBS CSI and Pod Identity

**Terraform components:** `terraform/eks.tf`, `terraform/ebs-csi.tf`

**Architecture:** EKS Pod Identity Agent, Amazon EBS CSI Driver and an IAM role using `AmazonEBSCSIDriverPolicyV2`.

### Provisioned resources and idle baseline

| Resource | Quantity | Unit price | 1 hour | 8 hours | 24 hours | 30 days (720h) |
|---|---:|---:|---:|---:|---:|---:|
| EKS Pod Identity Agent | 1 add-on | No additional fixed charge | $0 | $0 | $0 | $0 |
| Amazon EBS CSI Driver | 1 add-on | No additional fixed charge | $0 | $0 | $0 | $0 |
| IAM role and policy attachment | 1 each | No additional fixed charge | $0 | $0 | $0 | $0 |
| Additional EBS volumes | 0 currently | Usage-based | $0 | $0 | $0 | $0 |
| **Add-ons subtotal** | | | **$0** | **$0** | **$0** | **$0** |

### Notes

- These add-ons do not introduce a separate fixed subscription or hourly charge.
- The add-ons consume resources on the existing worker nodes.
- Dynamically provisioned EBS volumes will incur storage charges when PersistentVolumeClaims are created.
- The worker-node root EBS volumes are already included in the EKS cost estimate.
- Related monitoring, logging and data-transfer charges are excluded.

**Sources:** [Amazon EKS pricing](https://aws.amazon.com/eks/pricing/), [Amazon EBS pricing](https://aws.amazon.com/ebs/pricing/), [AWS EBS CSI Driver documentation](https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html).

## 4. AWS Load Balancer Controller — IAM preparation

**Terraform component:** `terraform/load-balancer-controller.tf`

**Architecture:** Dedicated IAM role, controller-specific IAM policy and EKS Pod Identity association.

### Provisioned resources and idle baseline

| Resource | Quantity | Unit price | 1 hour | 8 hours | 24 hours | 30 days (720h) |
|---|---:|---:|---:|---:|---:|---:|
| IAM role | 1 | No additional charge | $0 | $0 | $0 | $0 |
| IAM policy and attachment | 1 each | No additional charge | $0 | $0 | $0 | $0 |
| EKS Pod Identity association | 1 | No additional charge | $0 | $0 | $0 | $0 |
| **Subtotal** | | | **$0** | **$0** | **$0** | **$0** |

### Notes

- This step only configures AWS permissions for the controller.
- The Kubernetes controller itself will be installed later using Helm.
- No Application Load Balancer is provisioned at this stage.
- ALB hourly charges, LCU usage and related public IPv4 charges will be documented when an ALB is configured.
- The controller will use the existing EKS worker-node capacity.

**Sources:** [AWS Load Balancer Controller documentation](https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html), [AWS Elastic Load Balancing pricing](https://aws.amazon.com/elasticloadbalancing/pricing/).

## 5. Cluster Autoscaler — IAM preparation

**Terraform component:** `terraform/cluster-autoscaler.tf`

**Architecture:** Dedicated IAM role and policy with an EKS
Pod Identity association for the Cluster Autoscaler.

### Provisioned resources and idle baseline

| Resource | Quantity | Unit price | 1 hour | 8 hours | 24 hours | 30 days (720h) |
|---|---:|---:|---:|---:|---:|---:|
| IAM role | 1 | No additional charge | $0 | $0 | $0 | $0 |
| IAM policy and attachment | 1 each | No additional charge | $0 | $0 | $0 | $0 |
| EKS Pod Identity association | 1 | No additional charge | $0 | $0 | $0 | $0 |
| **Subtotal** | | | **$0** | **$0** | **$0** | **$0** |

### Notes

- This step configures IAM permissions only.
- The Cluster Autoscaler will be deployed later using Helm.
- The controller runs on existing worker-node capacity.
- Scaling above two nodes increases EC2 and EBS costs.
- The current baseline assumes two worker nodes and is unchanged.

**Sources:** [Amazon EKS pricing](https://aws.amazon.com/eks/pricing/),
[AWS EKS autoscaling best practices](https://aws.github.io/aws-eks-best-practices/cluster-autoscaling/).

## 6. RDS PostgreSQL — Multi-AZ

**Terraform component:** `terraform/rds.tf`

**Architecture:** One private Amazon RDS PostgreSQL 17 Multi-AZ DB instance (`db.t4g.medium`) with a primary and standby in separate Availability Zones, 20 GiB gp3 storage, encryption at rest, and an RDS-managed master password in AWS Secrets Manager.

### Provisioned resources and idle baseline

| Resource | Quantity | Unit price | Base cost / hour | 8 hours | 24 hours | 30 days (720h) |
|---|---:|---:|---:|---:|---:|---:|
| RDS PostgreSQL Multi-AZ DB instance | 1 deployment (primary + standby) | ~$0.149 / deployment-hour | $0.149 | $1.19 | $3.58 | $107.28 |
| RDS Multi-AZ gp3 storage | 20 GiB provisioned | ~$0.274 / GiB-month | ~$0.0076 | $0.06 | $0.18 | $5.48 |
| Secrets Manager — master credentials | 1 secret | ~$0.40 / secret-month | ~$0.0006 | < $0.01 | $0.01 | $0.40 |
| Security group and ingress rule | 1 each | No additional fixed charge | $0 | $0 | $0 | $0 |
| Existing database subnet group | 1 | Already covered by VPC configuration | $0 | $0 | $0 | $0 |
| **RDS subtotal** | | | **~$0.157** | **$1.26** | **$3.77** | **$113.16** |

### Notes

- This is a Multi-AZ DB instance deployment with one non-readable standby, not a Multi-AZ DB cluster with two readable standbys.
- The database has no public endpoint access. PostgreSQL connections are permitted from the EKS worker-node security group only.
- Storage encryption and IAM database authentication are enabled.
- The master password is managed by RDS through Secrets Manager; Secrets Manager API requests are excluded.
- Additional storage, CPU-credit charges if applicable, backup storage beyond the included allowance, and other variable charges are excluded.
- The estimate assumes two AZs and the specified On-Demand instance class.
- `skip_final_snapshot = true` and disabled deletion protection are intended only for this temporary portfolio environment.
- Regional rates are approximate and must be confirmed in AWS Pricing Calculator before deployment.

**Sources:** [Amazon RDS for PostgreSQL pricing](https://aws.amazon.com/rds/postgresql/pricing/), [AWS Secrets Manager pricing](https://aws.amazon.com/secrets-manager/pricing/), [AWS Pricing Calculator](https://calculator.aws/).

### Combined infrastructure baseline

| Component | Hourly | 8 hours | 24 hours | 30 days (720h) |
|---|---:|---:|---:|---:|
| VPC and networking | $0.114 | $0.91 | $2.74 | $82.08 |
| EKS and managed node group | ~$0.338 | $2.70 | $8.11 | $243.31 |
| EKS addons and controller IAM configuration | $0 | $0 | $0 | $0 |
| RDS PostgreSQL Multi-AZ | ~$0.157 | $1.26 | $3.77 | $113.16 |
| **Total** | **~$0.609** | **$4.87** | **$14.62** | **$438.55** |

Totals represent estimated provisioned idle resources, excluding usage-based charges and components not yet configured.

## Cost controls and teardown

- Run `terraform plan` and review resources **before** `terraform apply`. `plan` by itself does not provision this infrastructure.
- Create an AWS Budget / billing alert before a live demo. An alert does **not** automatically prevent spending.
- Keep demo infrastructure alive only for the necessary verification and screenshots.
- Run `terraform destroy` when finished, and verify that billed resources (especially NAT Gateways, Elastic IPs, load balancers, EC2, EBS volumes, EKS, RDS and snapshots) have actually been removed.
- Watch for retained storage, snapshots or other resources that may survive teardown.
- Use the [AWS Pricing Calculator](https://calculator.aws/) for a final pre-deployment estimate and AWS Cost Explorer / Billing afterward for actual spending.

## Updating this document

Whenever a new Terraform component is committed:

1. List the resources it provisions, with **quantities and sizes** from the Terraform configuration/plan.
2. Record the **unit price** and whether it is hourly, per GB-month, per GB, per request, etc.
3. Compute its **idle baseline** for 1h, 8h, 24h and 720h where the pricing unit allows it.
4. Keep variable usage charges in a separate note, to avoid suggesting they are included in idle pricing.
5. Add a dated pricing source and recheck rates before deploying.