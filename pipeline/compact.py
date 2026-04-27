from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import click
import polars as pl

from .storage import daily_files_for_year, read_year, write_year


@click.command()
@click.option("--year", default=None, type=int,
              help="Year to compact (default: current year).")
@click.option("--data-dir", default="data", show_default=True, type=click.Path(),
              help="Root directory for Parquet files.")
@click.option("--delete-daily", is_flag=True, default=False,
              help="Remove daily files after merging into the yearly archive.")
def main(year: int | None, data_dir: str, delete_daily: bool) -> None:
    """Merge daily Parquet files into the yearly archive.

    Deduplicates by event ID, keeping the most recently seen version of each
    event (USGS occasionally updates magnitude or location after initial ingestion).
    """
    data_path = Path(data_dir)
    target_year = year if year is not None else datetime.now(tz=timezone.utc).year

    daily_files = daily_files_for_year(target_year, data_path)
    if not daily_files:
        click.echo(f"No daily files found for {target_year}.")
        return

    click.echo(
        f"Merging {len(daily_files)} daily file(s) into {target_year}.parquet..."
    )

    existing  = read_year(target_year, data_path)
    new_frames = [pl.read_parquet(f) for f in daily_files]
    merged = (
        pl.concat([existing, *new_frames])
        .unique(subset=["id"], keep="last")
        .sort("time")
    )

    out = write_year(merged, target_year, data_path)
    size_kb = out.stat().st_size // 1024
    click.echo(f"{len(merged):,} events  →  {out}  ({size_kb:,} KB)")

    if delete_daily:
        for f in daily_files:
            f.unlink()
        click.echo(f"Deleted {len(daily_files)} daily file(s).")
