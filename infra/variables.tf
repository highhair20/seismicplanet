variable "aws_account_id" {
  type        = string
  description = "AWS account ID where project resources are deployed"
}

variable "aws_region" {
  type        = string
  description = "AWS region where project resources are deployed"
}

variable "project_name" {
  type        = string
  description = "Short unique identifier for the project"
}

variable "role_arn" {
  type        = string
  description = "ARN of the IAM role to assume when provisioning project resources"
}

variable "domain" {
  description = "Root domain name"
  type        = string
  default     = "seismicplanet.com"
}

variable "bucket_name" {
  description = "Main S3 bucket (site, data, parquet — separated by prefix)"
  type        = string
  default     = "seismicplanet"
}

variable "github_repo" {
  description = "GitHub repo in owner/name format — used to scope the deploy role"
  type        = string
  default     = "jasonkelly/seismicplanet"
}

variable "github_actions_refs" {
  description = "OIDC sub-claim ref patterns that can assume the GitHub Actions deploy role. Use 'ref:refs/heads/main' to restrict to the main branch, or 'environment:production' for environment gating."
  type        = list(string)
  default     = ["ref:refs/heads/main"]
}

variable "ecr_image_retention" {
  description = "Number of images to retain in the ECR repository"
  type        = number
  default     = 10
}

# ── CloudFront ───────────────────────────────────────────────────

variable "cloudfront_price_class" {
  description = "CloudFront price class (PriceClass_100 = US/EU only, PriceClass_200 adds Asia, PriceClass_All = global)"
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.cloudfront_price_class)
    error_message = "cloudfront_price_class must be one of: PriceClass_100, PriceClass_200, PriceClass_All."
  }
}

variable "cloudfront_asset_ttl" {
  description = "Default TTL (seconds) for content-hashed static assets"
  type        = number
  default     = 86400 # 1 day
}

variable "cloudfront_asset_ttl_max" {
  description = "Max TTL (seconds) for content-hashed static assets"
  type        = number
  default     = 31536000 # 1 year
}

variable "cloudfront_html_ttl" {
  description = "Default TTL (seconds) for index.html — short so deploys propagate quickly"
  type        = number
  default     = 60 # 1 minute
}

variable "cloudfront_html_ttl_max" {
  description = "Max TTL (seconds) for index.html"
  type        = number
  default     = 300 # 5 minutes
}

variable "cloudfront_data_ttl" {
  description = "Default TTL (seconds) for data files refreshed daily by the pipeline"
  type        = number
  default     = 3600 # 1 hour
}

variable "cloudfront_data_ttl_max" {
  description = "Max TTL (seconds) for data files"
  type        = number
  default     = 7200 # 2 hours
}
