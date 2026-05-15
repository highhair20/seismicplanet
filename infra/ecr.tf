resource "aws_ecr_repository" "pipeline" {
  name                 = "${var.project_name}/pipeline"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.common_tags
}

resource "aws_ecr_lifecycle_policy" "pipeline" {
  repository = aws_ecr_repository.pipeline.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last ${var.ecr_image_retention} images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = var.ecr_image_retention
      }
      action = { type = "expire" }
    }]
  })
}
