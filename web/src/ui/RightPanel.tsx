import { useCallback } from 'react'
import { useStore, DATA_START, YEAR_MS } from '../store'
import { EarthquakeEvent } from '../types'
import { magnitudeColor } from '../lib/colors'
import { toCartesian } from '../lib/coordinates'
import * as THREE from 'three'

interface Props {
  events: EarthquakeEvent[]
}

// Discrete speed steps — slider index maps to these values
const SPEED_STEPS = [0.008, 0.016, 0.024, 0.032, 0.04]

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
  const showPoints        = useStore(s => s.showPoints)
  const showDepthLines    = useStore(s => s.showDepthLines)
  const showHazard        = useStore(s => s.showHazard)
  const hazardMagnitude   = useStore(s => s.hazardMagnitude)
  const hazardYears       = useStore(s => s.hazardYears)
  const isPlaying         = useStore(s => s.isPlaying)
  const setIsPlaying      = useStore(s => s.setIsPlaying)
  const setPlaybackSpeed  = useStore(s => s.setPlaybackSpeed)
  const setWindowDuration = useStore(s => s.setWindowDuration)
  const setMinMagnitude   = useStore(s => s.setMinMagnitude)
  const setMaxDepth       = useStore(s => s.setMaxDepth)
  const setShowPoints      = useStore(s => s.setShowPoints)
  const setShowDepthLines  = useStore(s => s.setShowDepthLines)
  const setShowHazard      = useStore(s => s.setShowHazard)
  const setHazardMagnitude = useStore(s => s.setHazardMagnitude)
  const setHazardYears     = useStore(s => s.setHazardYears)
  const setWindowStart     = useStore(s => s.setWindowStart)
  const cameraPos          = useStore(s => s.cameraPos)
  const cameraMatrix       = useStore(s => s.cameraMatrix)

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

  // Build a frustum from the stored projection×view matrix.
  // Falls back to hemisphere check if the matrix hasn't been populated yet.
  const frustum = new THREE.Frustum()
  const hasFrustum = cameraMatrix.some(v => v !== 0)
  if (hasFrustum) {
    frustum.setFromProjectionMatrix(new THREE.Matrix4().fromArray(cameraMatrix))
  }

  // Hemisphere fallback: camera-direction dot product
  const [cx, cy, cz] = cameraPos
  const camLen = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1
  const camNorm: [number, number, number] = [cx / camLen, cy / camLen, cz / camLen]

  const recent = events
    .filter(e => {
      const pos = toCartesian(e.lat, e.lon, 0)
      // Hemisphere check — excludes events behind the globe regardless of zoom
      const onNearSide = pos.x * camNorm[0] + pos.y * camNorm[1] + pos.z * camNorm[2] > 0
      if (!onNearSide) return false
      // Frustum check — excludes events outside the camera's field of view
      if (hasFrustum) return frustum.containsPoint(pos)
      return true
    })
    .sort((a, b) => b.time - a.time)
    .slice(0, 100)

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
        <span>Slow</span>
        <span className="mid">{(speedIdx + 1) * 20}%</span>
        <span>Fast</span>
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
          <span>Magnitude markers</span>
          <div
            className={`toggle${showPoints ? ' on' : ''}`}
            onClick={() => setShowPoints(!showPoints)}
          />
        </div>

        <div className="toggle-row">
          <span>Depth markers</span>
          <div
            className={`toggle${showDepthLines ? ' on' : ''}`}
            onClick={() => setShowDepthLines(!showDepthLines)}
          />
        </div>

      </div>

      {/* Hazard layer */}
      <div className="section-label">Seismic Hazard</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>

        <div className="toggle-row">
          <span>Probability overlay</span>
          <div
            className={`toggle${showHazard ? ' on' : ''}`}
            onClick={() => setShowHazard(!showHazard)}
          />
        </div>

        {showHazard && (
          <>
            <div>
              <label className="ctrl-label">MAGNITUDE THRESHOLD</label>
              <input
                type="range"
                min={5.0} max={8.0} step={0.5}
                value={hazardMagnitude}
                onChange={e => setHazardMagnitude(Number(e.target.value))}
              />
              <div className="slider-labels">
                <span>M 5.0</span>
                <span className="mid">M {hazardMagnitude.toFixed(1)}+</span>
                <span>M 8.0</span>
              </div>
            </div>

            <div>
              <label className="ctrl-label">FORECAST HORIZON</label>
              <input
                type="range"
                min={10} max={100} step={10}
                value={hazardYears}
                onChange={e => setHazardYears(Number(e.target.value))}
              />
              <div className="slider-labels">
                <span>10 YR</span>
                <span className="mid">{hazardYears} YR</span>
                <span>100 YR</span>
              </div>
            </div>

            <div style={hazardLegendStyle}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
                <div style={legendBarStyle} />
              </div>
              <div style={legendLabelsStyle}>
                <span>LOW</span>
                <span>P(≥M{hazardMagnitude.toFixed(1)} in {hazardYears}yr)</span>
                <span>HIGH</span>
              </div>
            </div>
          </>
        )}

      </div>

      {/* Visible events — scrolls independently within this section */}
      <div style={eventsContainerStyle}>
        <div className="section-label" style={{ flexShrink: 0 }}>Visible Events</div>
        <div style={eventsListStyle}>
          {recent.length === 0 ? (
            <div style={emptyStyle}>No events in window</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {recent.map((e, i) => {
                const col = toCSS(magnitudeColor(e.magnitude))
                const date = new Date(e.time).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })
                return (
                  <div key={i} className="recent-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 52 }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: col, boxShadow: `0 0 5px ${col}` }} />
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: col }}>
                        M{e.magnitude.toFixed(1)}
                      </div>
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
      </div>

    </div>
  )
}

const panelStyle: React.CSSProperties = {
  height:        '100%',
  overflowY:     'hidden',
  overflowX:     'hidden',
  padding:       16,
  display:       'flex',
  flexDirection: 'column',
}

const eventsContainerStyle: React.CSSProperties = {
  display:       'flex',
  flexDirection: 'column',
  flex:          1,
  minHeight:     0,
}

const eventsListStyle: React.CSSProperties = {
  flex:      1,
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
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

const hazardLegendStyle: React.CSSProperties = {
  marginTop: 4,
}

const legendBarStyle: React.CSSProperties = {
  flex:         1,
  height:       8,
  borderRadius: 4,
  background:   'linear-gradient(90deg, #1a33cc, #1abfcc, #f2e61a, #f28014, #e61a0d)',
}

const legendLabelsStyle: React.CSSProperties = {
  display:        'flex',
  justifyContent: 'space-between',
  fontFamily:     'var(--font-mono)',
  fontSize:       9,
  color:          'var(--muted)',
  marginTop:      3,
}
