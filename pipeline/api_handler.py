import json
import os

from .client import fetch_today


def handler(event, context):
    min_magnitude = float(os.environ.get("MIN_MAGNITUDE", "2.5"))
    df = fetch_today(min_magnitude)

    rows = [
        [
            r["time"],
            round(r["lat"], 4),
            round(r["lon"], 4),
            round(r["depth_km"] or 0.0, 1),
            round(r["magnitude"], 1),
            r["place"] or "",
        ]
        for r in df.iter_rows(named=True)
    ]

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=60",
        },
        "body": json.dumps(rows, separators=(",", ":")),
    }
