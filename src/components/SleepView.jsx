import { useSleepNight } from '../hooks/useSleepNight'
import { useWakeNotes } from '../hooks/useWakeNotes'
import { useTheme } from '../hooks/useTheme'
import { fmtHM } from '../lib/sleepParser'
import { ScoreCard } from './ScoreCard'
import { Hypnogram } from './Hypnogram'
import { WakeList } from './WakeList'
import { Distribution } from './Distribution'
import { ThemeToggle } from './ThemeToggle'
import { LoadingSkeleton } from './LoadingSkeleton'

function Reveal({ i = 0, children }) {
  return (
    <div
      className="reveal"
      style={{ transitionDelay: `${i * 0.09}s` }}
      ref={el => {
        if (!el) return
        el.classList.add('hidden')
        requestAnimationFrame(() => requestAnimationFrame(() => {
          el.classList.remove('hidden')
          el.classList.add('visible')
        }))
      }}
    >
      {children}
    </div>
  )
}

export function SleepView({ onBack }) {
  const { theme, toggle } = useTheme()
  const { loading, error, night, avg30 } = useSleepNight()
  const { notes, saveNote } = useWakeNotes(night?.date ?? null)

  if (loading) return <LoadingSkeleton />

  if (error) {
    return (
      <div className="sv-error">
        <span>Fehler beim Laden: {error}</span>
      </div>
    )
  }

  if (!night) {
    return (
      <div className="sv-empty">
        <span>Noch keine Schlafdaten vorhanden.</span>
        <span style={{ fontSize: 12, opacity: .6 }}>Sync läuft täglich um 08:00 Uhr.</span>
      </div>
    )
  }

  const { SUMMARY, SEGMENTS, WAKES, STAGES, SPAN, axisTicks } = night

  return (
    <div className="sleep-view">
      <div className="sv-body">

        {/* 1 — Header */}
        <Reveal i={0}>
          <div className="sv-hd">
            <div className="nav">
              {onBack ? (
                <button className="sv-back" onClick={onBack} aria-label="Zurück zur Übersicht">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="10,2 5,7.5 10,13" />
                  </svg>
                  Übersicht
                </button>
              ) : (
                <span>{SUMMARY.dateLabel}</span>
              )}
              <ThemeToggle theme={theme} onToggle={toggle} />
            </div>
            <div className="range">
              {SUMMARY.startClock}
              <span className="arrow">→</span>
              {SUMMARY.endClock}
            </div>
            <div className="sub">
              <b>{fmtHM(SUMMARY.asleepMin)}</b>
              geschlafen
              <span className="dot" />
              {fmtHM(SUMMARY.inBedMin)} im Bett
            </div>
          </div>
        </Reveal>

        {/* 2 — Score / Effizienz-Ring */}
        <Reveal i={1}>
          <div className="card">
            <div className="card-h">
              <span className="t">Übersicht</span>
              <span className="meta">FITBIT · Stufen</span>
            </div>
            <ScoreCard summary={SUMMARY} />
          </div>
        </Reveal>

        {/* 3 — Hypnogramm */}
        <Reveal i={2}>
          <div className="card">
            <div className="card-h">
              <span className="t">Hypnogramm</span>
              <span className="meta">{SEGMENTS.length} Phasen</span>
            </div>
            <Hypnogram
              segments={SEGMENTS}
              span={SPAN}
              axisTicks={axisTicks}
            />
          </div>
        </Reveal>

        {/* 4 — Wachphasen */}
        <Reveal i={3}>
          <div className="card">
            <div className="card-h">
              <span className="t"><span className="accent">●</span> Wachphasen</span>
              <span className="meta">antippen für Notiz</span>
            </div>
            <WakeList wakes={WAKES} notes={notes} onSave={saveNote} />
          </div>
        </Reveal>

        {/* 5 — Phasen-Verteilung */}
        <Reveal i={4}>
          <div className="card">
            <div className="card-h">
              <span className="t">Phasen-Verteilung</span>
              <span className="meta">vs. 30 Tage</span>
            </div>
            <Distribution stages={STAGES} avg30={avg30} />
          </div>
        </Reveal>

        {/* 6 — Fußnote */}
        <Reveal i={5}>
          <div className="foot-note">
            <b>„Effizienz"</b> = geschlafen ÷ im Bett ({SUMMARY.asleepMin} ÷ {SUMMARY.inBedMin} min).
            Die Fitbit-API liefert keinen offiziellen Sleep-Score — angezeigt wird dieser ehrliche Proxy.
          </div>
        </Reveal>

      </div>
    </div>
  )
}
