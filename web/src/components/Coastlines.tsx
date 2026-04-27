import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { toCartesian } from '../lib/coordinates'

type LineCoords  = number[][]
type MultiCoords = number[][][]

const vertexShader = /* glsl */`
  varying float vSideFade;

  void main() {
    vec3  worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3  toCamera = normalize(cameraPosition - worldPos);
    float side     = dot(normalize(worldPos), toCamera);

    vSideFade  = clamp(side * 2.0 + 0.12, 0.0, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */`
  varying float vSideFade;

  void main() {
    if (vSideFade < 0.01) discard;
    gl_FragColor = vec4(0.29, 0.54, 0.77, 0.5 * vSideFade);
  }
`

/**
 * Renders Natural Earth 110m coastlines as 3D line geometry on the globe surface.
 * Far-side lines fade to invisible so they don't bleed through the transparent globe.
 */
export function Coastlines() {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite:  false,
      }),
    [],
  )

  useEffect(() => {
    fetch('/data/coastlines.json')
      .then(r => r.json())
      .then(geojson => {
        const positions: number[] = []

        for (const feature of geojson.features) {
          const { type, coordinates } = feature.geometry

          const lines: LineCoords[] =
            type === 'LineString' ? [coordinates as LineCoords]
                                  : (coordinates as MultiCoords)

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
        setGeometry(geo)
      })
  }, [])

  if (!geometry) return null

  return (
    <lineSegments geometry={geometry} material={material} renderOrder={5} />
  )
}
