import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useStore } from '../store'
import { toCartesian } from '../lib/coordinates'
import { depthColor } from '../lib/colors'
import { EarthquakeEvent } from '../types'

interface Props {
  events: EarthquakeEvent[]
}

/**
 * Renders a radial line from the surface down to each earthquake hypocenter.
 * Shallow events produce short spikes; deep subduction zone events produce
 * long lines plunging into the transparent globe.
 *
 * Uses LineSegments — one draw call regardless of event count.
 */
export function DepthLines({ events }: Props) {
  const showDepthLines = useStore(s => s.showDepthLines)

  const geometry = useMemo(() => new THREE.BufferGeometry(), [])

  useEffect(() => {
    if (!showDepthLines || events.length === 0) {
      geometry.setDrawRange(0, 0)
      return
    }

    const n         = events.length
    const positions = new Float32Array(n * 6) // 2 vertices × 3 coords
    const colors    = new Float32Array(n * 6) // 2 vertices × 3 rgb

    // Map actual depth to a visual depth so shallow events are still legible.
    // True scale makes West Coast events (< 25 km) sub-pixel; visual scale
    // maps 0–700 km → 0–0.15 globe radii so all depths are perceptible.
    const MAX_DEPTH_KM     = 700
    const MAX_VISUAL_DEPTH = 0.15  // in globe-radius units

    for (let i = 0; i < n; i++) {
      const e            = events[i]
      const visualDepthKm = (e.depth_km / MAX_DEPTH_KM) * MAX_VISUAL_DEPTH * 6371
      const surface = toCartesian(e.lat, e.lon, 0)
      const hypo    = toCartesian(e.lat, e.lon, visualDepthKm)
      const [r, g, b] = depthColor(e.depth_km)

      const base = i * 6
      positions[base]     = surface.x
      positions[base + 1] = surface.y
      positions[base + 2] = surface.z
      positions[base + 3] = hypo.x
      positions[base + 4] = hypo.y
      positions[base + 5] = hypo.z

      // Fade surface end to transparent by using a dimmer color there
      colors[base]     = r * 0.3
      colors[base + 1] = g * 0.3
      colors[base + 2] = b * 0.3
      colors[base + 3] = r
      colors[base + 4] = g
      colors[base + 5] = b
    }

    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute | undefined
    if (!posAttr || posAttr.count !== n * 2) {
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
    } else {
      posAttr.set(positions); posAttr.needsUpdate = true
      const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute
      colAttr.set(colors); colAttr.needsUpdate = true
    }

    geometry.setDrawRange(0, n * 2)
  }, [geometry, events, showDepthLines])

  useEffect(() => () => { geometry.dispose() }, [geometry])

  if (!showDepthLines) return null

  return (
    <lineSegments geometry={geometry} renderOrder={3}>
      <lineBasicMaterial vertexColors transparent opacity={0.5} depthWrite={false} />
    </lineSegments>
  )
}
