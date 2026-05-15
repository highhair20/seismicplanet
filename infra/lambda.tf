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
