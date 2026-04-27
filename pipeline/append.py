from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import click

from .client import fetch_range
from .storage import daily_path, write_daily


@click.command()
@click.option("--date", "target_date", default=None,
              help="Date to fetch as YYYY-MM-DD. Default: yesterday UTC.")
@click.option("--min-magnitude", default=2.5, show_default=True,
              help="Minimum magnitude filter.")
@click.option("--data-dir", default="data", show_default=True, type=click.Path(),
              help="Root directory for Parquet files.")
@click.option("--overwrite", is_flag=True, default=False,
              help="Re-fetch if the daily file already exists.")
def main(
    target_date: str | None,
    min_magnitude: float,
    data_dir: str,
    overwrite: bool,
) -> None:
    """Fetch one day of events and write to data/daily/YYYY-MM-DD.parquet.

    Run daily (e.g. via cron at 01:00 UTC) to keep the archive current.
    The live today endpoint handles the gap between the last append and now.
    """
    data_path = Path(data_dir)

    day: date = (
        date.fromisoformat(target_date)
        if target_date
        else (datetime.now(tz=timezone.utc) - timedelta(days=1)).date()
    )

    out_path = daily_path(day, data_path)
    if out_path.exists() and not overwrite:
        click.echo(f"{day}  skip  (already at {out_path})")
        return

    click.echo(f"Fetching {day}, M{min_magnitude}+...")

    start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
    end   = start + timedelta(days=1)

    df = fetch_range(start, end, min_magnitude)

    if df.is_empty():
        click.echo("No events.")
        return

    path = write_daily(df, day, data_path)
    click.echo(f"{len(df):,} events  →  {path}")
