import { create } from 'zustand'

const DATA_START_MS   = new Date('1900-01-01T00:00:00Z').getTime()
const YEAR_MS         = 365.25 * 24 * 3600 * 1000
const THREE_MONTHS_MS = YEAR_MS / 4

interface State {
  // Time window
  windowStart:    number   // unix ms
  windowDuration: number   // ms — how much history is visible at once
  isPlaying:      boolean
  playbackSpeed:  number   // years of data per real second

  // Filters
  minMagnitude: number
  maxDepth:     number

  // Display
  globeOpacity:   number
  showPoints:     boolean
  showDepthLines: boolean

  // Hazard layer
  showHazard:       boolean
  hazardMagnitude:  number   // minimum magnitude threshold for probability
  hazardYears:      number   // forecast horizon in years

  // Camera — updated from Scene useFrame for visibility filtering
  cameraPos:    [number, number, number]
  cameraMatrix: number[]   // flat 16-element projection×view matrix

  // Actions
  setWindowStart:    (t: number) => void
  setWindowDuration: (ms: number) => void
  setIsPlaying:      (b: boolean) => void
  setPlaybackSpeed:  (s: number) => void
  setMinMagnitude:   (m: number) => void
  setMaxDepth:       (d: number) => void
  setGlobeOpacity:   (o: number) => void
  setShowPoints:     (b: boolean) => void
  setShowDepthLines: (b: boolean) => void
  setShowHazard:      (b: boolean) => void
  setHazardMagnitude: (m: number) => void
  setHazardYears:     (y: number) => void
  setCameraPos:       (p: [number, number, number]) => void
  setCameraMatrix:    (m: number[]) => void
}

export const DATA_START = DATA_START_MS
export const DATA_END   = Date.now()
export { YEAR_MS }

export const useStore = create<State>((set) => ({
  windowStart:    new Date('1990-01-01T00:00:00Z').getTime(),
  windowDuration: THREE_MONTHS_MS,
  isPlaying:      true,
  playbackSpeed:  0.008,

  minMagnitude: 3.0,
  maxDepth:     700,
  globeOpacity:   0.5,
  showPoints:     true,
  showDepthLines: true,

  showHazard:      false,
  hazardMagnitude: 6.5,
  hazardYears:     30,

  cameraPos:    [-0.61, 1.46, 1.78],
  cameraMatrix: new Array(16).fill(0),

  setWindowStart:    (t)  => set({ windowStart: t }),
  setWindowDuration: (ms) => set({ windowDuration: ms }),
  setIsPlaying:      (b)  => set({ isPlaying: b }),
  setPlaybackSpeed:  (s)  => set({ playbackSpeed: s }),
  setMinMagnitude:   (m)  => set({ minMagnitude: m }),
  setMaxDepth:       (d)  => set({ maxDepth: d }),
  setGlobeOpacity:   (o)  => set({ globeOpacity: o }),
  setShowPoints:     (b)  => set({ showPoints: b }),
  setShowDepthLines: (b)  => set({ showDepthLines: b }),
  setShowHazard:      (b)  => set({ showHazard: b }),
  setHazardMagnitude: (m)  => set({ hazardMagnitude: m }),
  setHazardYears:     (y)  => set({ hazardYears: y }),
  setCameraPos:       (p)  => set({ cameraPos: p }),
  setCameraMatrix:    (m)  => set({ cameraMatrix: m }),
}))
