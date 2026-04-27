import { useCallback } from 'react'
import { useStore, DATA_START, YEAR_MS } from '../store'
import { EarthquakeEvent } from '../types'
import { depthColor, magnitudeColor } from '../lib/colors'

interface Props {
  events: EarthquakeEvent[]
}

// Discrete speed steps — slider index maps to these values
const SPEED_STEPS = [0.25, 0.5, 1, 2, 5, 10, 50]

const WINDOW_STEPS = [
  { label: '1 MO',   value: YEAR_MS / 12 },
  { label: '3 MO',   value: YEAR_MS / 4  },
  { label: '6 MO',   value: YEAR_MS / 2  },
  { label: '1 YR',   value: YEAR_MS      },
  { label: '5 YR',   value: YEAR_MS * 5  },
  { label: '10 YR',  value: YEAR_MS * 10 },
]

function toCSS([r, g, b]: [number, number, number]): string {
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`
}

export function RightPanel({ events }: Props) {
  const playbackSpeed  = useStore(s => s.playbackSpeed)
  const windowDuration = useStore(s => s.windowDuration)
  const minMagnitude   = useStore(s => s.minMagnitude)
  const maxDepth       = useStore(s => s.maxDepth)
  const colorMode      = useStore(s => s.colorMode)
  const isPlaying         = useStore(s => s.isPlaying)
  const setIsPlaying      = useStore(s => s.setIsPlaying)
  const setPlaybackSpeed  = useStore(s => s.setPlaybackSpeed)
  const setWindowDuration = useStore(s => s.setWindowDuration)
  const setMinMagnitude   = useStore(s => s.setMinMagnitude)
  const setMaxDepth       = useStore(s => s.setMaxDepth)
  const setColorMode      = useStore(s => s.setColorMode)
  const setWindowStart    = useStore(s => s.setWindowStart)

  const handleReset = useCallback(() => {
    setWindowStart(DATA_START)
    setIsPlaying(true)
  }, [setWindowStart, setIsPlaying])

  // Map current windowDuration to the nearest slider index
  const windowIdx = WINDOW_STEPS.reduce(
    (best, s, i) => Math.abs(s.value - windowDuration) < Math.abs(WINDOW_STEPS[best].value - windowDuration) ? i : best,
    0,
  )

  // Map current playbackSpeed to the nearest slider index
  const speedIdx = SPEED_STEPS.reduce(
    (best, v, i) => Math.abs(v - playbackSpeed) < Math.abs(SPEED_STEPS[best] - playbackSpeed) ? i : best,
    0,
  )

  const recent = [...events]
    .filter(e => e.magnitude >= 5.0)
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, 12)

  return (
    <div style={panelStyle}>

      {/* Playback */}
      <div className="section-label">Playback</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button className="btn" style={{ flex: 1 }} onClick={handleReset}>⏮ RESET</button>
        <button
          className={`btn${isPlaying ? ' active' : ''}`}
          style={{ flex: 1 }}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? '⏸ PAUSE' : '⏵ PLAY'}
        </button>
      </div>

      <label className="ctrl-label">PLAYBACK SPEED</label>
      <input
        type="range"
        min={0}
        max={SPEED_STEPS.length - 1}
        step={1}
        value={speedIdx}
        onChange={e => setPlaybackSpeed(SPEED_STEPS[Number(e.target.value)])}
      />
      <div className="slider-labels">
        <span>SLOW</span>
        <span className="mid">{playbackSpeed}×</span>
        <span>FAST</span>
      </div>

      {/* Display */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16, marginTop: 16 }}>

        <div>
          <label className="ctrl-label">TIME WINDOW</label>
          <input
            type="range"
            min={0}
            max={WINDOW_STEPS.length - 1}
            step={1}
            value={windowIdx}
            onChange={e => setWindowDuration(WINDOW_STEPS[Number(e.target.value)].value)}
          />
          <div className="slider-labels">
            <span>1 MO</span>
            <span className="mid">{WINDOW_STEPS[windowIdx].label}</span>
            <span>10 YR</span>
          </div>
        </div>

        <div>
          <label className="ctrl-label">MIN MAGNITUDE FILTER</label>
          <input
            type="range"
            min={0} max={9} step={0.1}
            value={minMagnitude}
            onChange={e => setMinMagnitude(Number(e.target.value))}
          />
          <div className="slider-labels">
            <span>ALL</span>
            <span className="mid">M {minMagnitude.toFixed(1)}+</span>
            <span>M 9.0+</span>
          </div>
        </div>

        <div>
          <label className="ctrl-label">MAX DEPTH</label>
          <input
            type="range"
            min={0} max={700} step={10}
            value={maxDepth}
            onChange={e => setMaxDepth(Number(e.target.value))}
          />
          <div className="slider-labels">
            <span>0 KM</span>
            <span className="mid">{maxDepth} KM</span>
            <span>700 KM</span>
          </div>
        </div>

        <div className="toggle-row">
          <span>Magnitude color</span>
          <div
            className={`toggle${colorMode === 'magnitude' ? ' on' : ''}`}
            onClick={() => setColorMode(colorMode === 'depth' ? 'magnitude' : 'depth')}
          />
        </div>


      </div>

      {/* Recent significant */}
      <div className="section-label">Significant Events</div>
      {recent.length === 0 ? (
        <div style={emptyStyle}>No M5.0+ events in window</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {recent.map((e, i) => {
            const col = colorMode === 'depth'
              ? toCSS(depthColor(e.depth_km))
              : toCSS(magnitudeColor(e.magnitude))
            const date = new Date(e.time).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })
            return (
              <div key={i} className="recent-item">
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, minWidth: 36, color: col }}>
                  M{e.magnitude.toFixed(1)}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={recentDateStyle}>{date}</div>
                  <div style={recentCoordStyle}>{e.lat.toFixed(1)}°, {e.lon.toFixed(1)}° · {e.depth_km.toFixed(0)} km</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}

const panelStyle: React.CSSProperties = {
  height:    '100%',
  overflowY: 'auto',
  overflowX: 'hidden',
  padding:   16,
}

const emptyStyle: React.CSSProperties = {
  color:      'var(--muted)',
  fontSize:   10,
  fontFamily: 'var(--font-mono)',
}

const recentDateStyle: React.CSSProperties = {
  fontSize:     9,
  color:        'var(--text)',
  fontFamily:   'var(--font-mono)',
  whiteSpace:   'nowrap',
  overflow:     'hidden',
  textOverflow: 'ellipsis',
}

const recentCoordStyle: React.CSSProperties = {
  fontSize:   9,
  color:      'var(--muted)',
  fontFamily: 'var(--font-mono)',
}
