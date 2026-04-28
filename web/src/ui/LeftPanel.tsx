import { EarthquakeEvent } from '../types'
import { depthColor, magnitudeColor } from '../lib/colors'

interface Props {
  events: EarthquakeEvent[]
}

function toCSS([r, g, b]: [number, number, number]): string {
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`
}

const DEPTH_ENTRIES: { label: string; depth: number }[] = [
  { label: '0 km · Surface',       depth: 0   },
  { label: '35 km · Shallow',      depth: 35  },
  { label: '70 km · Intermediate', depth: 70  },
  { label: '150 km',               depth: 150 },
  { label: '300 km · Deep',        depth: 300 },
  { label: '700 km · Very Deep',   depth: 700 },
]

const MAG_ENTRIES: { label: string; mag: number; size: number }[] = [
  { label: 'M < 2   Micro',    mag: 1,   size: 6  },
  { label: 'M 2–4   Minor',    mag: 3,   size: 9  },
  { label: 'M 4–5   Light',    mag: 4.5, size: 13 },
  { label: 'M 5–6   Moderate', mag: 5.5, size: 17 },
  { label: 'M 6–7   Strong',   mag: 6.5, size: 22 },
  { label: 'M 7+    Major',    mag: 7,   size: 28 },
]

export function LeftPanel({ events }: Props) {
  const total  = events.length
  const maxMag = total > 0 ? Math.max(...events.map(e => e.magnitude))           : null
  const avgMag = total > 0 ? events.reduce((s, e) => s + e.magnitude, 0) / total : null
  const avgDep = total > 0 ? events.reduce((s, e) => s + e.depth_km, 0)  / total : null

  return (
    <div style={panelStyle}>

      {/* Magnitude Scale — always visible */}
      <div className="section-label">Magnitude Scale</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
        {MAG_ENTRIES.map(({ label, mag, size }) => {
          const col  = toCSS(magnitudeColor(mag))
          return (
            <div key={mag} style={dotRowStyle}>
              <div style={{ ...dotStyle, width: size, height: size, background: col, boxShadow: `0 0 5px ${col}` }} />
              <span style={dotLabelStyle}>{label}</span>
            </div>
          )
        })}
      </div>

      {/* Depth Scale — always visible */}
      <div className="section-label">Depth Scale</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
        {DEPTH_ENTRIES.map(({ label, depth }) => {
          const col  = toCSS(depthColor(depth))
          const size = 7 + (depth / 700) * 7
          return (
            <div key={depth} style={dotRowStyle}>
              <div style={{ ...dotStyle, width: size, height: size, background: col, boxShadow: `0 0 5px ${col}` }} />
              <span style={dotLabelStyle}>{label}</span>
            </div>
          )
        })}
      </div>

      {/* Statistics */}
      <div className="section-label">Window Stats</div>
      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <div className="stat-box">
          <span className="val">{total.toLocaleString()}</span>
          <span className="lbl">Events</span>
        </div>
        <div className="stat-box">
          <span className="val">{maxMag !== null ? maxMag.toFixed(1) : '—'}</span>
          <span className="lbl">Max Mag</span>
        </div>
        <div className="stat-box">
          <span className="val">{avgMag !== null ? avgMag.toFixed(1) : '—'}</span>
          <span className="lbl">Avg Mag</span>
        </div>
        <div className="stat-box">
          <span className="val">{avgDep !== null ? Math.round(avgDep) : '—'}</span>
          <span className="lbl">Avg Depth km</span>
        </div>
      </div>

    </div>
  )
}

const panelStyle: React.CSSProperties = {
  height:    '100%',
  overflowY: 'auto',
  overflowX: 'hidden',
  padding:   16,
}

const dotRowStyle: React.CSSProperties = {
  display:    'flex',
  alignItems: 'center',
  gap:        10,
}

const dotStyle: React.CSSProperties = {
  borderRadius: '50%',
  flexShrink:   0,
}

const dotLabelStyle: React.CSSProperties = {
  fontSize: 10,
  color:    'var(--text)',
}
