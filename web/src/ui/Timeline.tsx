import { useCallback } from 'react'
import { useStore, DATA_START, DATA_END, YEAR_MS } from '../store'

const TOTAL_MS = DATA_END - DATA_START

const WINDOW_OPTIONS = [
  { label: '1 month',  value: YEAR_MS / 12 },
  { label: '3 months', value: YEAR_MS / 4  },
  { label: '6 months', value: YEAR_MS / 2  },
  { label: '1 year',   value: YEAR_MS      },
  { label: '5 years',  value: YEAR_MS * 5  },
  { label: '10 years', value: YEAR_MS * 10 },
]

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function Timeline() {
  const windowStart    = useStore(s => s.windowStart)
  const windowDuration = useStore(s => s.windowDuration)
  const isPlaying      = useStore(s => s.isPlaying)

  const setWindowStart    = useStore(s => s.setWindowStart)
  const setWindowDuration = useStore(s => s.setWindowDuration)
  const setIsPlaying      = useStore(s => s.setIsPlaying)

  const progress = Math.max(0, Math.min(1, (windowStart - DATA_START) / TOTAL_MS))

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const t = DATA_START + (Number(e.target.value) / 10_000) * TOTAL_MS
      setWindowStart(Math.min(t, DATA_END - windowDuration))
    },
    [windowDuration, setWindowStart],
  )

  return (
    <div style={containerStyle}>

      {/* Top row: date range | window selector */}
      <div style={headerRowStyle}>
        <span style={dateRangeStyle}>
          {fmtDate(windowStart)}&nbsp;–&nbsp;{fmtDate(windowStart + windowDuration)}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={monoLabelStyle}>WINDOW</span>
          <select
            value={windowDuration}
            onChange={e => setWindowDuration(Number(e.target.value))}
            style={selectStyle}
          >
            {WINDOW_OPTIONS.map(o => (
              <option key={o.label} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Play button + scrubber bar on same row */}
      <div style={scrubRowStyle}>

        <button
          className={`btn${isPlaying ? ' active' : ''}`}
          style={playBtnStyle}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? '⏸' : '⏵'}
        </button>

        {/* Scrubber bar */}
        <div style={barWrapStyle}>
          <div style={{ ...barFillStyle, width: `${progress * 100}%` }} />
          <input
            type="range"
            min={0}
            max={10_000}
            step={1}
            value={Math.round(progress * 10_000)}
            onChange={handleScrub}
            style={scrubberStyle}
          />
        </div>

      </div>

      {/* Year markers — offset by play button width */}
      <div style={markersWrapStyle}>
        <div style={{ width: 36, flexShrink: 0 }} />
        <div style={{ position: 'relative', flex: 1 }}>
          {[1900, 1920, 1940, 1960, 1980, 2000, 2010, 2020].map(yr => {
            const pct = (new Date(`${yr}-01-01T00:00:00Z`).getTime() - DATA_START) / TOTAL_MS * 100
            if (pct < 0 || pct > 100) return null
            return (
              <span key={yr} style={{ ...markerStyle, left: `${pct}%` }}>{yr}</span>
            )
          })}
        </div>
      </div>

    </div>
  )
}

const containerStyle: React.CSSProperties = {
  height:        '100%',
  padding:       '10px 24px 6px',
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

const monoLabelStyle: React.CSSProperties = {
  fontFamily:    'var(--font-mono)',
  fontSize:      9,
  letterSpacing: 3,
  color:         'var(--muted)',
  textTransform: 'uppercase' as const,
  flexShrink:    0,
}

const dateRangeStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize:   13,
  color:      'var(--accent)',
}

const selectStyle: React.CSSProperties = {
  width:        'auto',
  fontSize:     10,
  padding:      '3px 8px',
  background:   'rgba(255,255,255,0.03)',
  border:       '1px solid var(--border)',
  borderRadius: 3,
  color:        'var(--text)',
  fontFamily:   'var(--font-mono)',
  cursor:       'pointer',
}

const scrubRowStyle: React.CSSProperties = {
  display:    'flex',
  alignItems: 'stretch',
  gap:        8,
}

const playBtnStyle: React.CSSProperties = {
  flex:       'none',
  width:      38,
  fontSize:   14,
  padding:    '0 4px',
}

const barWrapStyle: React.CSSProperties = {
  position:     'relative',
  flex:         1,
  height:       34,
  background:   'rgba(255,255,255,0.02)',
  border:       '1px solid var(--border)',
  borderRadius: 3,
}

const barFillStyle: React.CSSProperties = {
  position:      'absolute',
  top:           0,
  left:          0,
  bottom:        0,
  background:    'linear-gradient(90deg, rgba(0,245,212,0.06), rgba(0,245,212,0.18))',
  borderRight:   '2px solid var(--accent)',
  boxShadow:     '2px 0 10px var(--accent)',
  pointerEvents: 'none',
  transition:    'width 0.1s linear',
  borderRadius:  '3px 0 0 3px',
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

const markersWrapStyle: React.CSSProperties = {
  display:    'flex',
  gap:        8,
  height:     10,
}

const markerStyle: React.CSSProperties = {
  position:      'absolute',
  transform:     'translateX(-50%)',
  fontFamily:    'var(--font-mono)',
  fontSize:      8,
  color:         'var(--muted)',
  letterSpacing: 1,
  pointerEvents: 'none',
}
