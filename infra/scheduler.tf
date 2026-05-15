resource "aws_scheduler_schedule" "pipeline_daily" {
  name       = "${var.project_name}-pipeline-daily"
  group_name = "default"

  flexible_time_window {
    mode = "OFF"
  }

  # 01:00 UTC daily
  schedule_expression          = "cron(0 1 * * ? *)"
  schedule_expression_timezone = "UTC"

  target {
    arn      = aws_lambda_function.pipeline.arn
    role_arn = aws_iam_role.scheduler.arn
  }
}

resource "aws_iam_role" "scheduler" {
  name = "${var.project_name}-scheduler"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "scheduler.amazonaws.com" }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "scheduler_invoke" {
  name = "invoke-pipeline-lambda"
  role = aws_iam_role.scheduler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "lambda:InvokeFunction"
      Resource = aws_lambda_function.pipeline.arn
    }]
  })
}
