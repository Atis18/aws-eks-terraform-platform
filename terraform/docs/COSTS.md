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