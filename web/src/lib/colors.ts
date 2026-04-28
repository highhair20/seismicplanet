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
 * Magnitude color scale — stepped palette matching the style guide.
 *   M < 2   light blue  #4fc3f7
 *   M 2–4   green       #81c784
 *   M 4–5   yellow      #fff176
 *   M 5–6   orange      #ffb74d
 *   M 6–7   red-orange  #ff7043
 *   M 7+    red         #e53935
 */
export function magnitudeColor(mag: number): [number, number, number] {
  if (mag < 2) return [0.31, 0.76, 0.97]   // #4fc3f7
  if (mag < 4) return [0.51, 0.78, 0.52]   // #81c784
  if (mag < 5) return [1.00, 0.95, 0.46]   // #fff176
  if (mag < 6) return [1.00, 0.72, 0.30]   // #ffb74d
  if (mag < 7) return [1.00, 0.44, 0.26]   // #ff7043
  return             [0.90, 0.22, 0.21]    // #e53935
}

/** Point size in scene units, scaled by magnitude. Minimum ensures tiny quakes are visible. */
export function pointSize(magnitude: number): number {
  return Math.max(1.0, (magnitude - 2.0) * 1.2)
}
