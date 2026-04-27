from __future__ import annotations

import json
from pathlib import Path

import click

from .client import fetch_today


@click.command()
@click.option("--min-magnitude", default=2.5, show_default=True,
              help="Minimum magnitude filter.")
@click.option("--output", default=None, type=click.Path(),
              help="Write GeoJSON to this file instead of stdout.")
def main(min_magnitude: float, output: str | None) -> None:
    """Fetch today's events (midnight UTC → now) and emit GeoJSON.

    This is the live layer of the hybrid pipeline — call it from the web
    server or at build time to fill the gap between the last daily append
    and the current moment.

    Output is a GeoJSON FeatureCollection ready for deck.gl / CesiumJS.
    """
    df = fetch_today(min_magnitude)

    features = []
    for row in df.iter_rows(named=True):
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [row["lon"], row["lat"], -(row["depth_km"] or 0)],
            },
            "properties": {
                "id":        row["id"],
                "time":      row["time"],
                "magnitude": row["magnitude"],
                "mag_type":  row["mag_type"],
                "depth_km":  row["depth_km"],
                "place":     row["place"],
            },
        })

    geojson = {"type": "FeatureCollection", "features": features}
    text = json.dumps(geojson)

    if output:
        Path(output).write_text(text)
        click.echo(f"{len(features)} events  →  {output}")
    else:
        click.echo(text)
