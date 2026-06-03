import { useReveal } from '../hooks/useReveal'

const PH = {
  deep:  { label: 'Tief',   color: 'var(--ph-deep)'  },
  light: { label: 'Leicht', color: 'var(--ph-light)' },
  rem:   { label: 'REM',    color: 'var(--ph-rem)'   },
  awake: { label: 'Wach',   color: 'var(--ph-awake)' },
}

// Top → bottom: Wach at top, Tief at bottom
const LANE_ORDER = ['awake', 'rem', 'light', 'deep']
const LANE_H = 30

function Legend() {
  return (
    <div className="hyp-legend">
      {LANE_ORDER.map(k => (
        <span className="lg" key={k}>
          <i style={{ background: PH[k].color }} />
          {PH[k].label}
        </span>
      ))}
    </div>
  )
}

function Axis({ ticks }) {
  return (
    <div className="hyp-axis">
      {ticks.map(t => (
        <span key={t.label} style={{ left: `${t.pct}%` }}>{t.label}</span>
      ))}
    </div>
  )
}

export function Hypnogram({ segments, span, axisTicks, onWakeClick }) {
  const on = useReveal()

  const laneY = (type) => LANE_ORDER.indexOf(type) * LANE_H + LANE_H / 2

  const pctOf = (min) => (min / span) * 100

  return (
    <div className="hyp">
      <Legend />
      <div className="lanes" style={{ position: 'relative' }}>
        {LANE_ORDER.map(laneKey => (
          <div className="lane" key={laneKey}>
            <span className="lab">{PH[laneKey].label}</span>
            <div className="track">
              {segments.filter(s => s.type === laneKey).map((s, i) => {
                const isWake = s.type === 'awake'
                const bigWake = isWake && s.dur >= 5
                const delay = 0.15 + (s.start / span) * 0.9
                return (
                  <div
                    key={i}
                    className={`seg ${s.type}${on ? ' revealed' : ''}${bigWake ? ' big-wake' : ''}`}
                    style={{
                      left: `${pctOf(s.start)}%`,
                      width: `max(${pctOf(s.dur)}%, 5px)`,
                      transition: `transform .5s cubic-bezier(.22,.61,.36,1) ${delay}s, opacity .4s ease ${delay}s`,
                    }}
                    onClick={isWake ? () => onWakeClick?.(s) : undefined}
                    title={isWake ? `${s.startClock} · ${Math.round(s.dur)} min` : undefined}
                  />
                )
              })}
            </div>
          </div>
        ))}

        {/* Riser lines between consecutive phases */}
        <svg
          style={{
            position: 'absolute', left: 42, top: 0, right: 0,
            width: 'calc(100% - 42px)',
            height: LANE_ORDER.length * LANE_H,
            pointerEvents: 'none', overflow: 'visible',
          }}
          preserveAspectRatio="none"
          viewBox={`0 0 100 ${LANE_ORDER.length * LANE_H}`}
        >
          {segments.slice(0, -1).map((s, i) => {
            const next = segments[i + 1]
            const x = pctOf(s.end)
            const delay = 0.4 + (s.start / span) * 0.9
            return (
              <line
                key={i}
                x1={x} y1={laneY(s.type)}
                x2={x} y2={laneY(next.type)}
                stroke="rgba(150,180,230,.16)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                style={{
                  opacity: on ? 1 : 0,
                  transition: `opacity .4s ease ${delay}s`,
                }}
              />
            )
          })}
        </svg>
      </div>
      <Axis ticks={axisTicks} />
    </div>
  )
}
