import { useState } from 'react'
import './theme/tokens.css'
import './theme/sleep.css'
import './theme/overview.css'
import { OverviewView } from './components/OverviewView'
import { SleepView }    from './components/SleepView'

export default function App() {
  const [screen, setScreen] = useState('home') // 'home' | 'sleep'

  return (
    <div className="v2-viewport">
      <div
        className="v2-track"
        style={{ transform: screen === 'home' ? 'translateX(0)' : 'translateX(-50%)' }}
      >
        <div className="v2-pane">
          <OverviewView onOpenSleep={() => setScreen('sleep')} />
        </div>
        <div className="v2-pane">
          {screen === 'sleep' && (
            <SleepView onBack={() => setScreen('home')} />
          )}
        </div>
      </div>
    </div>
  )
}
