import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { EarthquakeEvent } from '../types'
import { toCartesian } from '../lib/coordinates'
import { eventColor, pointSize } from '../lib/colors'
import { useStore } from '../store'

/**
 * Renders earthquake hypocenters as a WebGL point cloud inside the globe.
 *
 * Uses a custom ShaderMaterial for:
 *  - Per-point variable size (scaled by magnitude)
 *  - Circular, anti-aliased points (discard corners in fragment shader)
 *  - Additive blending so dense clusters bloom brighter
 *
 * Deep events appear inside the transparent sphere, revealing subduction
 * geometry that is invisible on any surface-only map.
 */

const vertexShader = /* glsl */`
  attribute float pointSize;
  attribute vec3  pointColor;
  varying   vec3  vColor;
  varying   float vSideFade;

  void main() {
    vColor = pointColor;

    // Dot product of the surface normal (direction from globe centre to point)
    // with the direction toward the camera. Positive = facing camera, negative = far side.
    vec3  worldPos   = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3  toCamera   = normalize(cameraPosition - worldPos);
    float side       = dot(normalize(worldPos), toCamera);

    // Linear fade: far-back = 5%, limb ≈ 12%, near side = 100%
    vSideFade = clamp(side * 2.0 + 0.12, 0.05, 1.0);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize    = pointSize * (8.0 / -mvPosition.z);
    gl_Position     = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */`
  varying vec3  vColor;
  varying float vSideFade;

  void main() {
    vec2  coords = gl_PointCoord - vec2(0.5);
    float dist   = length(coords);

    if (dist > 0.5) discard;

    float alpha  = 1.0 - smoothstep(0.25, 0.5, dist);
    gl_FragColor = vec4(vColor, alpha * 0.55 * vSideFade);
  }
`

interface Props {
  events: EarthquakeEvent[]
}

export function EarthquakePoints({ events }: Props) {
  const colorMode = useStore(s => s.colorMode)
  const prevRef   = useRef<THREE.Points>(null)

  const { positions, colors, sizes } = useMemo(() => {
    const n         = events.length
    const positions = new Float32Array(n * 3)
    const colors    = new Float32Array(n * 3)
    const sizes     = new Float32Array(n)

    for (let i = 0; i < n; i++) {
      const e   = events[i]
      const pos = toCartesian(e.lat, e.lon, e.depth_km)

      positions[i * 3]     = pos.x
      positions[i * 3 + 1] = pos.y
      positions[i * 3 + 2] = pos.z

      const [r, g, b]  = eventColor(e, colorMode)
      colors[i * 3]     = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b

      sizes[i] = pointSize(e.magnitude)
    }

    return { positions, colors, sizes }
  }, [events, colorMode])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent:  true,
        depthWrite:   false,
        blending:     THREE.AdditiveBlending,
      }),
    [],
  )

  if (events.length === 0) return null

  return (
    <points ref={prevRef} material={material} renderOrder={4}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position"   array={positions} count={events.length} itemSize={3} />
        <bufferAttribute attach="attributes-pointColor" array={colors}    count={events.length} itemSize={3} />
        <bufferAttribute attach="attributes-pointSize"  array={sizes}     count={events.length} itemSize={1} />
      </bufferGeometry>
    </points>
  )
}
