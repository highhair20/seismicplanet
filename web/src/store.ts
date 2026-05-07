import { create } from 'zustand'
import { EarthquakeEvent } from './types'

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

  // Selected event (detail window)
  selectedEvent:    EarthquakeEvent | null
  selectedEventPos: { x: number; y: number } | null

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
  setSelectedEvent:   (e: EarthquakeEvent | null, pos?: { x: number; y: number }) => void
  setCameraPos:       (p: [number, number, number]) => void
  setCameraMatrix:    (m: number[]) => void
}

export const DATA_START = DATA_START_MS
export const DATA_END   = Date.now()
export { YEAR_MS }

export const useStore = create<State>((set) => ({
  windowStart:    Date.now() - YEAR_MS,
  windowDuration: THREE_MONTHS_MS,
  isPlaying:      true,
  playbackSpeed:  0.008,

  minMagnitude: 2.5,
  maxDepth:     700,
  globeOpacity:   0.5,
  showPoints:     true,
  showDepthLines: true,

  showHazard:      false,
  hazardMagnitude: 6.5,
  hazardYears:     30,

  selectedEvent:    null,
  selectedEventPos: null,

  cameraPos:    [-0.197, 1.108, 1.405],
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
  setSelectedEvent:   (e, pos) => set({ selectedEvent: e, selectedEventPos: pos ?? null }),
  setCameraPos:       (p)  => set({ cameraPos: p }),
  setCameraMatrix:    (m)  => set({ cameraMatrix: m }),
}))
