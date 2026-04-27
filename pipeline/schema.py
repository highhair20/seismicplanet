from __future__ import annotations

import polars as pl

# Ordered list of columns in every Parquet file.
COLUMNS: list[str] = ["id", "time", "lat", "lon", "depth_km", "magnitude", "mag_type", "place"]

SCHEMA = pl.Schema({
    "id":        pl.Utf8,
    "time":      pl.Int64,    # Unix timestamp, milliseconds UTC
    "lat":       pl.Float32,
    "lon":       pl.Float32,
    "depth_km":  pl.Float32,
    "magnitude": pl.Float32,
    "mag_type":  pl.Utf8,
    "place":     pl.Utf8,
})

_USGS_RENAME: dict[str, str] = {
    "latitude":  "lat",
    "longitude": "lon",
    "depth":     "depth_km",
    "mag":       "magnitude",
    "magType":   "mag_type",
}


def normalize(raw: pl.DataFrame) -> pl.DataFrame:
    """Normalize a raw USGS CSV DataFrame to the canonical schema.

    Returns an empty DataFrame with SCHEMA columns when raw has no rows.
    """
    if raw.is_empty():
        return pl.DataFrame(schema=SCHEMA)

    rename = {k: v for k, v in _USGS_RENAME.items() if k in raw.columns}

    return (
        raw
        .rename(rename)
        .with_columns(
            pl.col("time")
            .str.replace("Z", "", literal=True)   # strip UTC suffix before parsing
            .str.to_datetime(format="%Y-%m-%dT%H:%M:%S%.f", strict=False, time_unit="ms")
            .dt.timestamp("ms")
            .cast(pl.Int64)
            .alias("time")
        )
        .select(COLUMNS)
        .with_columns([
            pl.col("lat").cast(pl.Float32),
            pl.col("lon").cast(pl.Float32),
            pl.col("depth_km").cast(pl.Float32),
            pl.col("magnitude").cast(pl.Float32),
            pl.col("id").cast(pl.Utf8),
            pl.col("mag_type").cast(pl.Utf8),
            pl.col("place").cast(pl.Utf8),
        ])
    )
