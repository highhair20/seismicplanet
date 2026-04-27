import * as THREE from 'three'
import { useStore } from '../store'

/**
 * Transparent globe shell.
 *
 * Two layers:
 *  1. Back faces (inner surface) — visible when looking through the globe
 *  2. Front faces (outer surface) — the shell you see from outside
 *
 * Rendered with DoubleSide + low opacity so earthquake hypocenters inside
 * the sphere are clearly visible at their correct depth.
 *
 * Texture: place a 4096×2048 equirectangular Earth texture at
 * web/public/textures/earth.jpg (NASA Blue Marble works well).
 * Without the texture the globe renders as a faint blue tint.
 */
export function Globe() {
  const opacity = useStore(s => s.globeOpacity)

  return (
    <group>
      {/* Outer shell — transparent, faint blue */}
      <mesh renderOrder={2}>
        <sphereGeometry args={[1, 72, 72]} />
        <meshPhongMaterial
          color="#2060a0"
          transparent
          opacity={opacity}
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>

      {/* Inner shell (back faces) — slightly warmer tint */}
      <mesh renderOrder={1}>
        <sphereGeometry args={[1, 72, 72]} />
        <meshPhongMaterial
          color="#102040"
          transparent
          opacity={opacity * 0.5}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Lat/lon grid — very faint reference lines */}
      <mesh renderOrder={0}>
        <sphereGeometry args={[1.001, 36, 18]} />
        <meshBasicMaterial
          color="#1a4080"
          transparent
          opacity={0.06}
          wireframe
        />
      </mesh>
    </group>
  )
}
