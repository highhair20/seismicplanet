import { useEffect } from 'react'
import { useStore } from '../store'
import { magnitudeColor } from '../lib/colors'

const WINDOW_W = 260
const MARGIN   = 14

function toCSS([r, g, b]: [number, number, number]): string {
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`
}

export function EventWindow() {
  const selectedEvent    = useStore(s => s.selectedEvent)
  const selectedEventPos = useStore(s => s.selectedEventPos)
  const setSelectedEvent = useStore(s => s.setSelectedEvent)
  const setIsPlaying     = useStore(s => s.setIsPlaying)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedEvent(null)
        setIsPlaying(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSelectedEvent, setIsPlaying])

  // Close when clicking outside the window itself. Uses pointerdown so it
  // doesn't interfere with click handlers on events (they run after pointerdown
  // and will replace the selection rather than just closing it).
  useEffect(() => {
    if (!selectedEvent) return
    const onPointerDown = (e: PointerEvent) => {
      const el = document.getElementById('event-window')
      if (el && !el.contains(e.target as Node)) {
        setSelectedEvent(null)
        setIsPlaying(true)
      }
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [selectedEvent, setSelectedEvent, setIsPlaying])

  if (!selectedEvent) return null

  const e   = selectedEvent
  const col = toCSS(magnitudeColor(e.magnitude))

  const date = new Date(e.time).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  const time = new Date(e.time).toLocaleTimeString('en-US', {
    hour:         '2-digit',
    minute:       '2-digit',
    second:       '2-digit',
    timeZoneName: 'short',
  })

  const posStyle: React.CSSProperties = (() => {
    if (selectedEventPos) {
      return {
        left: Math.min(selectedEventPos.x + 14, window.innerWidth - WINDOW_W - MARGIN),
        top:  Math.min(selectedEventPos.y + 14, window.innerHeight - MARGIN),
      }
    }
    const globe = document.getElementById('globe-container')
    const rect  = globe?.getBoundingClientRect()
    return {
      right:  window.innerWidth  - (rect?.right  ?? window.innerWidth)  + MARGIN,
      bottom: window.innerHeight - (rect?.bottom ?? window.innerHeight) + MARGIN,
    }
  })()

  return (
    <div id="event-window" style={{
        position:     'fixed',
        ...posStyle,
        width:        WINDOW_W,
        zIndex:       1000,
        background:   'rgba(5, 10, 22, 0.97)',
        border:       `1px solid ${col}55`,
        borderRadius: 6,
        padding:      14,
        boxShadow:    `0 0 24px ${col}22, 0 6px 32px rgba(0,0,0,0.7)`,
        fontFamily:   'var(--font-mono)',
        fontSize:     12,
        color:        'var(--text)',
        userSelect:   'none',
      }}>

        {/* close button */}
        <button
          onClick={() => setSelectedEvent(null)}
          style={{
            position:   'absolute',
            top:        7,
            right:      9,
            background: 'none',
            border:     'none',
            color:      'var(--muted)',
            cursor:     'pointer',
            fontSize:   16,
            lineHeight: 1,
            padding:    2,
          }}
        >×</button>

        {/* magnitude */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{
            width:      12,
            height:     12,
            borderRadius: '50%',
            background: col,
            boxShadow:  `0 0 8px ${col}`,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 24, fontWeight: 700, color: col, lineHeight: 1 }}>
            M{e.magnitude.toFixed(1)}
          </span>
        </div>

        {/* date + time */}
        <div style={{ color: 'var(--text)', marginBottom: 3 }}>{date}</div>
        <div style={{ color: 'var(--muted)', marginBottom: 12 }}>{time}</div>

        {/* location */}
        {e.place && (
          <div style={{ color: 'var(--text)', marginBottom: 4, lineHeight: 1.4 }}>
            {e.place}
          </div>
        )}
        <div style={{ color: 'var(--muted)', marginBottom: 4 }}>
          {e.lat.toFixed(3)}°&nbsp;{e.lat >= 0 ? 'N' : 'S'},&nbsp;
          {Math.abs(e.lon).toFixed(3)}°&nbsp;{e.lon >= 0 ? 'E' : 'W'}
        </div>

        {/* depth */}
        <div style={{ color: 'var(--muted)' }}>{e.depth_km.toFixed(1)} km deep</div>
      </div>
  )
}
