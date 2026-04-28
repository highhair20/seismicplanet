/**
 * HazardLayer — seismic probability heatmap overlay on the globe.
 *
 * Renders a second sphere shell (radius 1.003) with a custom shader
 * that samples a 180×90 DataTexture.  Each texel is one 2°×2° grid cell;
 * its value is the Poisson exceedance probability P(M≥threshold, T years)
 * recomputed whenever the user adjusts the magnitude or time horizon sliders.
 *
 * Color ramp (low → high probability):
 *   transparent → blue → cyan → yellow → orange → red
 */

import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useStore } from '../store'
import { useHazardData, exceedanceProbability } from '../hooks/useHazardData'

const TEX_W = 180  // one column per 2° of longitude
const TEX_H = 90   // one row per 2° of latitude

const vertexShader = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Smooth heatmap ramp: blue → cyan → yellow → orange → red
// Input t in [0, 1].
const fragmentShader = /* glsl */`
  uniform sampler2D uProbTex;
  uniform float     uMinProb;   // clamp: below this → transparent
  varying vec2      vUv;

  vec3 heatColor(float t) {
    // 5-stop ramp: blue, cyan, yellow, orange, red
    vec3 c0 = vec3(0.10, 0.20, 0.80);  // blue
    vec3 c1 = vec3(0.10, 0.75, 0.80);  // cyan
    vec3 c2 = vec3(0.95, 0.90, 0.10);  // yellow
    vec3 c3 = vec3(0.95, 0.50, 0.05);  // orange
    vec3 c4 = vec3(0.90, 0.10, 0.05);  // red

    if (t < 0.25) return mix(c0, c1, t / 0.25);
    if (t < 0.50) return mix(c1, c2, (t - 0.25) / 0.25);
    if (t < 0.75) return mix(c2, c3, (t - 0.50) / 0.25);
                  return mix(c3, c4, (t - 0.75) / 0.25);
  }

  void main() {
    float prob = texture2D(uProbTex, vUv).r;
    if (prob <= uMinProb) discard;

    // Normalise for color ramp: map uMinProb..1.0 → 0..1
    float t     = clamp((prob - uMinProb) / (1.0 - uMinProb), 0.0, 1.0);
    vec3  color = heatColor(t);

    // Alpha: low probability cells are more transparent
    float alpha = clamp(prob * 2.5, 0.0, 0.72);

    gl_FragColor = vec4(color, alpha);
  }
`

export function HazardLayer() {
  const showHazard      = useStore(s => s.showHazard)
  const hazardMagnitude = useStore(s => s.hazardMagnitude)
  const hazardYears     = useStore(s => s.hazardYears)
  const data            = useHazardData()
  const texRef          = useRef<THREE.DataTexture | null>(null)

  // Build/update the 180×90 probability texture whenever inputs change.
  const material = useMemo(() => {
    if (!data) return null

    const pixels = new Float32Array(TEX_W * TEX_H)

    for (const cell of data.cells) {
      const p = exceedanceProbability(
        cell,
        data.catalog_years,
        hazardMagnitude,
        hazardYears,
      )

      // Map lat/lon to texture coordinates.
      // lon ∈ [-180, 180) → column 0..179
      // lat ∈ [-90, 90)   → row    0..89
      // Three.js UV: u increases left→right (lon), v increases bottom→top (lat)
      const col = Math.floor((cell.lon + 180) / 2)
      const row = Math.floor((cell.lat + 90)  / 2)

      if (col < 0 || col >= TEX_W || row < 0 || row >= TEX_H) continue
      pixels[row * TEX_W + col] = p
    }

    if (texRef.current) texRef.current.dispose()

    const tex = new THREE.DataTexture(pixels, TEX_W, TEX_H, THREE.RedFormat, THREE.FloatType)
    tex.magFilter = THREE.LinearFilter
    tex.minFilter = THREE.LinearFilter
    tex.wrapS = THREE.RepeatWrapping
    tex.needsUpdate = true
    texRef.current = tex

    return new THREE.ShaderMaterial({
      uniforms: {
        uProbTex: { value: tex },
        uMinProb: { value: 0.01 },
      },
      vertexShader,
      fragmentShader,
      transparent:  true,
      depthWrite:   false,
      side:         THREE.FrontSide,
    })
  }, [data, hazardMagnitude, hazardYears])

  if (!showHazard || !material) return null

  return (
    <mesh renderOrder={2}>
      {/* Slightly larger than the globe (radius 1.0) to avoid z-fighting */}
      <sphereGeometry args={[1.003, 180, 90]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
