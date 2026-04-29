import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore, DATA_START, DATA_END, YEAR_MS } from '../store'
import { EarthquakeEvent } from '../types'

const VIEW_1990 = new Date('1990-01-01T00:00:00Z').getTime()

const TICKS_ALL    = [1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020]
const TICKS_1990   = [1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025]

type ViewMode = 'all' | '1990' | 'recent'

interface Props {
  events: EarthquakeEvent[]
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function Timeline({ events }: Props) {
  const windowStart      = useStore(s => s.windowStart)
  const windowDuration   = useStore(s => s.windowDuration)
  const isPlaying        = useStore(s => s.isPlaying)
  const setWindowStart   = useStore(s => s.setWindowStart)
  const setIsPlaying     = useStore(s => s.setIsPlaying)
  const setPlaybackSpeed = useStore(s => s.setPlaybackSpeed)

  const [mode, setMode] = useState<ViewMode>('recent')

  // View range for the bar — recent spans the last year so there's room to play
  const recentStart = DATA_END - YEAR_MS
  const viewStart   = mode === 'all' ? DATA_START : mode === '1990' ? VIEW_1990 : recentStart
  const viewMs      = DATA_END - viewStart

  const progress = Math.max(0, Math.min(1, (windowStart - viewStart) / viewMs))

  const barRef     = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const seekToX = useCallback((clientX: number) => {
    if (!barRef.current) return
    const rect = barRef.current.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const t    = viewStart + pct * viewMs
    setWindowStart(Math.min(t, DATA_END - windowDuration))
  }, [viewStart, viewMs, windowDuration, setWindowStart])

  const handleBarMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    seekToX(e.clientX)
  }, [seekToX])

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (isDragging.current) seekToX(e.clientX) }
    const onUp   = () => { isDragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [seekToX])

  function switchMode(next: ViewMode) {
    setMode(next)
    if (next === 'all') {
      setWindowStart(DATA_START)
      setPlaybackSpeed(0.04)
      setIsPlaying(true)
    } else if (next === '1990') {
      setWindowStart(VIEW_1990)
      setPlaybackSpeed(0.024)
      setIsPlaying(true)
    } else {
      setWindowStart(DATA_END - YEAR_MS)
      setPlaybackSpeed(0.008)
      setIsPlaying(true)
    }
  }

  const ticks = mode === 'all' ? TICKS_ALL : mode === '1990' ? TICKS_1990 : []

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
          title="Reset to start"
          onClick={() => { setIsPlaying(false); setWindowStart(viewStart) }}
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

        <div ref={barRef} style={barWrapStyle} onMouseDown={handleBarMouseDown}>
          <div style={{ ...barFillStyle, width: `${progress * 100}%` }} />
        </div>

      </div>

      {/* Year markers + range selector */}
      <div style={markersRowStyle}>
        <div style={{ width: 84, flexShrink: 0 }} />
        <div style={{ position: 'relative', flex: 1 }}>
          {ticks.map(yr => {
            const pct = (new Date(`${yr}-01-01T00:00:00Z`).getTime() - viewStart) / viewMs * 100
            if (pct < 0 || pct > 100) return null
            return (
              <span key={yr} style={{ ...markerStyle, left: `${pct}%` }}>{yr}</span>
            )
          })}
        </div>
        <div style={segmentedStyle}>
          {(['all', '1990', 'recent'] as ViewMode[]).map(m => (
            <button
              key={m}
              style={{ ...segmentBtnStyle, ...(mode === m ? segmentActivStyle : {}) }}
              onClick={() => switchMode(m)}
            >
              {m === 'all' ? 'ALL TIME' : m === '1990' ? '1990–NOW' : 'RECENT'}
            </button>
          ))}
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

const markersRowStyle: React.CSSProperties = {
  display:    'flex',
  alignItems: 'center',
  gap:        8,
  flexShrink: 0,
}

const markerStyle: React.CSSProperties = {
  position:      'absolute',
  transform:     'translateX(-50%)',
  fontFamily:    'var(--font-mono)',
  fontSize:      8,
  color:         'var(--muted)',
  letterSpacing: 1,
  pointerEvents: 'none',
  whiteSpace:    'nowrap',
}

const segmentedStyle: React.CSSProperties = {
  display:      'flex',
  flexShrink:   0,
  border:       '1px solid var(--border)',
  borderRadius: 3,
  overflow:     'hidden',
}

const segmentBtnStyle: React.CSSProperties = {
  fontFamily:    'var(--font-mono)',
  fontSize:      8,
  letterSpacing: 1,
  color:         'var(--muted)',
  background:    'transparent',
  border:        'none',
  borderLeft:    '1px solid var(--border)',
  padding:       '2px 7px',
  cursor:        'pointer',
  textTransform: 'uppercase' as const,
  whiteSpace:    'nowrap',
}

const segmentActivStyle: React.CSSProperties = {
  color:      'var(--accent)',
  background: 'rgba(0,245,212,0.08)',
}
