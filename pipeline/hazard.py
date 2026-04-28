"""Compute spatial seismic hazard using Gutenberg-Richter statistics.

Method
------
1. Load events from CATALOG_START onwards at or above the magnitude of
   completeness (Mc).  The post-1990 global catalog is reliably complete
   down to ~Mc 4.5.

2. Bin events into a 2°×2° geographic grid.

3. For each cell with enough events, estimate the G-R b-value using the
   Aki (1965) maximum-likelihood formula:

       b = log10(e) / (mean_magnitude − Mc)

   Then derive the a-value from the cumulative count N (events ≥ Mc):

       a = log10(N) + b × Mc

   Together these characterise the rate of events above any threshold M:

       log10(N(≥M)) = a − b×M   (for the full catalog period)

4. Write a compact JSON file the frontend can fetch and interpret
   interactively — users slide the magnitude threshold and time horizon,
   and the browser recomputes P(≥M, T years) = 1 − exp(−λ×T) on the fly.

Output schema
-------------
{
  "mc":            4.5,
  "catalog_years": 36,
  "cells": [
    [lat_center, lon_center, a, b, n],  // n = events ≥ Mc in cell
    ...
  ]
}
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import click
import duckdb


MC: float = 4.5        # Magnitude of completeness
CATALOG_START: int = 1990
GRID_DEG: int = 2      # Cell size in degrees
MIN_EVENTS: int = 10   # Minimum events required to fit G-R in a cell


def _lat_bin(lat: float) -> int:
    return int(math.floor(lat / GRID_DEG))


def _lon_bin(lon: float) -> int:
    return int(math.floor(lon / GRID_DEG))


def _cell_center(bin_index: int) -> float:
    return bin_index * GRID_DEG + GRID_DEG / 2.0


def compute_cells(data_dir: Path) -> tuple[int, list[list]]:
    """Return (catalog_years, cells) from the Parquet archive."""
    con = duckdb.connect()

    # Convert CATALOG_START to a Unix ms timestamp.
    # 1990-01-01T00:00:00Z in ms
    start_ms = int(
        duckdb.execute(
            "SELECT epoch_ms(TIMESTAMPTZ '1990-01-01 00:00:00+00')"
        ).fetchone()[0]
    )

    rows = con.execute(
        f"""
        SELECT lat, lon, magnitude
        FROM read_parquet('{data_dir}/*.parquet')
        WHERE time >= {start_ms}
          AND magnitude >= {MC}
        """,
    ).fetchall()

    con.close()

    if not rows:
        return 0, []

    import datetime
    catalog_years = datetime.date.today().year - CATALOG_START

    # Accumulate magnitudes per cell
    cells: dict[tuple[int, int], list[float]] = {}
    for lat, lon, mag in rows:
        key = (_lat_bin(lat), _lon_bin(lon))
        if key not in cells:
            cells[key] = []
        cells[key].append(mag)

    output: list[list] = []
    for (lat_bin, lon_bin), magnitudes in cells.items():
        n = len(magnitudes)
        if n < MIN_EVENTS:
            continue

        mean_mag = sum(magnitudes) / n

        # Aki (1965) MLE b-value — stable and unbiased
        diff = mean_mag - MC
        if diff <= 0:
            continue  # degenerate cell, skip
        b = math.log10(math.e) / diff

        # a-value: cumulative count above Mc over the catalog period
        a = math.log10(n) + b * MC

        lat_c = round(_cell_center(lat_bin), 1)
        lon_c = round(_cell_center(lon_bin), 1)

        # Skip cells outside valid geographic range
        if lat_c < -90 or lat_c > 90:
            continue
        if lon_c < -180 or lon_c > 180:
            continue

        output.append([lat_c, lon_c, round(a, 4), round(b, 4), n])

    return catalog_years, output


@click.command()
@click.option("--data-dir", default="data", show_default=True, type=click.Path(),
              help="Root directory containing yearly Parquet files.")
@click.option("--out-dir", default="web/public/data", show_default=True, type=click.Path(),
              help="Output directory for hazard.json.")
def main(data_dir: str, out_dir: str) -> None:
    """Compute G-R seismic hazard grid and write web/public/data/hazard.json.

    Uses events M4.5+ from 1990 onwards (reliable global completeness era).
    Each 2°×2° cell with ≥10 events gets a G-R a- and b-value pair.

    The frontend computes probabilities interactively:
        rate/yr = 10^(a - b*M) / catalog_years
        P(≥M in T yrs) = 1 - exp(-rate * T)
    """
    data_path = Path(data_dir)
    out_path  = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    click.echo("Computing Gutenberg-Richter hazard grid...")
    click.echo(f"  Mc = {MC},  catalog start = {CATALOG_START},  cell = {GRID_DEG}°×{GRID_DEG}°")

    catalog_years, cells = compute_cells(data_path)

    payload = {
        "mc":            MC,
        "catalog_years": catalog_years,
        "cells":         cells,
    }

    out_file = out_path / "hazard.json"
    out_file.write_text(json.dumps(payload, separators=(",", ":")))

    size_kb = out_file.stat().st_size // 1024
    click.echo(f"  {len(cells):,} cells written  →  {out_file}  ({size_kb} KB)")
    click.echo("Done.")
