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

output "lambda_function_name" {
  description = "Pipeline Lambda function name"
  value       = aws_lambda_function.pipeline.function_name
}

output "lambda_function_arn" {
  description = "Pipeline Lambda function ARN"
  value       = aws_lambda_function.pipeline.arn
}

output "github_deploy_role_arn" {
  description = "Set as AWS_DEPLOY_ROLE_ARN in GitHub Actions secrets"
  value       = aws_iam_role.github_actions_deploy.arn
}
