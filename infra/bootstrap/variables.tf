variable "aws_region" {
  type        = string
  description = "AWS region where bootstrap resources are deployed"
}

variable "role_arn" {
  type        = string
  description = "ARN of the IAM role to assume when provisioning bootstrap resources"
}

variable "project_name" {
  type        = string
  description = "Project identifier — used as prefix for the state bucket and locks table"
  default     = "seismicplanet"
}
