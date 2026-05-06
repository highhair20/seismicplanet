output "nameservers" {
  description = "Update your registrar to delegate to these Route 53 nameservers"
  value       = aws_route53_zone.main.name_servers
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_id" {
  description = "Needed for cache invalidation in GitHub Actions"
  value       = aws_cloudfront_distribution.main.id
}

output "s3_bucket" {
  description = "Name of the main S3 bucket (site, data, parquet)"
  value       = aws_s3_bucket.main.bucket
}

output "ecr_repository_url" {
  description = "Push pipeline images here"
  value       = aws_ecr_repository.pipeline.repository_url
}

output "eks_cluster_name" {
  description = "EKS cluster name — use with kubectl and aws eks update-kubeconfig"
  value       = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  description = "EKS API server endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "eks_oidc_provider_arn" {
  description = "OIDC provider ARN — reference this when creating additional IRSA roles"
  value       = aws_iam_openid_connect_provider.eks.arn
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs — used for EKS nodes and internal load balancers"
  value       = aws_subnet.private[*].id
}

output "pipeline_role_arn" {
  description = "Annotate the pipeline Kubernetes ServiceAccount with this ARN"
  value       = aws_iam_role.pipeline.arn
}

output "github_deploy_role_arn" {
  description = "Set as AWS_ROLE_ARN in GitHub Actions"
  value       = aws_iam_role.github_actions_deploy.arn
}
