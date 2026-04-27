from __future__ import annotations

from datetime import date
from pathlib import Path

import polars as pl

from .schema import SCHEMA

PARQUET_COMPRESSION = "zstd"


def year_path(year: int, data_dir: Path) -> Path:
    return data_dir / f"{year}.parquet"


def daily_path(day: date, data_dir: Path) -> Path:
    return data_dir / "daily" / f"{day.isoformat()}.parquet"


def read_year(year: int, data_dir: Path) -> pl.DataFrame:
    path = year_path(year, data_dir)
    if not path.exists():
        return pl.DataFrame(schema=SCHEMA)
    return pl.read_parquet(path)


def write_year(df: pl.DataFrame, year: int, data_dir: Path) -> Path:
    path = year_path(year, data_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.write_parquet(path, compression=PARQUET_COMPRESSION, statistics=True)
    return path


def write_daily(df: pl.DataFrame, day: date, data_dir: Path) -> Path:
    path = daily_path(day, data_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.write_parquet(path, compression=PARQUET_COMPRESSION, statistics=True)
    return path


def daily_files_for_year(year: int, data_dir: Path) -> list[Path]:
    daily_dir = data_dir / "daily"
    if not daily_dir.exists():
        return []
    return sorted(daily_dir.glob(f"{year}-*.parquet"))
