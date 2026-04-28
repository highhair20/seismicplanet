import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { EarthquakeEvent } from '../types'
import { toCartesian } from '../lib/coordinates'
import { magnitudeColor, pointSize } from '../lib/colors'
import { useStore } from '../store'

/**
 * Renders earthquake hypocenters as a WebGL point cloud inside the globe.
 *
 * Each point carries a per-vertex age (0 = oldest in window, 1 = newest)
 * which the fragment shader uses to fade out aging events smoothly.
 */

const vertexShader = /* glsl */`
  attribute float pointSize;
  attribute vec3  pointColor;
  attribute float pointAge;    // 0 = oldest in window, 1 = newest
  varying   vec3  vColor;
  varying   float vSideFade;
  varying   float vAge;

  void main() {
    vColor = pointColor;
    vAge   = pointAge;

    vec3  worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3  toCamera = normalize(cameraPosition - worldPos);
    float side     = dot(normalize(worldPos), toCamera);

    vSideFade = smoothstep(-0.05, 0.25, side);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize    = pointSize * (8.0 / -mvPosition.z);
    gl_Position     = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */`
  varying vec3  vColor;
  varying float vSideFade;
  varying float vAge;

  void main() {
    vec2  coords = gl_PointCoord - vec2(0.5);
    float dist   = length(coords);

    if (dist > 0.5) discard;

    // Hard disc with narrow antialiased edge.
    float disc = 1.0 - smoothstep(0.44, 0.50, dist);

    // Age fade: newest (age=1) fully opaque, oldest (age=0) nearly gone.
    // pow curve keeps mid-age events readable and makes the fade feel natural.
    float ageFade = pow(vAge, 1.5);

    float alpha = disc * ageFade * 0.90 * vSideFade;

    gl_FragColor = vec4(vColor, alpha);
  }
`

interface Props {
  events: EarthquakeEvent[]
}

export function EarthquakePoints({ events }: Props) {
  const windowStart    = useStore(s => s.windowStart)
  const windowDuration = useStore(s => s.windowDuration)

  const { positions, colors, sizes, ages } = useMemo(() => {
    const n         = events.length
    const positions = new Float32Array(n * 3)
    const colors    = new Float32Array(n * 3)
    const sizes     = new Float32Array(n)
    const ages      = new Float32Array(n)

    const windowEnd = windowStart + windowDuration

    for (let i = 0; i < n; i++) {
      const e   = events[i]
      const pos = toCartesian(e.lat, e.lon, e.depth_km)

      positions[i * 3]     = pos.x
      positions[i * 3 + 1] = pos.y
      positions[i * 3 + 2] = pos.z

      const [r, g, b]   = magnitudeColor(e.magnitude)
      colors[i * 3]     = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b

      sizes[i] = pointSize(e.magnitude)

      // Normalise event time within the window: 0 = just entered, 1 = at leading edge
      ages[i] = Math.max(0, Math.min(1, (e.time - windowStart) / (windowEnd - windowStart)))
    }

    return { positions, colors, sizes, ages }
  }, [events, windowStart, windowDuration])

  const geometry = useMemo(() => new THREE.BufferGeometry(), [])

  useEffect(() => {
    const n       = events.length
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute | undefined

    if (!posAttr || posAttr.count !== n) {
      geometry.setAttribute('position',   new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('pointColor', new THREE.BufferAttribute(colors,    3))
      geometry.setAttribute('pointSize',  new THREE.BufferAttribute(sizes,     1))
      geometry.setAttribute('pointAge',   new THREE.BufferAttribute(ages,      1))
    } else {
      posAttr.set(positions); posAttr.needsUpdate = true

      const colAttr  = geometry.getAttribute('pointColor') as THREE.BufferAttribute
      colAttr.set(colors); colAttr.needsUpdate = true

      const sizeAttr = geometry.getAttribute('pointSize') as THREE.BufferAttribute
      sizeAttr.set(sizes); sizeAttr.needsUpdate = true

      const ageAttr  = geometry.getAttribute('pointAge') as THREE.BufferAttribute
      ageAttr.set(ages); ageAttr.needsUpdate = true
    }

    geometry.setDrawRange(0, n)
  }, [geometry, positions, colors, sizes, ages, events.length])

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
