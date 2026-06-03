/* sv-overview.jsx — Aktivität-Übersicht (Home), Brücke zur Schlaf-View */

function Rings() {
  const on = useReveal();
  // [r, color, frac]
  const data = [
    [42, 'var(--cyan)',     0.84],  // Schritte 8381/10000
    [31, 'var(--ph-light)', 1.0],   // AZM 42/30 (voll)
    [20, 'var(--warm)',     0.81],  // Kalorien 816/1010
  ];
  return (
    <div className="rings">
      <svg width="110" height="110" viewBox="0 0 110 110">
        {data.map(([r, color], i) => {
          const C = 2 * Math.PI * r;
          return (
            <g key={i}>
              <circle className="rbg" cx="55" cy="55" r={r} stroke="rgba(150,180,230,.10)" strokeWidth="8.5"/>
              <circle className="rfg" cx="55" cy="55" r={r} stroke={color} strokeWidth="8.5"
                strokeDasharray={C} strokeDashoffset={on ? C * (1 - data[i][2]) : C}
                style={{ transitionDelay: `${0.2 + i * 0.12}s`, filter: `drop-shadow(0 0 5px ${color}66)` }}/>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Spark({ profile }) {
  const on = useReveal();
  const bars = React.useMemo(() => {
    const seed = profile === 'step' ? 7 : profile === 'cal' ? 3 : 11;
    let x = seed; const rnd = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
    const arr = [];
    for (let i = 0; i < 24; i++) {
      let v = rnd() * 8;
      if (profile === 'step') { if (i >= 6 && i <= 9) v = 28 + rnd() * 38; else if (i >= 11 && i <= 13) v = 16 + rnd() * 14; else if (i >= 17 && i <= 19) v = 12 + rnd() * 12; }
      else { if (i >= 7 && i <= 20) v = 10 + rnd() * 22; }
      arr.push(v);
    }
    return arr;
  }, [profile]);
  const max = Math.max(...bars);
  return (
    <div className="spark">
      {bars.map((v, i) => (
        <i key={i} className={v / max > 0.68 ? 'hi' : ''}
          style={{ height: on ? (v / max * 100) + '%' : '2px', transitionDelay: `${i * 0.012}s` }}></i>
      ))}
    </div>
  );
}

function Metric({ tag, name, val, unit, profile, i }) {
  return (
    <Reveal i={i}>
      <div className="card metric">
        <div className="top"><span className="name">{name}</span><span className="chev"><Chevron size={15}/></span></div>
        <div className="when">Heute</div>
        <div className="val">{val}{unit && <small> {unit}</small>}</div>
        <Spark profile={profile} />
        <div className="axis"><span>00</span><span>06</span><span>12</span><span>18</span></div>
      </div>
    </Reveal>
  );
}

function MiniHypno() {
  // kompakte Vorschau der Phasen für die Brücke
  const segs = window.SLEEP.SEGMENTS;
  const col = { deep: 'var(--ph-deep)', light: 'var(--ph-light)', rem: 'var(--ph-rem)', awake: 'var(--warm)' };
  const h = { deep: 8, light: 13, rem: 18, awake: 22 };
  return (
    <div className="mini">
      {segs.map((s, i) => (
        <i key={i} style={{ background: col[s.type], height: h[s.type], flex: Math.max(s.dur, 4) }}></i>
      ))}
    </div>
  );
}

function Overview({ onOpenSleep, theme = 'dark' }) {
  const s = window.SLEEP.SUMMARY;
  return (
    <div className={'screen' + (theme === 'light' ? ' light' : '')}>
      <StatusBar />
      <div className="body" style={{ paddingBottom: 110 }}>
        <Reveal i={0}>
          <div className="ov-hd">
            <div><h1>Übersicht</h1><div className="date">Samstag, 30. Mai</div></div>
            <div className="avatar">MK</div>
          </div>
        </Reveal>

        {/* Tagesziele */}
        <Reveal i={1}>
          <div className="card">
            <div className="card-h"><span className="t">Tagesziele</span><span className="meta">Fitbit</span></div>
            <div className="goal">
              <Rings />
              <div className="goalkv">
                <div className="row"><div className="top"><i style={{ background: 'var(--cyan)' }}></i><span className="lab">Schritte</span></div><span className="v">8.381<small> / 10.000</small></span></div>
                <div className="row"><div className="top"><i style={{ background: 'var(--ph-light)' }}></i><span className="lab">Active Zone Min</span></div><span className="v">42<small> / 30</small></span></div>
                <div className="row"><div className="top"><i style={{ background: 'var(--warm)' }}></i><span className="lab">Kalorien</span></div><span className="v">816<small> / 1.010</small></span></div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Schlaf-Brücke */}
        <Reveal i={2}>
          <div className="card" onClick={onOpenSleep}>
            <div className="card-h"><span className="t"><span className="accent">●</span> Schlaf · letzte Nacht</span><span className="meta">Detail →</span></div>
            <div className="bridge">
              <div className="l">
                <div className="big">{fmtHM(s.asleepMin)}</div>
                <div className="sub">{s.startClock} → {s.endClock}<span className="dot"></span>{s.efficiency} %<span className="dot"></span>{s.wakeCount} Aufwacher</div>
                <MiniHypno />
              </div>
              <div className="chev"><Chevron size={20}/></div>
            </div>
          </div>
        </Reveal>

        {/* Metrik-Grid */}
        <div className="grid2">
          <Metric name="Schrittzahl" val="8.381" profile="step" i={3} />
          <Metric name="Strecke" val="7,94" unit="km" profile="step" i={3} />
        </div>
        <div className="grid2">
          <Metric name="Kalorien" val="816" unit="kcal" profile="cal" i={4} />
          <Metric name="Active Zone Min" val="42" unit="min" profile="step" i={4} />
        </div>

        {/* Herz */}
        <Reveal i={5}>
          <div className="card">
            <div className="card-h"><span className="t">Herz · 7 Tage</span></div>
            <div className="heart">
              <div className="col">
                <span className="nm">Ruhepuls</span>
                <span className="v">54<small> bpm</small></span>
                <svg width="100%" height="30" preserveAspectRatio="none" viewBox="0 0 100 30">
                  <polyline fill="none" stroke="var(--warm)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" points="0,18 17,16 33,19 50,14 67,15 83,12 100,13"/>
                </svg>
              </div>
              <div className="col">
                <span className="nm">HRV</span>
                <span className="v">48<small> ms</small></span>
                <svg width="100%" height="30" preserveAspectRatio="none" viewBox="0 0 100 30">
                  <polyline fill="none" stroke="var(--cyan)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" points="0,15 17,12 33,17 50,10 67,16 83,9 100,11"/>
                </svg>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Vitalwerte */}
        <Reveal i={6}>
          <div className="card">
            <div className="card-h"><span className="t">Vitalwerte · über Nacht</span></div>
            <div className="vit">
              <div className="r"><span className="n">SpO₂</span><span className="x">Ø über Nacht</span><b>97 %</b></div>
              <div className="r"><span className="n">Atemfrequenz</span><span className="x">Ø über Nacht</span><b>14,2 /min</b></div>
              <div className="r"><span className="n">Hauttemp.-Abw.</span><span className="x">vs. Baseline</span><b>−0,3 °C</b></div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Tab bar */}
      <div className="tabs">
        <div className="tab active">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="12" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="12" width="7" height="7" rx="1.5"/><rect x="12" y="12" width="7" height="7" rx="1.5"/></svg>
          Übersicht
        </div>
        <div className="tab" onClick={onOpenSleep}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 12.5A6.5 6.5 0 1 1 9.5 5a5 5 0 0 0 7.5 7.5z"/></svg>
          Schlaf
        </div>
        <div className="tab">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-6 4 3 5-7"/></svg>
          Verlauf
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Overview });
