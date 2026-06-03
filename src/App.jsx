import { useState } from 'react'
import './theme/tokens.css'
import './theme/sleep.css'
import './theme/overview.css'
import { useSleepNight } from './hooks/useSleepNight'
import { OverviewView } from './components/OverviewView'
import { SleepView }    from './components/SleepView'

export default function App() {
  const [screen, setScreen]     = useState('home')  // 'home' | 'sleep'
  const [nightIdx, setNightIdx] = useState(0)        // 0 = latest

  const { loading, error, nights, avg30 } = useSleepNight()

  const night   = nights[nightIdx] ?? null
  const canPrev = nightIdx < nights.length - 1  // older
  const canNext = nightIdx > 0                  // newer

  function goPrev() { if (canPrev) setNightIdx(i => i + 1) }
  function goNext() { if (canNext) setNightIdx(i => i - 1) }

  const nav = { nightIdx, total: nights.length, canPrev, canNext, goPrev, goNext }

  return (
    <div className="v2-viewport">
      <div
        className="v2-track"
        style={{ transform: screen === 'home' ? 'translateX(0)' : 'translateX(-50%)' }}
      >
        <div className="v2-pane">
          <OverviewView
            loading={loading}
            night={night}
            nav={nav}
            onOpenSleep={() => setScreen('sleep')}
          />
        </div>
        <div className="v2-pane">
          {screen === 'sleep' && (
            <SleepView
              loading={loading}
              error={error}
              night={night}
              avg30={avg30}
              nav={nav}
              onBack={() => setScreen('home')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
