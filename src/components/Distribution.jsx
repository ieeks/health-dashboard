import { useReveal } from '../hooks/useReveal'
import { fmtHMshort } from '../lib/sleepParser'

const PH_COLOR = {
  deep:  'var(--ph-deep)',
  light: 'var(--ph-light)',
  rem:   'var(--ph-rem)',
  awake: 'var(--ph-awake)',
}

export function Distribution({ stages, avg30 }) {
  const on = useReveal()

  const total = stages.reduce((sum, s) => sum + s.min, 0)
  if (total === 0) return null

  // avg30 total for percentage markers
  const avg30Total = avg30
    ? Object.values(avg30).reduce((a, v) => a + v, 0)
    : 0

  return (
    <div className="dist">
      {/* Stacked bar */}
      <div className="stack">
        {stages.map(s => (
          <i
            key={s.key}
            className={s.key}
            style={{ width: on ? `${(s.min / total) * 100}%` : 0 }}
          />
        ))}
      </div>

      {/* Per-phase rows */}
      <div className="rows">
        {stages.map(s => {
          const pct = (s.min / total) * 100
          const avgMin = avg30?.[s.key] ?? 0
          const avgPct = avg30Total > 0 ? (avgMin / avg30Total) * 100 : null

          return (
            <div className="drow" key={s.key}>
              <span className="sw" style={{ background: PH_COLOR[s.key] }} />
              <span className="nm">{s.label}</span>
              <span className="meter">
                <i style={{
                  width: on ? `${pct}%` : 0,
                  background: PH_COLOR[s.key],
                }} />
                {avgPct !== null && (
                  <span
                    className="avg-mark"
                    style={{ left: `${Math.min(avgPct, 97)}%` }}
                  />
                )}
              </span>
              <span className="vv">{fmtHMshort(s.min)}</span>
            </div>
          )
        })}
      </div>

      {avg30 && (
        <div className="foot">
          <span className="line" />
          Ø = 30-Tage-Schnitt ({Object.keys(avg30).length > 0
            ? `${stages.length > 0 ? 'letzte Nächte' : '–'}`
            : 'noch keine Daten'})
        </div>
      )}
    </div>
  )
}
