import { useCallback, useEffect, useRef } from 'react'
import { useStore, DATA_START, DATA_END, YEAR_MS } from '../store'
import { depthColor, magnitudeColor } from '../lib/colors'
import { EarthquakeEvent } from '../types'
import { yearCache } from '../hooks/useEarthquakeData'

const TOTAL_MS = DATA_END - DATA_START

interface Props {
  events: EarthquakeEvent[]
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function Timeline({ events }: Props) {
  const windowStart    = useStore(s => s.windowStart)
  const windowDuration = useStore(s => s.windowDuration)
  const isPlaying      = useStore(s => s.isPlaying)
  const colorMode      = useStore(s => s.colorMode)

  const setWindowStart = useStore(s => s.setWindowStart)
  const setIsPlaying   = useStore(s => s.setIsPlaying)

  const progress  = Math.max(0, Math.min(1, (windowStart - DATA_START) / TOTAL_MS))
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Redraw ticks whenever cached data changes (events prop is the proxy signal)
  // or colorMode changes. Renders ALL loaded years from yearCache, not just the
  // current window, so ticks span the full timeline.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const dpr  = window.devicePixelRatio || 1
    canvas.width  = rect.width  * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const W = rect.width
    const H = rect.height
    ctx.clearRect(0, 0, W, H)

    for (const yearEvents of yearCache.values()) {
      for (const e of yearEvents) {
        const x = (e.time - DATA_START) / TOTAL_MS * W
        const h = Math.max(2, Math.min(H - 2, (e.magnitude - 3.5) * (H / 8)))
        const [r, g, b] = colorMode === 'depth'
          ? depthColor(e.depth_km)
          : magnitudeColor(e.magnitude)
        ctx.fillStyle = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},0.75)`
        ctx.fillRect(x - 1, H - h, 2, h)
      }
    }
  }, [events, colorMode])

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const t = DATA_START + (Number(e.target.value) / 10_000) * TOTAL_MS
      setWindowStart(Math.min(t, DATA_END - windowDuration))
    },
    [windowDuration, setWindowStart],
  )

  return (
    <div style={containerStyle}>

      {/* Header: label | date range | event count */}
      <div style={headerRowStyle}>
        <span style={monoMutedStyle}>TIME SERIES</span>
        <span style={dateRangeStyle}>{fmtDate(windowStart)}</span>
        <span style={monoMutedStyle}>{events.length.toLocaleString()}&nbsp;EVENTS</span>
      </div>

      {/* Controls + bar */}
      <div style={controlsRowStyle}>

        <button
          className="btn"
          style={ctrlBtnStyle}
          title="Reset to 1900"
          onClick={() => { setIsPlaying(false); setWindowStart(DATA_START) }}
        >
          ⏮
        </button>

        <button
          className={`btn${isPlaying ? ' active' : ''}`}
          style={ctrlBtnStyle}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? '⏸' : '⏵'}
        </button>

        <div style={barWrapStyle}>
          {/* Fill gradient */}
          <div style={{ ...barFillStyle, width: `${progress * 100}%` }} />

          {/* All-years event ticks */}
          <canvas ref={canvasRef} style={canvasStyle} />

          {/* Transparent scrubber overlay */}
          <input
            type="range"
            min={0} max={10_000} step={1}
            value={Math.round(progress * 10_000)}
            onChange={handleScrub}
            style={scrubberStyle}
          />
        </div>

      </div>

    </div>
  )
}

/* ── Styles ─────────────────────────────────────────────────────── */

const containerStyle: React.CSSProperties = {
  height:        '100%',
  padding:       '10px 20px',
  display:       'flex',
  flexDirection: 'column',
  gap:           6,
  background:    'var(--panel)',
}

const headerRowStyle: React.CSSProperties = {
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'space-between',
}

const monoMutedStyle: React.CSSProperties = {
  fontFamily:    'var(--font-mono)',
  fontSize:      9,
  letterSpacing: 3,
  color:         'var(--muted)',
  textTransform: 'uppercase' as const,
}

const dateRangeStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize:   13,
  color:      'var(--accent)',
}

const controlsRowStyle: React.CSSProperties = {
  display:    'flex',
  alignItems: 'stretch',
  gap:        8,
}

const ctrlBtnStyle: React.CSSProperties = {
  flex:     'none',
  width:    38,
  fontSize: 14,
  padding:  '0 4px',
}

const barWrapStyle: React.CSSProperties = {
  position:     'relative',
  flex:         1,
  height:       40,
  background:   'rgba(255,255,255,0.02)',
  border:       '1px solid var(--border)',
  borderRadius: 3,
  overflow:     'hidden',
  cursor:       'pointer',
}

const barFillStyle: React.CSSProperties = {
  position:      'absolute',
  top:           0,
  left:          0,
  bottom:        0,
  background:    'linear-gradient(90deg, rgba(0,245,212,0.08), rgba(0,245,212,0.2))',
  borderRight:   '2px solid var(--accent)',
  boxShadow:     '2px 0 12px var(--accent)',
  pointerEvents: 'none',
  transition:    'width 0.1s linear',
}

const canvasStyle: React.CSSProperties = {
  position:      'absolute',
  inset:         0,
  width:         '100%',
  height:        '100%',
  pointerEvents: 'none',
}

const scrubberStyle: React.CSSProperties = {
  position: 'absolute',
  inset:    0,
  width:    '100%',
  height:   '100%',
  opacity:  0,
  cursor:   'pointer',
  margin:   0,
  padding:  0,
  zIndex:   1,
}
