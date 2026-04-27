from __future__ import annotations

import io
import time
from datetime import datetime, timedelta, timezone

import httpx
import polars as pl

from .schema import normalize

USGS_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"
MAX_EVENTS = 20_000
REQUEST_DELAY = 0.3   # seconds between requests — respectful to USGS servers
RETRY_WAIT = 5        # base seconds for retry backoff


class _ExceedsLimitError(Exception):
    """USGS returned HTTP 400 because the result set exceeds 20,000 events.

    Raised internally so fetch_range can split and recurse rather than
    mistakenly treating the response as an empty result.
    """


def fetch_range(
    start: datetime,
    end: datetime,
    min_magnitude: float = 2.5,
    _depth: int = 0,
) -> pl.DataFrame:
    """Fetch and normalize all events in [start, end).

    Recursively halves the time range when the 20k-event USGS limit is hit.
    Returns an empty DataFrame (with SCHEMA columns) if no events exist.
    """
    if _depth > 14:
        raise RuntimeError(
            f"Recursion depth exceeded splitting range {start.isoformat()} – {end.isoformat()}. "
            "Event density may be unusually high."
        )

    try:
        raw = _fetch_csv(start, end, min_magnitude)
    except _ExceedsLimitError:
        # USGS rejected the query outright because it exceeds 20k events.
        # Split the window and recurse — same recovery path as the row-count case.
        mid = start + (end - start) / 2
        left  = fetch_range(start, mid, min_magnitude, _depth + 1)
        right = fetch_range(mid, end, min_magnitude, _depth + 1)
        return pl.concat([left, right])

    if len(raw) < MAX_EVENTS:
        return normalize(raw)

    # Exactly MAX_EVENTS rows — response is likely truncated; split and recurse.
    mid = start + (end - start) / 2
    left  = fetch_range(start, mid, min_magnitude, _depth + 1)
    right = fetch_range(mid, end, min_magnitude, _depth + 1)
    return pl.concat([left, right])


def fetch_today(min_magnitude: float = 2.5) -> pl.DataFrame:
    """Fetch events from midnight UTC today through now.

    Used by the hybrid live layer so the visualization is never missing
    the current day's events.
    """
    now = datetime.now(tz=timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return fetch_range(start_of_day, now, min_magnitude)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _fetch_csv(start: datetime, end: datetime, min_magnitude: float) -> pl.DataFrame:
    """Single HTTP request to USGS FDSN. Retries on transient errors."""
    params = {
        "format":       "csv",
        "starttime":    start.strftime("%Y-%m-%dT%H:%M:%S"),
        "endtime":      end.strftime("%Y-%m-%dT%H:%M:%S"),
        "minmagnitude": str(min_magnitude),
        "orderby":      "time-asc",
    }

    for attempt in range(3):
        try:
            time.sleep(REQUEST_DELAY)
            resp = httpx.get(USGS_URL, params=params, timeout=60)

            if resp.status_code == 204:
                return pl.DataFrame()

            resp.raise_for_status()

            text = resp.text.strip()
            if not text:
                return pl.DataFrame()

            df = pl.read_csv(
                io.StringIO(text),
                null_values=["", "null"],
                infer_schema_length=0,
                schema_overrides={
                    "latitude":  pl.Float64,
                    "longitude": pl.Float64,
                    "depth":     pl.Float64,
                    "mag":       pl.Float64,
                    "nst":       pl.Float64,
                    "gap":       pl.Float64,
                    "dmin":      pl.Float64,
                    "rms":       pl.Float64,
                    "horizontalError": pl.Float64,
                    "depthError":      pl.Float64,
                    "magError":        pl.Float64,
                    "magNst":          pl.Float64,
                },
            )
            return df if len(df) > 0 else pl.DataFrame()

        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 400:
                body = exc.response.text
                if "No data found" in body:
                    # Genuine empty result for this time window.
                    return pl.DataFrame()
                # "exceeds search limit of 20000" or other 400 — bubble up so
                # fetch_range can split the window and retry.
                raise _ExceedsLimitError(body) from exc
            if attempt < 2:
                time.sleep(RETRY_WAIT * (attempt + 1))
            else:
                raise

        except httpx.RequestError:
            if attempt < 2:
                time.sleep(RETRY_WAIT * (attempt + 1))
            else:
                raise

    return pl.DataFrame()
