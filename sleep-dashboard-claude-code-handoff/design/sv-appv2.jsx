/* sv-appv2.jsx — V2: navigierbarer Fluss Home-Übersicht → Schlaf-Detail
   Home ist der Hub; Schlaf-View ist Detail-Screen (Brücke/Tab → öffnen, Back → zurück). */

function AppV2({ theme = 'dark' }) {
  const [screen, setScreen] = React.useState('home');   // 'home' | 'sleep'
  const go = (s) => setScreen(s);

  return (
    <div className={'v2-viewport' + (theme === 'light' ? ' light' : '')}>
      <div className="v2-track" style={{ left: screen === 'home' ? 0 : -390 }}>
        <div className="v2-pane">
          <Overview key={'ov-' + theme} onOpenSleep={() => go('sleep')} theme={theme} />
        </div>
        <div className="v2-pane">
          {screen === 'sleep' && (
            <SleepView key={'sv-' + theme} hypno="A" score="B" noteMode="inline" theme={theme} onBack={() => go('home')} />
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AppV2 });
