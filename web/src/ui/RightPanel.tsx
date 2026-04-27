import { useCallback } from 'react'
import { useStore, DATA_START, YEAR_MS } from '../store'
import { EarthquakeEvent } from '../types'
import { depthColor, magnitudeColor } from '../lib/colors'

interface Props {
  events: EarthquakeEvent[]
}

const SPEED_OPTIONS = [
  { label: '0.25×', value: 0.25 },
  { label: '0.5×',  value: 0.5  },
  { label: '1×',    value: 1    },
  { label: '2×',    value: 2    },
  { label: '5×',    value: 5    },
  { label: '10×',   value: 10   },
  { label: '50×',   value: 50   },
]

const WINDOW_OPTIONS = [
  { label: '1 month',  value: YEAR_MS / 12 },
  { label: '3 months', value: YEAR_MS / 4  },
  { label: '6 months', value: YEAR_MS / 2  },
  { label: '1 year',   value: YEAR_MS      },
  { label: '5 years',  value: YEAR_MS * 5  },
  { label: '10 years', value: YEAR_MS * 10 },
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
  const globeOpacity   = useStore(s => s.globeOpacity)

  const setIsPlaying      = useStore(s => s.setIsPlaying)   // used in handleReset
  const setPlaybackSpeed  = useStore(s => s.setPlaybackSpeed)
  const setWindowDuration = useStore(s => s.setWindowDuration)
  const setMinMagnitude   = useStore(s => s.setMinMagnitude)
  const setMaxDepth       = useStore(s => s.setMaxDepth)
  const setColorMode      = useStore(s => s.setColorMode)
  const setGlobeOpacity   = useStore(s => s.setGlobeOpacity)
  const setWindowStart    = useStore(s => s.setWindowStart)

  const handleReset = useCallback(() => {
    setWindowStart(DATA_START)
    setIsPlaying(true)
  }, [setWindowStart, setIsPlaying])

  // isPlaying used only for reset behaviour — play/pause lives in the timeline footer

  const recent = [...events]
    .filter(e => e.magnitude >= 5.0)
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, 12)

  return (
    <div style={panelStyle}>

      {/* Playback */}
      <div className="section-label">Playback</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button className="btn" style={{ flex: 'none', width: '100%' }} onClick={handleReset}>⏮ RESET TO 1900</button>
      </div>
      <label className="ctrl-label">Speed</label>
      <select value={playbackSpeed} onChange={e => setPlaybackSpeed(Number(e.target.value))} style={{ marginBottom: 16 }}>
        {SPEED_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {/* Display */}
      <div className="section-label">Display</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>

        <div>
          <label className="ctrl-label">Time Window</label>
          <select value={windowDuration} onChange={e => setWindowDuration(Number(e.target.value))}>
            {WINDOW_OPTIONS.map(o => <option key={o.label} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="ctrl-label">Min Magnitude · M {minMagnitude.toFixed(1)}+</label>
          <input type="range" min={0} max={9} step={0.1}
            value={minMagnitude}
            onChange={e => setMinMagnitude(Number(e.target.value))} />
        </div>

        <div>
          <label className="ctrl-label">Max Depth · {maxDepth} km</label>
          <input type="range" min={0} max={700} step={10}
            value={maxDepth}
            onChange={e => setMaxDepth(Number(e.target.value))} />
        </div>

        <div>
          <label className="ctrl-label">Color Mode</label>
          <select value={colorMode} onChange={e => setColorMode(e.target.value as 'depth' | 'magnitude')}>
            <option value="depth">Depth</option>
            <option value="magnitude">Magnitude</option>
          </select>
        </div>

        <div>
          <label className="ctrl-label">Globe Opacity · {Math.round(globeOpacity * 100)}%</label>
          <input type="range" min={0} max={0.5} step={0.01}
            value={globeOpacity}
            onChange={e => setGlobeOpacity(Number(e.target.value))} />
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
  fontSize:   9,
  color:      'var(--text)',
  fontFamily: 'var(--font-mono)',
  whiteSpace: 'nowrap',
  overflow:   'hidden',
  textOverflow: 'ellipsis',
}

const recentCoordStyle: React.CSSProperties = {
  fontSize:   9,
  color:      'var(--muted)',
  fontFamily: 'var(--font-mono)',
}
