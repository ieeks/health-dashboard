export function LoadingSkeleton() {
  return (
    <div className="sleep-view">
      <div className="sv-body">

        {/* Header skeleton */}
        <div className="sk-header">
          <div className="sk-line sk-sm" />
          <div className="sk-line sk-xl" />
          <div className="sk-line sk-md" />
        </div>

        {/* Score card skeleton */}
        <div className="card sk-card">
          <div className="sk-card-h">
            <div className="sk-line sk-sm" style={{ width: 80 }} />
            <div className="sk-line sk-sm" style={{ width: 70 }} />
          </div>
          <div className="sk-score">
            <div className="sk-ring" />
            <div className="sk-kv">
              <div className="sk-line sk-sm" style={{ width: 60 }} />
              <div className="sk-line sk-lg" style={{ width: 80 }} />
              <div className="sk-line sk-sm" style={{ width: 60 }} />
              <div className="sk-line sk-lg" style={{ width: 50 }} />
              <div className="sk-line sk-sm" style={{ width: 80 }} />
              <div className="sk-line sk-lg" style={{ width: 65 }} />
            </div>
          </div>
        </div>

        {/* Hypnogram skeleton */}
        <div className="card sk-card">
          <div className="sk-card-h">
            <div className="sk-line sk-sm" style={{ width: 100 }} />
          </div>
          <div className="sk-lanes">
            {['Wach', 'REM', 'Leicht', 'Tief'].map(l => (
              <div key={l} className="sk-lane">
                <div className="sk-lane-label" />
                <div className="sk-lane-track" />
              </div>
            ))}
          </div>
          <div className="sk-axis">
            {[0,1,2,3,4].map(i => <div key={i} className="sk-line sk-sm" style={{ width: 36 }} />)}
          </div>
        </div>

        {/* Wachphasen skeleton */}
        <div className="card sk-card">
          <div className="sk-card-h">
            <div className="sk-line sk-sm" style={{ width: 90 }} />
          </div>
          {[0,1,2].map(i => (
            <div key={i} className="sk-witem">
              <div className="sk-dot" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="sk-line sk-md" style={{ width: 80 }} />
                <div className="sk-line sk-sm" style={{ width: 140 }} />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
