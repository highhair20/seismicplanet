provider "aws" {
  region = var.aws_region

  assume_role {
    role_arn = var.role_arn
  }
}

# ACM certificates for CloudFront must always be in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  assume_role {
    role_arn = var.role_arn
  }
}
