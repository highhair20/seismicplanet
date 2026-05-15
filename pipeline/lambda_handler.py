import os
import subprocess


def handler(event, context):
    result = subprocess.run(
        ["/entrypoint.sh"],
        text=True,
        capture_output=True,
        env={**os.environ, "S3_BUCKET": os.environ.get("S3_BUCKET", "seismicplanet")},
    )
    print(result.stdout)
    if result.returncode != 0:
        print(result.stderr)
        raise RuntimeError(f"sync failed (exit {result.returncode})")
    return {"statusCode": 200}
