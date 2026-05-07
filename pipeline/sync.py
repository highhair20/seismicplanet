"""
sp-sync — Incremental full-planet earthquake data sync.

Safe to re-run at any time. Each invocation picks up where the last one left off:

  Historical years (start_year → last year)
    • Skips years that already have a Parquet file on disk.
    • Downloads missing years in full via recursive range splitting.

  Current year
    • First run: bulk-fetches Jan 1 → yesterday in one pass (faster than 365 requests).
    • Subsequent runs: fetches only days missing from data/daily/.

  Compact + export
    • Merges daily files into the current year's Parquet archive.
    • Exports web-ready JSON chunks (one per year) to web/public/data/.

Typical cron (daily at 01:00 UTC):
    0 1 * * *  cd /path/to/seismicplanet && .venv/bin/sp-sync
"""
from __future__ import annotations

import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import click
import polars as pl

from .client import fetch_range
from .schema import normalize
from .storage import (
    daily_files_for_year,
    daily_path,
    read_year,
    write_daily,
    write_year,
    year_path,
)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

@click.command()
@click.option("--start-year",       default=1900,  show_default=True,
              help="Earliest year to include in the archive.")
@click.option("--min-magnitude",    default=2.5,   show_default=True,
              help="Minimum magnitude for the Parquet archive.")
@click.option("--export-magnitude", default=2.5,   show_default=True,
              help="Minimum magnitude for web JSON export (smaller files).")
@click.option("--data-dir",         default="data",          show_default=True, type=click.Path())
@click.option("--out-dir",          default="web/public/data", show_default=True, type=click.Path())
@click.option("--skip-export",      is_flag=True,  default=False,
              help="Skip the web JSON export step.")
def main(
    start_year:       int,
    min_magnitude:    float,
    export_magnitude: float,
    data_dir:         str,
    out_dir:          str,
    skip_export:      bool,
) -> None:
    """Incrementally sync all earthquake data and export for the web."""
    data_path = Path(data_dir)
    data_path.mkdir(parents=True, exist_ok=True)

    today      = datetime.now(tz=timezone.utc).date()
    yesterday  = today - timedelta(days=1)
    this_year  = today.year

    _print_header(start_year, this_year, min_magnitude)

    # ------------------------------------------------------------------
    # 1. Historical years (start_year → last year)
    # ------------------------------------------------------------------
    click.echo("\n── Historical years ─────────────────────────────────────────")

    for year in range(start_year, this_year):
        path = year_path(year, data_path)
        if path.exists():
            size_kb = path.stat().st_size // 1024
            click.echo(f"  {year}  ✓  ({size_kb:,} KB)")
            continue

        click.echo(f"  {year}  downloading...", nl=False)
        df = _fetch_year(year, min_magnitude)

        if df.is_empty():
            click.echo("  0 events")
            continue

        out = write_year(df, year, data_path)
        click.echo(f"  {len(df):,} events  ({out.stat().st_size // 1024:,} KB)")

    # ------------------------------------------------------------------
    # 2. Current year
    # ------------------------------------------------------------------
    click.echo(f"\n── Current year ({this_year}) ──────────────────────────────────")

    existing_year_file  = year_path(this_year, data_path)
    existing_daily      = daily_files_for_year(this_year, data_path)
    missing_days        = _missing_days(this_year, yesterday, data_path)

    if not existing_year_file.exists() and not existing_daily:
        # First run for this year — bulk fetch Jan 1 → yesterday
        click.echo(f"  First run: bulk-fetching {this_year}-01-01 → {yesterday}...")
        start_dt = datetime(this_year, 1, 1, tzinfo=timezone.utc)
        end_dt   = datetime(yesterday.year, yesterday.month, yesterday.day,
                            23, 59, 59, tzinfo=timezone.utc)
        df = fetch_range(start_dt, end_dt, min_magnitude)
        if not df.is_empty():
            write_year(df, this_year, data_path)
            click.echo(f"  {len(df):,} events  →  {this_year}.parquet")
        else:
            click.echo("  0 events")
        missing_days = []   # bulk fetch covered everything

    elif missing_days:
        click.echo(f"  {len(missing_days)} day(s) missing — fetching...")
        for day in missing_days:
            path = daily_path(day, data_path)
            if path.exists():
                continue
            start_dt = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
            end_dt   = start_dt + timedelta(days=1)
            df = fetch_range(start_dt, end_dt, min_magnitude)
            if not df.is_empty():
                write_daily(df, day, data_path)
                click.echo(f"  {day}  {len(df):,} events")
            else:
                # Write an empty sentinel so this day is not re-fetched
                write_daily(pl.DataFrame(schema=df.schema if hasattr(df, 'schema') else {}), day, data_path)
                click.echo(f"  {day}  0 events")
    else:
        click.echo("  Up to date.")

    # ------------------------------------------------------------------
    # 3. Compact current year
    # ------------------------------------------------------------------
    daily_to_merge = daily_files_for_year(this_year, data_path)
    if daily_to_merge:
        click.echo(f"\n── Compact {this_year} ──────────────────────────────────────────")
        existing   = read_year(this_year, data_path)
        new_frames = [pl.read_parquet(f) for f in daily_to_merge if pl.read_parquet(f).height > 0]

        if new_frames:
            merged = (
                pl.concat([existing, *new_frames])
                .unique(subset=["id"], keep="last")
                .sort("time")
            )
        else:
            merged = existing

        out = write_year(merged, this_year, data_path)
        click.echo(f"  {len(merged):,} events  →  {out}  ({out.stat().st_size // 1024:,} KB)")

        for f in daily_to_merge:
            f.unlink()
        click.echo(f"  Removed {len(daily_to_merge)} daily file(s).")

    # ------------------------------------------------------------------
    # 4. Export for web
    # ------------------------------------------------------------------
    if not skip_export:
        _export(data_path, Path(out_dir), export_magnitude)

    click.echo("\n✓ Sync complete.")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fetch_year(year: int, min_magnitude: float) -> pl.DataFrame:
    start = datetime(year, 1, 1, tzinfo=timezone.utc)
    end   = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    return fetch_range(start, end, min_magnitude)


def _missing_days(year: int, through: date, data_dir: Path) -> list[date]:
    """Return days in [Jan 1, through] that have no daily Parquet file."""
    existing = {f.stem for f in daily_files_for_year(year, data_dir)}
    result   = []
    d = date(year, 1, 1)
    while d <= through:
        if d.isoformat() not in existing:
            result.append(d)
        d += timedelta(days=1)
    return result


def _export(data_path: Path, out_path: Path, min_magnitude: float) -> None:
    import json

    out_path.mkdir(parents=True, exist_ok=True)
    parquet_files = sorted(data_path.glob("*.parquet"))

    if not parquet_files:
        click.echo("\n── Export: no Parquet files found, skipping.")
        return

    click.echo(f"\n── Export  M{min_magnitude}+  →  {out_path}/")

    for pf in parquet_files:
        if not pf.stem.isdigit():
            continue

        df = (
            pl.read_parquet(pf)
            .filter(pl.col("magnitude") >= min_magnitude)
            .sort("time")
            .select(["time", "lat", "lon", "depth_km", "magnitude", "place"])
        )

        rows = [
            [r["time"], round(r["lat"], 4), round(r["lon"], 4),
             round(r["depth_km"] or 0, 1), round(r["magnitude"], 1),
             r["place"] or ""]
            for r in df.iter_rows(named=True)
        ]

        out_file = out_path / f"{pf.stem}.json"
        out_file.write_text(json.dumps(rows, separators=(",", ":")))
        click.echo(f"  {pf.stem}: {len(rows):,} events  ({out_file.stat().st_size // 1024} KB)")


def _print_header(start_year: int, this_year: int, min_magnitude: float) -> None:
    click.echo("=" * 60)
    click.echo("  SeismicPlanet — Incremental Data Sync")
    click.echo(f"  Range:         {start_year} → {this_year}")
    click.echo(f"  Min magnitude: M{min_magnitude}+")
    click.echo("=" * 60)
