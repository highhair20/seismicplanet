import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { EarthquakeEvent } from '../types'
import { toCartesian } from '../lib/coordinates'
import { magnitudeColor, pointSize } from '../lib/colors'

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
 *
 * Buffer management: geometry is created once per mount; attributes are
 * updated in-place via useEffect with needsUpdate = true so the GPU
 * re-uploads on every frame where events change (e.g., during playback).
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

    // Fade to zero before the limb; fully hidden on the far side.
    // smoothstep(-0.05, 0.25, side): hidden below -0.05, full above 0.25.
    vSideFade = smoothstep(-0.05, 0.25, side);

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

    // Solid fill fading out over the outer third of the radius.
    float alpha = (1.0 - smoothstep(0.30, 0.50, dist)) * 0.88 * vSideFade;

    gl_FragColor = vec4(vColor, alpha);
  }
`

interface Props {
  events: EarthquakeEvent[]
}

export function EarthquakePoints({ events }: Props) {
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

      const [r, g, b]  = magnitudeColor(e.magnitude)
      colors[i * 3]     = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b

      sizes[i] = pointSize(e.magnitude)
    }

    return { positions, colors, sizes }
  }, [events])

  // Single BufferGeometry instance, lives for the duration of this mount cycle
  const geometry = useMemo(() => new THREE.BufferGeometry(), [])

  // Update GPU buffers whenever the computed arrays change.
  // useEffect runs after render (synchronous with React commit phase) — a
  // single-frame lag is imperceptible at 60 fps.
  useEffect(() => {
    const n       = events.length
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute | undefined

    if (!posAttr || posAttr.count !== n) {
      // First time, or count changed: replace attributes entirely.
      // Three.js treats new BufferAttribute objects as new GPU resources and
      // uploads them automatically on the next draw call.
      geometry.setAttribute('position',   new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('pointColor', new THREE.BufferAttribute(colors,    3))
      geometry.setAttribute('pointSize',  new THREE.BufferAttribute(sizes,     1))
    } else {
      // Same count: update array data in-place and flag for GPU re-upload.
      posAttr.set(positions)
      posAttr.needsUpdate = true

      const colAttr  = geometry.getAttribute('pointColor') as THREE.BufferAttribute
      colAttr.set(colors)
      colAttr.needsUpdate = true

      const sizeAttr = geometry.getAttribute('pointSize') as THREE.BufferAttribute
      sizeAttr.set(sizes)
      sizeAttr.needsUpdate = true
    }

    geometry.setDrawRange(0, n)
  }, [geometry, positions, colors, sizes, events.length])

  // Free the GPU buffer when this component unmounts
  useEffect(() => () => { geometry.dispose() }, [geometry])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite:  false,
        blending:    THREE.NormalBlending,
      }),
    [],
  )

  if (events.length === 0) return null

  return (
    <points geometry={geometry} material={material} renderOrder={4} />
  )
}
