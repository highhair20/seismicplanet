# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SeismicPlanet** is an interactive 3D time-series map visualizing all earthquakes on record world wide. The site streams or replays historical seismic data over a 3D globe/map, allowing users to explore earthquake history over time. The West Coast of the US is the default view.

Domain: `seismicplanet.com`

## Data Sources

The primary public data source for historical earthquake records is the [USGS Earthquake Hazards Program](https://earthquake.usgs.gov/fdsnws/event/1/). Key API details:

- FDSN Event Web Service: `https://earthquake.usgs.gov/fdsnws/event/1/`
- Supports filtering by region (bounding box or circle), magnitude, depth, and time range
- Returns GeoJSON, QuakeML, CSV formats
- Rate limits apply — batch large historical queries
- For global queries, omit bounding box parameters; use `limit` and `offset` for pagination

For West Coast default view, bounding box: `minlatitude=32&maxlatitude=49&minlongitude=-125&maxlongitude=-114`

## Tech Stack (TBD)

Stack not yet chosen. When making stack decisions, consider:

- **3D globe rendering**: CesiumJS, deck.gl + MapboxGL, or Three.js with custom globe
- **Time-series playback**: needs a timeline scrubber and animation loop
- **Data pipeline**: USGS data may need preprocessing/caching (large historical datasets)
- **Frontend framework**: React or SvelteKit are reasonable defaults for this type of app
- **Hosting**: Static site + serverless functions or edge functions for data proxying

## Architecture Considerations

- Historical USGS datasets can be very large — plan for chunked/paginated data loading or a pre-processed static dataset baked at build time
- Time-series animation requires efficient data structures (events indexed by time bucket)
- 3D rendering is GPU-intensive; consider LOD (level of detail) and clustering for dense periods
- If streaming live data alongside historical, use WebSockets or SSE for real-time events

## Data Pipeline

The pipeline lives in `pipeline/` and is installed as CLI tools via `pyproject.toml`.

### Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e .
```

### Commands

| Command | Purpose |
|---|---|
| `sp-download` | Bulk download historical events into `data/YYYY.parquet` |
| `sp-append` | Fetch yesterday's events into `data/daily/YYYY-MM-DD.parquet` |
| `sp-compact` | Merge daily files into the yearly archive; deduplicates by event ID |
| `sp-today` | Live fetch from midnight UTC → now; outputs GeoJSON for the web layer |
| `sp-sync` | **Recommended**: full incremental sync — historical + backfill + compact + export |
| `sp-query "<SQL>"` | Ad-hoc DuckDB query across all Parquet files |

### Typical usage

```bash
# Recommended: one command does everything, safe to re-run
sp-sync

# Daily cron (01:00 UTC) — same command
0 1 * * *  cd /path/to/seismicplanet && .venv/bin/sp-sync

# Ad-hoc queries
sp-query "SELECT COUNT(*) FROM events"
sp-query "SELECT year(epoch_ms(time)) yr, COUNT(*) n FROM events GROUP BY yr ORDER BY yr"
sp-query "SELECT * FROM events WHERE magnitude >= 8.0 ORDER BY magnitude DESC LIMIT 20"
```

`sp-sync` behaviour per run:
- **Historical years** — skipped if the year Parquet already exists
- **Current year, first run** — bulk-fetches Jan 1 → yesterday in one pass
- **Current year, subsequent runs** — fetches only days missing from `data/daily/`
- **Always** — compacts daily files into yearly archive, then exports web JSON

### Data layout

```
data/
├── 1900.parquet        # yearly archive files
├── 1901.parquet
├── ...
├── 2025.parquet
└── daily/
    ├── 2026-04-24.parquet   # uncompacted daily files
    └── 2026-04-25.parquet
```

### Hybrid live layer

The pipeline uses a two-layer hybrid:
- **Parquet archive** (`data/*.parquet`) — everything up to and including yesterday
- **`sp-today` live query** — midnight UTC to now, fetched at serve/render time

This ensures no gap in coverage for the current day without requiring the archive to be updated continuously.

### Schema

All Parquet files share the same schema:

| Column | Type | Notes |
|---|---|---|
| `id` | Utf8 | USGS event ID |
| `time` | Int64 | Unix timestamp, milliseconds UTC |
| `lat` | Float32 | |
| `lon` | Float32 | |
| `depth_km` | Float32 | |
| `magnitude` | Float32 | |
| `mag_type` | Utf8 | ml, mw, mb, etc. |
| `place` | Utf8 | Human-readable description |

## Frontend

React + TypeScript + Vite + Three.js / React Three Fiber. Lives in `web/`.

### Setup

```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm run build
```

### Full pipeline → browser workflow

```bash
# 1. Download historical data (one time)
sp-download --start-year 1900 --min-magnitude 2.5

# 2. Export to web-ready JSON chunks
sp-export --min-magnitude 4.0   # writes web/public/data/YYYY.json

# 3. Start dev server
cd web && npm run dev
```

### Globe texture (optional but recommended)

Download a 4096×2048 equirectangular Earth texture (NASA Blue Marble or similar)
and place it at `web/public/textures/earth.jpg`. The `Globe.tsx` component is
wired to load it — without it the globe renders as a faint blue tint.

### Key source files

| File | Purpose |
|---|---|
| `src/components/Globe.tsx` | Transparent sphere shell (two-layer front/back face rendering) |
| `src/components/EarthquakePoints.tsx` | Custom GLSL shader point cloud; variable size by magnitude, color by depth |
| `src/components/Atmosphere.tsx` | Edge-glow fresnel shader |
| `src/components/Scene.tsx` | R3F scene root; playback animation loop via `useFrame` |
| `src/hooks/useEarthquakeData.ts` | Year-by-year JSON loading with in-memory cache; filters by time window + settings |
| `src/store.ts` | Zustand store — time window, playback, all filter state |
| `src/lib/coordinates.ts` | `toCartesian(lat, lon, depthKm)` — positions events inside the sphere at true depth |
| `src/lib/colors.ts` | Depth color scale (red→orange→green→blue) and magnitude scale |
| `src/ui/Timeline.tsx` | Bottom scrubber bar with play/pause, speed, window size |
| `src/ui/SettingsPanel.tsx` | Top-right panel: magnitude/depth filters, color mode, globe opacity |
