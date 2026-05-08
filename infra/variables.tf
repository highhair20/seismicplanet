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

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
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

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "seismicplanet"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.cluster_name))
    error_message = "cluster_name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "eks_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.30"

  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+$", var.eks_version))
    error_message = "eks_version must be in X.Y format (e.g. 1.30)."
  }
}

variable "eks_public_access_cidrs" {
  description = "CIDR blocks that can reach the EKS public API endpoint. Restrict to known IPs in production (e.g. [\"1.2.3.4/32\"]). Defaults to unrestricted."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "node_instance_type" {
  description = "EKS node instance type"
  type        = string
  default     = "t3.small"

  validation {
    condition     = can(regex("^[a-z][a-z0-9]+\\.[a-z0-9]+$", var.node_instance_type))
    error_message = "node_instance_type must be a valid EC2 instance type (e.g. t3.small, m5.large)."
  }
}

variable "node_desired_size" {
  description = "Desired number of EKS worker nodes"
  type        = number
  default     = 1
}

variable "node_min_size" {
  description = "Minimum number of EKS worker nodes"
  type        = number
  default     = 1
}

variable "node_max_size" {
  description = "Maximum number of EKS worker nodes"
  type        = number
  default     = 2
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

variable "k8s_namespace" {
  description = "Kubernetes namespace where the pipeline service account runs"
  type        = string
  default     = "seismicplanet"
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
