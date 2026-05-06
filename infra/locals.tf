locals {
  common_tags = {
    ManagedBy = "Terraform"
    Project   = var.cluster_name
  }

  # VPC
  azs             = ["${var.region}a", "${var.region}b"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.20.0/24"]

  # EKS OIDC — trimmed for use in IAM condition keys
  oidc_issuer = trimprefix(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://")
}
