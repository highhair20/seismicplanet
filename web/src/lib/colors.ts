import { EarthquakeEvent } from '../types'

/**
 * Depth color scale — seismological convention:
 *   0–70 km   shallow (crustal):    red → orange
 *   70–300 km intermediate:         orange → yellow-green
 *   300–700 km deep (subducting):   green → blue → violet
 *
 * Returns [r, g, b] in 0–1 range.
 */
export function depthColor(depthKm: number): [number, number, number] {
  const d = Math.max(0, Math.min(700, depthKm ?? 0))

  if (d < 70) {
    const t = d / 70
    return [1.0, 0.25 + t * 0.35, 0.05]
  }
  if (d < 300) {
    const t = (d - 70) / 230
    return [1.0 - t * 0.65, 0.60 - t * 0.15, 0.05 + t * 0.30]
  }
  const t = (d - 300) / 400
  return [0.35 - t * 0.25, 0.45 - t * 0.15, 0.35 + t * 0.65]
}

/**
 * Magnitude color scale — blue (small) → white → red (large).
 * Centered around M5, saturated toward M7+.
 */
export function magnitudeColor(mag: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, (mag - 2.5) / 6.5))
  if (t < 0.5) {
    const s = t * 2
    return [s, s, 1.0]
  }
  const s = (t - 0.5) * 2
  return [1.0, 1.0 - s * 0.8, 1.0 - s]
}

export function eventColor(event: EarthquakeEvent, mode: 'depth' | 'magnitude'): [number, number, number] {
  return mode === 'depth'
    ? depthColor(event.depth_km)
    : magnitudeColor(event.magnitude)
}

/** Point size in scene units, scaled by magnitude. Minimum ensures tiny quakes are visible. */
export function pointSize(magnitude: number): number {
  return Math.max(1.0, (magnitude - 2.0) * 1.2)
}
