from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import click

from .client import fetch_range
from .storage import write_year, year_path


@click.command()
@click.option("--start-year", default=1900, show_default=True,
              help="First year to download.")
@click.option("--end-year", default=None, type=int,
              help="Last year to download (default: last full year).")
@click.option("--min-magnitude", default=2.5, show_default=True,
              help="Minimum magnitude filter.")
@click.option("--data-dir", default="data", show_default=True, type=click.Path(),
              help="Root directory for Parquet files.")
@click.option("--overwrite", is_flag=True, default=False,
              help="Re-download years that already exist on disk.")
def main(
    start_year: int,
    end_year: int | None,
    min_magnitude: float,
    data_dir: str,
    overwrite: bool,
) -> None:
    """Download historical earthquake data from USGS into yearly Parquet files.

    Automatically splits request windows when the 20k-event API limit is hit,
    so the full catalog is captured regardless of event density.
    """
    data_path = Path(data_dir)
    data_path.mkdir(parents=True, exist_ok=True)

    current_year = datetime.now(tz=timezone.utc).year
    final_year = end_year if end_year is not None else current_year - 1

    click.echo(
        f"Downloading {start_year}–{final_year}, M{min_magnitude}+  →  {data_path}/"
    )

    for year in range(start_year, final_year + 1):
        path = year_path(year, data_path)

        if path.exists() and not overwrite:
            size_kb = path.stat().st_size // 1024
            click.echo(f"  {year}  skip  ({size_kb:,} KB on disk)")
            continue

        click.echo(f"  {year}  fetching...", nl=False)

        start_dt = datetime(year, 1, 1, tzinfo=timezone.utc)
        end_dt   = datetime(year + 1, 1, 1, tzinfo=timezone.utc)

        df = fetch_range(start_dt, end_dt, min_magnitude)

        if df.is_empty():
            click.echo("  0 events")
            continue

        out = write_year(df, year, data_path)
        size_kb = out.stat().st_size // 1024
        click.echo(f"  {len(df):,} events  ({size_kb:,} KB)")

    click.echo("Done.")
