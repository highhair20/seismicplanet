#!/bin/bash
set -euo pipefail

BUCKET="${S3_BUCKET:-seismicplanet}"
DATA_DIR="/data"
OUT_DIR="/tmp/web-data"

mkdir -p "$DATA_DIR" "$OUT_DIR"

echo "==> Syncing parquet archive from s3://${BUCKET}/parquet/"
aws s3 sync "s3://${BUCKET}/parquet/" "$DATA_DIR/"

echo "==> Running sp-sync"
sp-sync --data-dir "$DATA_DIR" --out-dir "$OUT_DIR"

echo "==> Pushing parquet archive to s3://${BUCKET}/parquet/"
aws s3 sync "$DATA_DIR/" "s3://${BUCKET}/parquet/"

echo "==> Pushing web data to s3://${BUCKET}/data/"
aws s3 sync "$OUT_DIR/" "s3://${BUCKET}/data/"

echo "==> Done"
