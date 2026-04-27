/**
 * Edge-glow atmosphere ring around the globe.
 * Uses a back-face sphere slightly larger than the globe with a
 * fresnel-style shader that intensifies toward the silhouette edge.
 */

const vertexShader = /* glsl */`
  varying vec3 vNormal;
  void main() {
    vNormal     = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */`
  varying vec3 vNormal;
  void main() {
    float rim       = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
    float intensity = pow(rim, 5.0) * 0.25;
    gl_FragColor    = vec4(0.25, 0.55, 1.0, intensity);
  }
`

import * as THREE from 'three'

export function Atmosphere() {
  return (
    <mesh renderOrder={3}>
      <sphereGeometry args={[1.06, 64, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}
