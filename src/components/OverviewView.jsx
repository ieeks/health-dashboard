import { useEffect, useState } from 'react'
import { useActivityData } from '../hooks/useActivityData'
import { fmtHM } from '../lib/sleepParser'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n, decimals = 0) {
  if (n == null) return '—'
  return n.toLocaleString('de-AT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// Get today's date label in German
function todayLabel() {
  return new Date().toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })
}

// ── useReveal: fires true after two rAF ticks ─────────────────────────────────
function useReveal() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    let id1, id2
    id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setOn(true))
    })
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2) }
  }, [])
  return on
}

// ── Staggered card reveal ─────────────────────────────────────────────────────
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

// ── Chevron icon ──────────────────────────────────────────────────────────────
function Chevron({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5,2 10,7.5 5,13" />
    </svg>
  )
}

// ── Goal Rings (3 concentric SVG rings) ──────────────────────────────────────
function GoalRings({ steps, stepsGoal = 10000, azm, azmGoal = 30, calories, caloriesGoal = 1000 }) {
  const on = useReveal()

  const rings = [
    { r: 42, color: 'var(--cyan)',     frac: steps    != null ? Math.min(steps    / stepsGoal,    1) : 0 },
    { r: 31, color: 'var(--ph-light)', frac: azm      != null ? Math.min(azm      / azmGoal,      1) : 0 },
    { r: 20, color: 'var(--warm)',     frac: calories != null ? Math.min(calories / caloriesGoal, 1) : 0 },
  ]

  return (
    <div className="rings-wrap">
      <svg width="110" height="110" viewBox="0 0 110 110">
        {rings.map(({ r, color, frac }, i) => {
          const C = 2 * Math.PI * r
          return (
            <g key={i}>
              <circle className="ring-bg" cx="55" cy="55" r={r}
                stroke="rgba(150,180,230,.10)" strokeWidth="8.5" />
              <circle className="ring-fg" cx="55" cy="55" r={r}
                stroke={color} strokeWidth="8.5"
                strokeDasharray={C}
                strokeDashoffset={on ? C * (1 - frac) : C}
                style={{
                  transitionDelay: `${0.2 + i * 0.12}s`,
                  filter: `drop-shadow(0 0 5px ${color}66)`,
                }}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Sleep Bridge (mini hypnogram + stats, clickable → detail) ────────────────
const PHASE_COLOR = { deep: 'var(--ph-deep)', light: 'var(--ph-light)', rem: 'var(--ph-rem)', awake: 'var(--warm)' }
const PHASE_H     = { deep: 8, light: 13, rem: 18, awake: 22 }

function SleepBridge({ night, onClick }) {
  if (!night) {
    return (
      <div className="bridge" style={{ cursor: 'default' }}>
        <div className="bridge-l">
          <div className="bridge-big" style={{ color: 'var(--ink-dim)', fontSize: 16 }}>
            Keine Schlafdaten
          </div>
        </div>
      </div>
    )
  }

  const { SUMMARY, SEGMENTS } = night

  return (
    <div className="bridge" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div className="bridge-l">
        <div className="bridge-big">{fmtHM(SUMMARY.asleepMin)}</div>
        <div className="bridge-sub">
          <span>{SUMMARY.startClock} → {SUMMARY.endClock}</span>
          <span className="dot" />
          <span>{SUMMARY.efficiency} %</span>
          <span className="dot" />
          <span>{SUMMARY.wakeCount}× wach</span>
        </div>
        <div className="bridge-mini">
          {SEGMENTS.map((s, i) => (
            <i
              key={i}
              style={{
                background: PHASE_COLOR[s.type],
                height: PHASE_H[s.type],
                width: Math.max(Math.round(s.dur / 2), 2),
              }}
            />
          ))}
        </div>
      </div>
      <div className="bridge-chev">
        <Chevron size={20} />
      </div>
    </div>
  )
}

// ── Sparkline (24-bar hourly profile, seeded pseudo-random) ──────────────────
// In V1 of activity data, real hourly breakdown isn't available from the API.
// The bars show a plausible daily activity shape; peaks highlight in cyan.
function Spark({ profile, on }) {
  const bars = (() => {
    const seed = profile === 'step' ? 7 : profile === 'cal' ? 3 : 11
    let x = seed
    const rnd = () => { x = (x * 9301 + 49297) % 233280; return x / 233280 }
    const arr = []
    for (let i = 0; i < 24; i++) {
      let v = rnd() * 8
      if (profile === 'step') {
        if (i >= 7 && i <= 9)   v = 28 + rnd() * 38
        else if (i >= 11 && i <= 13) v = 16 + rnd() * 14
        else if (i >= 17 && i <= 19) v = 12 + rnd() * 12
      } else {
        if (i >= 7 && i <= 20) v = 10 + rnd() * 22
      }
      arr.push(v)
    }
    return arr
  })()

  const max = Math.max(...bars)

  return (
    <div className="spark">
      {bars.map((v, i) => (
        <i
          key={i}
          className={v / max > 0.68 ? 'spark-hi' : ''}
          style={{ height: on ? `${(v / max) * 100}%` : '2px', transitionDelay: `${i * 0.012}s` }}
        />
      ))}
    </div>
  )
}

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ name, value, unit, profile, reveal }) {
  const on = useReveal()

  return (
    <Reveal i={reveal}>
      <div className="card metric">
        <div className="mtop">
          <span className="mname">{name}</span>
          <span className="mchev"><Chevron size={15} /></span>
        </div>
        <div className="mwhen">Heute</div>
        <div className="mval">
          {value != null ? fmt(value) : <span className="ov-placeholder">—</span>}
          {unit && value != null && <small> {unit}</small>}
        </div>
        <Spark profile={profile} on={on} />
        <div className="maxis">
          <span>00</span><span>06</span><span>12</span><span>18</span>
        </div>
      </div>
    </Reveal>
  )
}

// ── Heart Card (7-day trend lines) ────────────────────────────────────────────
function HeartCard({ restingHr, hrv, restingHr7, hrv7 }) {
  // Build polyline points from 7-day arrays (or flat line if no data)
  function toPoints(arr) {
    if (!arr || arr.length === 0) return '0,15 100,15'
    const vals = arr.slice(-7)
    const mn   = Math.min(...vals)
    const mx   = Math.max(...vals)
    const range = mx - mn || 1
    return vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * 100
      const y = 28 - ((v - mn) / range) * 24
      return `${x},${y}`
    }).join(' ')
  }

  return (
    <div className="heart">
      <div className="hcol">
        <span className="hnm">Ruhepuls</span>
        <span className="hv">
          {restingHr != null ? restingHr : <span className="ov-placeholder">—</span>}
          {restingHr != null && <small> bpm</small>}
        </span>
        <svg width="100%" height="30" preserveAspectRatio="none" viewBox="0 0 100 30">
          <polyline fill="none" stroke="var(--warm)" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round"
            points={toPoints(restingHr7)} />
        </svg>
      </div>
      <div className="hcol">
        <span className="hnm">HRV</span>
        <span className="hv">
          {hrv != null ? hrv : <span className="ov-placeholder">—</span>}
          {hrv != null && <small> ms</small>}
        </span>
        <svg width="100%" height="30" preserveAspectRatio="none" viewBox="0 0 100 30">
          <polyline fill="none" stroke="var(--cyan)" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round"
            points={toPoints(hrv7)} />
        </svg>
      </div>
    </div>
  )
}

// ── Vitals List ───────────────────────────────────────────────────────────────
function VitalsList({ spo2, respiratoryRate, skinTempDeviation }) {
  const rows = [
    { label: 'SpO₂',           ctx: 'Ø über Nacht',  value: spo2             != null ? `${spo2} %`                      : null },
    { label: 'Atemfrequenz',   ctx: 'Ø über Nacht',  value: respiratoryRate  != null ? `${fmt(respiratoryRate, 1)} /min` : null },
    { label: 'Hauttemp.-Abw.', ctx: 'vs. Baseline',  value: skinTempDeviation != null ? `${skinTempDeviation > 0 ? '+' : ''}${fmt(skinTempDeviation, 1)} °C` : null },
  ]

  return (
    <div className="vit">
      {rows.map(({ label, ctx, value }) => (
        <div key={label} className="vr">
          <span className="vn">{label}</span>
          <span className="vx">{ctx}</span>
          <b>{value ?? <span className="ov-placeholder">—</span>}</b>
        </div>
      ))}
    </div>
  )
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────
function TabBar({ active, onHome, onSleep }) {
  return (
    <div className="tabs">
      <div className={`tab${active === 'home' ? ' active' : ''}`} onClick={onHome}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"
          stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="12" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="12" width="7" height="7" rx="1.5" />
          <rect x="12" y="12" width="7" height="7" rx="1.5" />
        </svg>
        Übersicht
      </div>
      <div className={`tab${active === 'sleep' ? ' active' : ''}`} onClick={onSleep}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 12.5A6.5 6.5 0 1 1 9.5 5a5 5 0 0 0 7.5 7.5z" />
        </svg>
        Schlaf
      </div>
      <div className="tab">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 17l5-6 4 3 5-7" />
        </svg>
        Verlauf
      </div>
    </div>
  )
}

// ── Overview View (main export) ───────────────────────────────────────────────
export function OverviewView({ loading, night, nav, onOpenSleep }) {
  const { daily }  = useActivityData()

  // Extract activity values (null = no data yet)
  const steps    = daily?.steps    ?? null
  const stepsGoal = daily?.stepsGoal ?? 10000
  const azm      = daily?.azm      ?? null
  const azmGoal  = daily?.azmGoal  ?? 30
  const calories = daily?.calories ?? null
  const caloriesGoal = daily?.caloriesGoal ?? 1000
  const distanceM = daily?.distanceM ?? null
  const restingHr = daily?.restingHr ?? null
  const hrv       = daily?.hrv       ?? null
  const restingHr7 = daily?.restingHr7days ?? null
  const hrv7       = daily?.hrv7days       ?? null
  const spo2               = daily?.spo2               ?? null
  const respiratoryRate    = daily?.respiratoryRate    ?? null
  const skinTempDeviation  = daily?.skinTempDeviation  ?? null

  const distanceKm = distanceM != null ? distanceM / 1000 : null

  return (
    <div className="ov-screen">
      <div className="ov-body">

        {/* 1 — Header */}
        <Reveal i={0}>
          <div className="ov-hd">
            <div>
              <h1>Übersicht</h1>
              <div className="date">{todayLabel()}</div>
            </div>
            <div className="avatar">MK</div>
          </div>
        </Reveal>

        {/* 2 — Tagesziele (Rings) */}
        <Reveal i={1}>
          <div className="card">
            <div className="card-h">
              <span className="t">Tagesziele</span>
              <span className="meta">FITBIT</span>
            </div>
            <div className="goal">
              <GoalRings
                steps={steps} stepsGoal={stepsGoal}
                azm={azm} azmGoal={azmGoal}
                calories={calories} caloriesGoal={caloriesGoal}
              />
              <div className="goalkv">
                <div className="grow">
                  <div className="gtop">
                    <i style={{ background: 'var(--cyan)' }} />
                    <span className="glab">Schritte</span>
                  </div>
                  <span className="gv">
                    {steps != null ? fmt(steps) : <span className="ov-placeholder">—</span>}
                    <small> / {fmt(stepsGoal)}</small>
                  </span>
                </div>
                <div className="grow">
                  <div className="gtop">
                    <i style={{ background: 'var(--ph-light)' }} />
                    <span className="glab">Active Zone Min</span>
                  </div>
                  <span className="gv">
                    {azm != null ? fmt(azm) : <span className="ov-placeholder">—</span>}
                    <small> / {fmt(azmGoal)}</small>
                  </span>
                </div>
                <div className="grow">
                  <div className="gtop">
                    <i style={{ background: 'var(--warm)' }} />
                    <span className="glab">Kalorien</span>
                  </div>
                  <span className="gv">
                    {calories != null ? fmt(calories) : <span className="ov-placeholder">—</span>}
                    <small> / {fmt(caloriesGoal)}</small>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* 3 — Schlaf-Brücke */}
        <Reveal i={2}>
          <div className="card">
            <div className="card-h">
              <span className="t"><span className="accent">●</span> Schlaf · {night?.SUMMARY?.dateLabel ?? 'letzte Nacht'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {nav && nav.total > 1 && (
                  <div className="sv-nav-arrows">
                    <button className="sv-nav-btn" onClick={nav.goPrev} disabled={!nav.canPrev} aria-label="Vorherige Nacht">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,2 4,7 9,12" /></svg>
                    </button>
                    <button className="sv-nav-btn" onClick={nav.goNext} disabled={!nav.canNext} aria-label="Nächste Nacht">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="5,2 10,7 5,12" /></svg>
                    </button>
                  </div>
                )}
                <span className="meta" style={{ cursor: 'pointer' }} onClick={onOpenSleep}>Detail →</span>
              </div>
            </div>
            <SleepBridge night={night} onClick={onOpenSleep} />
          </div>
        </Reveal>

        {/* 4 — Metrik-Grid */}
        <div className="grid2">
          <MetricCard name="Schrittzahl" value={steps}       profile="step" reveal={3} />
          <MetricCard name="Strecke"     value={distanceKm != null ? Math.round(distanceKm * 100) / 100 : null}
            unit="km" profile="step" reveal={3} />
        </div>
        <div className="grid2">
          <MetricCard name="Kalorien"        value={calories} unit="kcal" profile="cal"  reveal={4} />
          <MetricCard name="Active Zone Min" value={azm}      unit="min"  profile="step" reveal={4} />
        </div>

        {/* 5 — Herz */}
        <Reveal i={5}>
          <div className="card">
            <div className="card-h">
              <span className="t">Herz · 7 Tage</span>
            </div>
            <HeartCard
              restingHr={restingHr}
              hrv={hrv}
              restingHr7={restingHr7}
              hrv7={hrv7}
            />
          </div>
        </Reveal>

        {/* 6 — Vitalwerte */}
        <Reveal i={6}>
          <div className="card">
            <div className="card-h">
              <span className="t">Vitalwerte · über Nacht</span>
            </div>
            <VitalsList
              spo2={spo2}
              respiratoryRate={respiratoryRate}
              skinTempDeviation={skinTempDeviation}
            />
          </div>
        </Reveal>

      </div>

      <TabBar active="home" onHome={() => {}} onSleep={onOpenSleep} />
    </div>
  )
}
