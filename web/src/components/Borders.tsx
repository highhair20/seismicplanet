import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { toCartesian } from '../lib/coordinates'

type LineCoords  = number[][]
type MultiCoords = number[][][]

/**
 * Shared vertex shader — fades lines on the far side of the globe so they
 * don't bleed through the transparent shell (same approach as Coastlines).
 */
const vertexShader = /* glsl */`
  varying float vSideFade;

  void main() {
    vec3  worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3  toCamera = normalize(cameraPosition - worldPos);
    float side     = dot(normalize(worldPos), toCamera);

    vSideFade   = clamp(side * 2.0 + 0.12, 0.0, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

function makeFragmentShader(r: number, g: number, b: number, baseAlpha: number) {
  return /* glsl */`
    varying float vSideFade;
    void main() {
      if (vSideFade < 0.01) discard;
      gl_FragColor = vec4(${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)}, ${baseAlpha.toFixed(2)} * vSideFade);
    }
  `
}

function buildGeometry(geojson: { features: { geometry: { type: string; coordinates: unknown } }[] }): THREE.BufferGeometry {
  const positions: number[] = []

  for (const feature of geojson.features) {
    const { type, coordinates } = feature.geometry

    const lines: LineCoords[] =
      type === 'LineString'      ? [coordinates as LineCoords]
      : type === 'MultiLineString' ? (coordinates as MultiCoords)
      : []

    for (const line of lines) {
      for (let i = 0; i < line.length - 1; i++) {
        const [lon1, lat1] = line[i]
        const [lon2, lat2] = line[i + 1]

        const p1 = toCartesian(lat1, lon1, -2)
        const p2 = toCartesian(lat2, lon2, -2)

        positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z)
      }
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geo
}

interface LayerProps {
  url:       string
  r: number; g: number; b: number
  alpha:     number
  order:     number
}

function BorderLayer({ url, r, g, b, alpha, order }: LayerProps) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: makeFragmentShader(r, g, b, alpha),
        transparent:    true,
        depthWrite:     false,
      }),
    [r, g, b, alpha],
  )

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(geojson => setGeometry(buildGeometry(geojson)))
      .catch(err => console.error(`Failed to load ${url}`, err))
  }, [url])

  if (!geometry) return null
  return <lineSegments geometry={geometry} material={material} renderOrder={order} />
}

/**
 * Renders country borders and state/province lines on the globe surface.
 *
 * Country borders: slightly brighter white-grey
 * State/province:  dimmer, to sit visually below country borders
 *
 * Both layers use the same far-side fade as Coastlines so lines don't
 * bleed through the transparent globe shell.
 */
export function Borders() {
  return (
    <>
      {/* State / province lines — dimmer, rendered first */}
      <BorderLayer
        url="/data/states.json"
        r={0.55} g={0.55} b={0.60}
        alpha={0.35}
        order={6}
      />

      {/* Country borders — brighter, rendered on top */}
      <BorderLayer
        url="/data/countries.json"
        r={0.75} g={0.75} b={0.80}
        alpha={0.50}
        order={7}
      />
    </>
  )
}
