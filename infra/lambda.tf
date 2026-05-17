# ── Sync Lambda (nightly sp-sync) ────────────────────────────────

resource "aws_cloudwatch_log_group" "pipeline" {
  name              = "/aws/lambda/${var.project_name}-pipeline"
  retention_in_days = 30
  tags              = local.common_tags
}

resource "aws_lambda_function" "pipeline" {
  function_name = "${var.project_name}-pipeline"
  role          = aws_iam_role.lambda_pipeline.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.pipeline.repository_url}:latest"
  timeout       = 900
  memory_size   = 512

  environment {
    variables = {
      S3_BUCKET = var.bucket_name
      DATA_DIR  = "/tmp/data"
    }
  }

  tags       = local.common_tags
  depends_on = [aws_cloudwatch_log_group.pipeline]
}

# ── Today API Lambda (GET /api/today) ────────────────────────────

resource "aws_cloudwatch_log_group" "today" {
  name              = "/aws/lambda/${var.project_name}-today"
  retention_in_days = 14
  tags              = local.common_tags
}

resource "aws_lambda_function" "today" {
  function_name = "${var.project_name}-today"
  role          = aws_iam_role.lambda_today.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.pipeline.repository_url}:latest"
  timeout       = 30
  memory_size   = 256

  image_config {
    command = ["pipeline.api_handler.handler"]
  }

  environment {
    variables = {
      MIN_MAGNITUDE = "2.5"
    }
  }

  tags       = local.common_tags
  depends_on = [aws_cloudwatch_log_group.today]
}

resource "aws_lambda_function_url" "today" {
  function_name      = aws_lambda_function.today.function_name
  authorization_type = "NONE"

  cors {
    allow_origins = ["*"]
    allow_methods = ["GET"]
    max_age       = 60
  }
}
