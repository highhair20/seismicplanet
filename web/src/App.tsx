import { Canvas } from '@react-three/fiber'
import { Scene } from './components/Scene'
import { Timeline } from './ui/Timeline'
import { LeftPanel } from './ui/LeftPanel'
import { RightPanel } from './ui/RightPanel'
import { useEarthquakeData } from './hooks/useEarthquakeData'
import { useStore } from './store'

function UsgsLink() {
  const windowStart    = useStore(s => s.windowStart)
  const windowDuration = useStore(s => s.windowDuration)
  const minMagnitude   = useStore(s => s.minMagnitude)
  const maxDepth       = useStore(s => s.maxDepth)

  // USGS map uses escape(JSON.stringify(settings)) as the URL hash.
  // The datetime format used by the USGS UI is "YYYY-MM-DD HH:MM:SS" (UTC, space not T).
  const fmtUsgs = (ms: number) => new Date(ms).toISOString().replace('T', ' ').slice(0, 19)

  const settings = {
    feed:              'search',
    sort:              'newest',
    basemap:           'grayscale',
    timezone:          'utc',
    viewModes:         ['list', 'map'],
    listFormat:        'default',
    autoUpdate:        false,
    search: {
      id: 'search',
      params: {
        starttime:    fmtUsgs(windowStart),
        endtime:      fmtUsgs(windowStart + windowDuration),
        minmagnitude: minMagnitude.toFixed(1),
        maxdepth:     String(maxDepth),
        orderby:      'time',
      },
    },
  }

  const href = `https://earthquake.usgs.gov/earthquakes/map/#${encodeURIComponent(JSON.stringify(settings))}`

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={usgsLinkStyle}>
      <span style={usgsLogoStyle}>USGS</span>
      <span style={usgsSubStyle}>EARTHQUAKE CATALOG ↗</span>
    </a>
  )
}

export function App() {
  const events = useEarthquakeData()

  return (
    <div style={gridStyle}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header style={headerStyle}>
        <UsgsLink />

        <div style={{ textAlign: 'center' }}>
          <h1 style={titleStyle}>SEISMIC PLANET</h1>
          <p style={subtitleStyle}>GLOBAL SEISMIC TIME SERIES · 1900–PRESENT</p>
        </div>

        <div style={headerRightStyle}>
          <span style={eventCountStyle}>{events.length.toLocaleString()}</span>
          EVENTS IN WINDOW
        </div>

        {/* accent underline */}
        <div style={accentLineStyle} />
      </header>

      {/* ── Left panel ─────────────────────────────────────────── */}
      <aside style={panelStyle('left')}>
        <LeftPanel events={events} />
      </aside>

      {/* ── 3D Globe ───────────────────────────────────────────── */}
      <main style={mapStyle}>
        <Canvas
          camera={{ position: [-0.197, 1.108, 1.405], fov: 45, near: 0.1, far: 1000 }}
          gl={{ antialias: true, alpha: false }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Scene events={events} />
        </Canvas>
      </main>

      {/* ── Right panel ────────────────────────────────────────── */}
      <aside style={panelStyle('right')}>
        <RightPanel events={events} />
      </aside>

      {/* ── Footer timeline ────────────────────────────────────── */}
      <footer style={footerStyle}>
        <Timeline events={events} />
      </footer>

    </div>
  )
}

/* ── Styles ────────────────────────────────────────────────────── */

const gridStyle: React.CSSProperties = {
  display:             'grid',
  gridTemplateRows:    '56px 1fr 120px',
  gridTemplateColumns: '260px 1fr 260px',
  gridTemplateAreas:   '"header header header" "left map right" "footer footer footer"',
  height:              '100%',
  background:          'var(--bg)',
  color:               'var(--text)',
}

const headerStyle: React.CSSProperties = {
  gridArea:       'header',
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'space-between',
  padding:        '0 24px',
  background:     'linear-gradient(90deg, #050810 0%, #07101e 50%, #050810 100%)',
  borderBottom:   '1px solid var(--border)',
  position:       'relative',
  zIndex:         10,
  userSelect:     'none',
}

const accentLineStyle: React.CSSProperties = {
  position:   'absolute',
  bottom:     0,
  left:       0,
  right:      0,
  height:     1,
  background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
  opacity:    0.5,
  pointerEvents: 'none',
}

const usgsLinkStyle: React.CSSProperties = {
  display:        'flex',
  flexDirection:  'column',
  alignItems:     'flex-start',
  textDecoration: 'none',
  gap:            2,
}

const usgsLogoStyle: React.CSSProperties = {
  fontFamily:    'var(--font-mono)',
  fontSize:      15,
  fontWeight:    900,
  letterSpacing: 4,
  color:         'var(--accent)',
  textTransform: 'uppercase' as const,
  lineHeight:    1,
}

const usgsSubStyle: React.CSSProperties = {
  fontFamily:    'var(--font-mono)',
  fontSize:      8,
  letterSpacing: 2,
  color:         'var(--muted)',
  textTransform: 'uppercase' as const,
}

const titleStyle: React.CSSProperties = {
  fontSize:      15,
  fontWeight:    900,
  letterSpacing: 8,
  textTransform: 'uppercase' as const,
  color:         '#fff',
  margin:        0,
}

const subtitleStyle: React.CSSProperties = {
  fontFamily:    'var(--font-mono)',
  fontSize:      9,
  letterSpacing: 3,
  color:         'var(--muted)',
  marginTop:     2,
}

const headerRightStyle: React.CSSProperties = {
  fontFamily:    'var(--font-mono)',
  fontSize:      10,
  color:         'var(--muted)',
  textAlign:     'right',
  letterSpacing: 1,
}

const eventCountStyle: React.CSSProperties = {
  color:       'var(--accent)',
  fontSize:    20,
  fontWeight:  600,
  display:     'block',
  lineHeight:  1.1,
}

function panelStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    gridArea:   side,
    background: 'var(--panel)',
    borderLeft:  side === 'right' ? '1px solid var(--border)' : undefined,
    borderRight: side === 'left'  ? '1px solid var(--border)' : undefined,
    overflow:   'hidden',
  }
}

const mapStyle: React.CSSProperties = {
  gridArea:  'map',
  position:  'relative',
  overflow:  'hidden',
  background: 'radial-gradient(ellipse at 50% 40%, #060d1a 0%, #020509 100%)',
}

const footerStyle: React.CSSProperties = {
  gridArea:    'footer',
  borderTop:   '1px solid var(--border)',
  overflow:    'hidden',
}
