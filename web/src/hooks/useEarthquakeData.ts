import { useState, useEffect, useMemo } from 'react'
import { EarthquakeEvent } from '../types'
import { useStore } from '../store'

// In-memory cache so years aren't re-fetched as the time window moves.
// Exported so the timeline can render ticks for all loaded years, not just
// the current window.
export const yearCache = new Map<number, EarthquakeEvent[]>()

// Live events from /api/today, kept separate from yearCache so the current
// year's static JSON is never overwritten mid-session.
let todayEvents: EarthquakeEvent[] = []

function parseRows(rows: (number | string)[][]): EarthquakeEvent[] {
  return rows.map(([time, lat, lon, depth_km, magnitude, place]) => ({
    time:      time      as number,
    lat:       lat       as number,
    lon:       lon       as number,
    depth_km:  depth_km  as number,
    magnitude: magnitude as number,
    place:     (place as string) || undefined,
  }))
}

async function fetchTodayEvents(): Promise<void> {
  try {
    const r = await fetch('/api/today')
    if (!r.ok) return
    const rows: (number | string)[][] = await r.json()
    todayEvents = parseRows(rows)
  } catch {
    // keep existing todayEvents on failure
  }
}

function yearOf(ms: number): number {
  return new Date(ms).getUTCFullYear()
}

export function useEarthquakeData(): EarthquakeEvent[] {
  const { windowStart, windowDuration, minMagnitude, maxDepth } = useStore()
  const windowEnd = windowStart + windowDuration

  const startYear = yearOf(windowStart)
  const endYear   = yearOf(windowEnd)

  const [loadTick, setLoadTick] = useState(0)

  // Load static yearly JSON files as the time window moves
  useEffect(() => {
    const missing: number[] = []
    for (let y = startYear; y <= endYear; y++) {
      if (!yearCache.has(y)) missing.push(y)
    }
    if (missing.length === 0) return

    Promise.all(
      missing.map(y =>
        fetch(`/data/${y}.json`)
          .then(r => r.ok ? r.json() : [])
          .then((rows: (number | string)[][]) => yearCache.set(y, parseRows(rows)))
          .catch(() => yearCache.set(y, [])),
      ),
    ).then(() => setLoadTick(t => t + 1))
  }, [startYear, endYear])

  // Poll /api/today every 60 seconds for live events
  useEffect(() => {
    fetchTodayEvents().then(() => setLoadTick(t => t + 1))
    const id = setInterval(() => {
      fetchTodayEvents().then(() => setLoadTick(t => t + 1))
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  return useMemo(() => {
    const todayYear = yearOf(Date.now())
    const result: EarthquakeEvent[] = []

    for (let y = startYear; y <= endYear; y++) {
      const source = y === todayYear
        ? [...(yearCache.get(y) ?? []), ...todayEvents]
        : (yearCache.get(y) ?? [])

      for (const e of source) {
        if (
          e.time      >= windowStart &&
          e.time      <  windowEnd &&
          e.magnitude >= minMagnitude &&
          e.depth_km  <= maxDepth
        ) {
          result.push(e)
        }
      }
    }
    return result
  }, [loadTick, windowStart, windowEnd, minMagnitude, maxDepth, startYear, endYear])
}
