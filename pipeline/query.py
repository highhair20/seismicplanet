from __future__ import annotations

from pathlib import Path

import click
import duckdb


@click.command()
@click.argument("sql")
@click.option("--data-dir", default="data", show_default=True, type=click.Path(),
              help="Root directory for Parquet files.")
def main(sql: str, data_dir: str) -> None:
    """Run a DuckDB SQL query across the full Parquet archive.

    \b
    The archive (yearly files + daily files) is available as the view 'events'.
    Timestamps are stored as Unix milliseconds in the 'time' column.

    \b
    Examples:
      sp-query "SELECT COUNT(*) FROM events"
      sp-query "SELECT * FROM events WHERE magnitude >= 8.0 ORDER BY magnitude DESC"
      sp-query "SELECT year(epoch_ms(time)) yr, COUNT(*) n FROM events GROUP BY yr ORDER BY yr"
      sp-query "SELECT * FROM events WHERE magnitude >= 5.0 AND lat BETWEEN 32 AND 49 AND lon BETWEEN -125 AND -114 LIMIT 20"
    """
    data_path = Path(data_dir)

    yearly_glob = str(data_path / "*.parquet")
    daily_glob  = str(data_path / "daily" / "*.parquet")

    con = duckdb.connect()

    # Build a unified view across yearly archive + any uncompacted daily files.
    con.execute(f"""
        CREATE VIEW events AS
        SELECT * FROM read_parquet(['{yearly_glob}', '{daily_glob}'],
                                   hive_partitioning=false,
                                   union_by_name=true)
    """)

    try:
        result = con.execute(sql).df()
        click.echo(result.to_string(index=False))
    except duckdb.Error as exc:
        raise click.ClickException(str(exc)) from exc
