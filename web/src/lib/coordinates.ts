import * as THREE from 'three'

const EARTH_RADIUS_KM = 6371

/**
 * Convert geographic coordinates to a Three.js scene position.
 *
 * The globe sits at the origin with radius 1.0.
 * Depth moves the point toward the centre of the sphere, so deep events
 * appear inside the transparent shell — revealing subduction zones as
 * inclined planes of seismicity descending into the Earth.
 */
export function toCartesian(lat: number, lon: number, depthKm: number): THREE.Vector3 {
  const r     = (EARTH_RADIUS_KM - depthKm) / EARTH_RADIUS_KM
  const phi   = (90 - lat)  * (Math.PI / 180)   // polar angle from north pole
  const theta = (lon + 180) * (Math.PI / 180)   // azimuthal angle

  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  )
}
