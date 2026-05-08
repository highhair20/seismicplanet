# ACM certificates for CloudFront must be provisioned in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = var.aws_region

  assume_role {
    role_arn = var.role_arn
  }

}
