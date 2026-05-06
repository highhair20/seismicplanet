# ── Cache policies ───────────────────────────────────────────────

# Content-hashed static assets — long TTL (Vite fingerprints filenames)
resource "aws_cloudfront_cache_policy" "assets" {
  name        = "${var.cluster_name}-assets"
  min_ttl     = 0
  default_ttl = var.cloudfront_asset_ttl
  max_ttl     = var.cloudfront_asset_ttl_max

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config { cookie_behavior = "none" }
    headers_config { header_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
  }
}

# index.html — short TTL so deploys propagate quickly
resource "aws_cloudfront_cache_policy" "html" {
  name        = "${var.cluster_name}-html"
  min_ttl     = 0
  default_ttl = var.cloudfront_html_ttl
  max_ttl     = var.cloudfront_html_ttl_max

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config { cookie_behavior = "none" }
    headers_config { header_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
  }
}

# Data files — medium TTL, refreshed daily by the pipeline
resource "aws_cloudfront_cache_policy" "data" {
  name        = "${var.cluster_name}-data"
  min_ttl     = 0
  default_ttl = var.cloudfront_data_ttl
  max_ttl     = var.cloudfront_data_ttl_max

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config { cookie_behavior = "none" }
    headers_config { header_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
  }
}

# ── Distribution ─────────────────────────────────────────────────

resource "aws_cloudfront_origin_access_control" "main" {
  name                              = var.cluster_name
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.domain, "www.${var.domain}"]
  price_class         = var.cloudfront_price_class

  origin {
    domain_name              = aws_s3_bucket.main.bucket_regional_domain_name
    origin_id                = "s3-${var.bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
  }

  # Default: static assets — long TTL (Vite outputs content-hashed filenames)
  default_cache_behavior {
    target_origin_id       = "s3-${var.bucket_name}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.assets.id
  }

  # index.html — short TTL so deploys propagate quickly
  ordered_cache_behavior {
    path_pattern           = "/index.html"
    target_origin_id       = "s3-${var.bucket_name}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.html.id
  }

  # Yearly JSON data files — refreshed daily by the pipeline
  ordered_cache_behavior {
    path_pattern           = "/data/*"
    target_origin_id       = "s3-${var.bucket_name}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.data.id
  }

  # SPA fallback — unknown paths return index.html so React routing works
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.main.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = local.common_tags
}
