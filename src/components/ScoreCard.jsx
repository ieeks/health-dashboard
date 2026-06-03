import { useReveal } from '../hooks/useReveal'
import { fmtHM } from '../lib/sleepParser'

export function ScoreCard({ summary }) {
  const on = useReveal()
  const { efficiency, awakeMin, wakeCount, fallAsleepMin } = summary

  const R = 50
  const C = 2 * Math.PI * R
  const offset = on ? C * (1 - efficiency / 100) : C

  return (
    <div className="score">
      <div className="score-ring">
        <svg width="116" height="116" viewBox="0 0 116 116">
          <circle className="ring-bg" cx="58" cy="58" r={R} strokeWidth="9" fill="none" />
          <circle
            className="ring-fg"
            cx="58" cy="58" r={R}
            strokeWidth="9" fill="none"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="ring-center">
          <div className="v">{efficiency}<small>%</small></div>
          <div className="c">Effizienz</div>
        </div>
      </div>

      <div className="kv">
        <div className="row warm">
          <span className="lab">Wach</span>
          <span className="v">{awakeMin}<small> min</small></span>
        </div>
        <div className="row">
          <span className="lab">Aufwacher</span>
          <span className="v">{wakeCount}<small>×</small></span>
        </div>
        <div className="row">
          <span className="lab">Eingeschlafen in</span>
          <span className="v">{fallAsleepMin}<small> min</small></span>
        </div>
      </div>
    </div>
  )
}
