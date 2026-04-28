import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { OrbitControls, Stars } from '@react-three/drei'
import { Globe } from './Globe'
import { Coastlines } from './Coastlines'
import { Borders } from './Borders'
import { EarthquakePoints } from './EarthquakePoints'
import { DepthLines } from './DepthLines'
import { HazardLayer } from './HazardLayer'
import { EarthquakeEvent } from '../types'
import { useStore, DATA_END, YEAR_MS } from '../store'

interface Props {
  events: EarthquakeEvent[]
}

/**
 * Root Three.js scene.
 *
 * Handles:
 * - Lighting (ambient + directional sun)
 * - Camera / OrbitControls (zoom, rotate, pan)
 * - Playback animation loop via useFrame
 * - Star field background
 */
export function Scene({ events }: Props) {

  const isPlaying      = useStore(s => s.isPlaying)
  const playbackSpeed  = useStore(s => s.playbackSpeed)
  const windowStart    = useStore(s => s.windowStart)
  const windowDuration = useStore(s => s.windowDuration)
  const showPoints     = useStore(s => s.showPoints)
  const showDepthLines = useStore(s => s.showDepthLines)
  const setWindowStart = useStore(s => s.setWindowStart)
  const setIsPlaying   = useStore(s => s.setIsPlaying)
  const setCameraPos    = useStore(s => s.setCameraPos)
  const setCameraMatrix = useStore(s => s.setCameraMatrix)

  // Throttle camera-position updates to ~5fps so the RightPanel visibility
  // filter stays in sync without triggering excessive React re-renders.
  const cameraSyncAccum = useRef(0)
  useFrame(({ camera }, delta) => {
    // Advance playback
    if (isPlaying) {
      const advance   = delta * playbackSpeed * YEAR_MS
      const nextStart = windowStart + advance
      const maxStart  = DATA_END - windowDuration

      if (nextStart >= maxStart) {
        setWindowStart(maxStart)
        setIsPlaying(false)
      } else {
        setWindowStart(nextStart)
      }
    }

    // Sync camera state at ~5fps for RightPanel visibility filtering
    cameraSyncAccum.current += delta
    if (cameraSyncAccum.current >= 0.2) {
      cameraSyncAccum.current = 0
      const p = camera.position
      setCameraPos([p.x, p.y, p.z])
      // Combined projection×view matrix — used to build a Frustum in RightPanel
      camera.updateMatrixWorld()
      const pv = camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse)
      setCameraMatrix(pv.elements.slice())
    }
  })

  return (
    <>
      {/* Camera controls — right-click drag to pan, scroll to zoom */}
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={1.05}
        maxDistance={8}
        rotateSpeed={0.5}
      />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />

      {/* Star field */}
      <Stars radius={100} depth={60} count={6000} factor={4} fade />

      {/* Globe layers */}
      <Globe />
      <Coastlines />
      <Borders />
      <HazardLayer />

      {/* Earthquake hypocenters */}
      {showPoints && <EarthquakePoints events={events} />}

      {/* Radial depth lines: surface → hypocenter */}
      {showDepthLines && <DepthLines events={events} />}
    </>
  )
}
