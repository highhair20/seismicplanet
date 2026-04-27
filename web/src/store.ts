import { create } from 'zustand'
import { ColorMode } from './types'

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
  colorMode:    ColorMode

  // Display
  globeOpacity: number

  // Actions
  setWindowStart:    (t: number) => void
  setWindowDuration: (ms: number) => void
  setIsPlaying:      (b: boolean) => void
  setPlaybackSpeed:  (s: number) => void
  setMinMagnitude:   (m: number) => void
  setMaxDepth:       (d: number) => void
  setColorMode:      (m: ColorMode) => void
  setGlobeOpacity:   (o: number) => void
}

export const DATA_START = DATA_START_MS
export const DATA_END   = Date.now()
export { YEAR_MS }

export const useStore = create<State>((set) => ({
  windowStart:    Date.now() - THREE_MONTHS_MS,
  windowDuration: THREE_MONTHS_MS,
  isPlaying:      false,
  playbackSpeed:  1,

  minMagnitude: 4.0,
  maxDepth:     700,
  colorMode:    'depth',
  globeOpacity: 0.12,

  setWindowStart:    (t)  => set({ windowStart: t }),
  setWindowDuration: (ms) => set({ windowDuration: ms }),
  setIsPlaying:      (b)  => set({ isPlaying: b }),
  setPlaybackSpeed:  (s)  => set({ playbackSpeed: s }),
  setMinMagnitude:   (m)  => set({ minMagnitude: m }),
  setMaxDepth:       (d)  => set({ maxDepth: d }),
  setColorMode:      (m)  => set({ colorMode: m }),
  setGlobeOpacity:   (o)  => set({ globeOpacity: o }),
}))
