from __future__ import annotations

import json
from pathlib import Path

import click
import polars as pl


@click.command()
@click.option("--min-magnitude", default=4.0, show_default=True,
              help="Minimum magnitude. Keep ≥4.0 for manageable file sizes (~60KB/year).")
@click.option("--data-dir", default="data", show_default=True, type=click.Path(),
              help="Root directory containing yearly Parquet files.")
@click.option("--out-dir", default="web/public/data", show_default=True, type=click.Path(),
              help="Output directory for JSON chunks.")
def main(min_magnitude: float, data_dir: str, out_dir: str) -> None:
    """Export the Parquet archive to web-ready JSON chunks (one file per year).

    Each output file is a compact array of tuples:
        [[time_ms, lat, lon, depth_km, magnitude], ...]

    Sorted by time. Loaded on demand by the frontend as the time window moves.
    Default --min-magnitude 4.0 produces ~60-80KB per year (gzip: ~20KB).
    """
    data_path = Path(data_dir)
    out_path  = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    parquet_files = sorted(data_path.glob("*.parquet"))
    if not parquet_files:
        raise click.ClickException(f"No Parquet files found in {data_path}/")

    click.echo(f"Exporting M{min_magnitude}+  →  {out_path}/")

    for pf in parquet_files:
        year = pf.stem
        if not year.isdigit():
            continue

        df = (
            pl.read_parquet(pf)
            .filter(pl.col("magnitude") >= min_magnitude)
            .sort("time")
            .select(["time", "lat", "lon", "depth_km", "magnitude"])
        )

        # Compact tuple format — smaller than key-value objects
        rows = [
            [row["time"], round(row["lat"], 4), round(row["lon"], 4),
             round(row["depth_km"] or 0, 1), round(row["magnitude"], 1)]
            for row in df.iter_rows(named=True)
        ]

        out_file = out_path / f"{year}.json"
        out_file.write_text(json.dumps(rows, separators=(",", ":")))

        size_kb = out_file.stat().st_size // 1024
        click.echo(f"  {year}: {len(rows):,} events  ({size_kb} KB)")

    click.echo("Done.")
