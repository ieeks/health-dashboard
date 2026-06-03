/* sv-sleepview.jsx — Score (A/B), Wachliste, Verteilung, Sheet, SleepView */

const S = () => window.SLEEP.SUMMARY;

/* ── Score Variante A — große Zahl ── */
function ScoreNum() {
  const s = S();
  return (
    <div className="score">
      <div className="score-num">
        <div className="val">{s.efficiency}<span className="pct">%</span></div>
        <div className="lab">Effizienz <span className="star">＊</span></div>
      </div>
      <div className="kv">
        <div className="row warm"><span className="lab">Wach</span><span className="v">{s.awakeMin}<small> min</small></span></div>
        <div className="row"><span className="lab">Aufwacher</span><span className="v">{s.wakeCount}<small>×</small></span></div>
        <div className="row"><span className="lab">Eingeschlafen in</span><span className="v">{s.fallAsleepMin}<small> min</small></span></div>
      </div>
    </div>
  );
}

/* ── Score Variante B — Ring ── */
function ScoreRing() {
  const s = S();
  const on = useReveal();
  const R = 50, C = 2 * Math.PI * R;
  const off = on ? C * (1 - s.efficiency / 100) : C;
  return (
    <div className="score">
      <div className="score-ring">
        <svg width="116" height="116" viewBox="0 0 116 116">
          <circle className="ring-bg" cx="58" cy="58" r={R} strokeWidth="9" fill="none"/>
          <circle className="ring-fg" cx="58" cy="58" r={R} strokeWidth="9" fill="none"
            strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off}/>
        </svg>
        <div className="ring-center">
          <div className="v">{s.efficiency}<small>%</small></div>
          <div className="c">Effizienz</div>
        </div>
      </div>
      <div className="kv">
        <div className="row warm"><span className="lab">Wach</span><span className="v">{s.awakeMin}<small> min</small></span></div>
        <div className="row"><span className="lab">Aufwacher</span><span className="v">{s.wakeCount}<small>×</small></span></div>
        <div className="row"><span className="lab">Eingeschlafen in</span><span className="v">{s.fallAsleepMin}<small> min</small></span></div>
      </div>
    </div>
  );
}

/* ── Wachphasen-Liste ── */
function WakeList({ notes, mode, openKey, onOpen, onSave, onCancel, draftRef }) {
  const wakes = window.SLEEP.WAKES;
  return (
    <div className="wlist">
      {wakes.map((w) => {
        const note = notes[w.time];
        const open = mode === 'inline' && openKey === w.time;
        return (
          <React.Fragment key={w.time}>
            <div className="witem" onClick={() => onOpen(w)}>
              <div className="tick"><i></i></div>
              <div className="meta">
                <div className="time">{w.time}<span className="dur">{w.dur} min</span></div>
                <div className={'note' + (note ? ' has' : '')}>{note || 'keine Notiz hinterlegt'}</div>
              </div>
              <div className={'cta' + (note ? '' : ' add')}>
                {note ? <>bearbeiten<Chevron size={13}/></> : <>+ Notiz</>}
              </div>
            </div>
            {mode === 'inline' && (
              <div className={'winline' + (open ? ' open' : '')}>
                <textarea ref={open ? draftRef : null} defaultValue={note || ''}
                  placeholder="Was war los? z. B. Kind geweint, Toilette, wach gelegen…"></textarea>
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn ghost" onClick={(e) => { e.stopPropagation(); onCancel(); }}>Abbrechen</button>
                  <button className="btn primary" onClick={(e) => { e.stopPropagation(); onSave(w.time); }}>Speichern</button>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── Phasen-Verteilung ── */
function Distribution() {
  const on = useReveal();
  const stages = window.SLEEP.STAGES;
  const avg = S().avg30;
  const total = stages.reduce((a, s) => a + s.min, 0);
  return (
    <div className="dist">
      <div className="stack">
        {stages.map((s) => (
          <i key={s.key} className={s.key} style={{ width: on ? (s.min / total * 100) + '%' : 0 }}></i>
        ))}
      </div>
      <div className="rows">
        {stages.map((s) => {
          const w = s.min / total * 100;
          const avgPct = (avg[s.key] / total * 100);
          return (
            <div className="drow" key={s.key}>
              <span className="sw" style={{ background: PH[s.key].color }}></span>
              <span className="nm">{s.label}</span>
              <span className="meter">
                <i style={{ width: on ? w + '%' : 0, background: PH[s.key].color }}></i>
                <span className="avg" style={{ left: Math.min(avgPct, 98) + '%' }}></span>
              </span>
              <span className="vv">{fmtHMshort(s.min)}</span>
            </div>
          );
        })}
      </div>
      <div className="foot"><span className="line"></span>Ø = 30-Tage-Schnitt</div>
    </div>
  );
}

/* ── Bottom Sheet ── */
function Sheet({ wake, note, onClose, onSave, draftRef }) {
  return (
    <div className={'overlay' + (wake ? ' on' : '')} onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab"></div>
        <div className="sh-h">
          <h3>Notiz zur Wachphase</h3>
          <div className="sub">{wake ? `${wake.time} · ${wake.dur} min` : ''}</div>
        </div>
        <textarea ref={draftRef} key={wake ? wake.time : 'none'} defaultValue={note || ''}
          placeholder="Was war los? z. B. Kind geweint, Toilette, wach gelegen…"></textarea>
        <div className="row">
          <button className="btn ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn primary" onClick={onSave}>Speichern</button>
        </div>
      </div>
    </div>
  );
}

/* ── Card-Reveal-Wrapper (gestaffelt) ── */
function Reveal({ i = 0, children }) {
  const on = useReveal();
  return (
    <div style={{
      opacity: on ? 1 : 0,
      transform: on ? 'translateY(0)' : 'translateY(14px)',
      transition: `opacity .55s ease ${i * 0.09}s, transform .55s cubic-bezier(.22,.61,.36,1) ${i * 0.09}s`,
    }}>{children}</div>
  );
}

/* ── Vollständige Schlaf-View ── */
function SleepView({ hypno = 'A', score = 'A', noteMode = 'sheet', theme = 'dark', onBack }) {
  const s = S();
  const [notes, setNotes] = React.useState({ ...window.SLEEP.NOTES });
  const [sheetWake, setSheetWake] = React.useState(null);
  const [inlineKey, setInlineKey] = React.useState(null);
  const draftRef = React.useRef(null);

  const openWake = (w) => {
    if (noteMode === 'sheet') setSheetWake(w);
    else setInlineKey((k) => (k === w.time ? null : w.time));
  };
  const saveSheet = () => {
    const v = draftRef.current ? draftRef.current.value.trim() : '';
    setNotes((n) => ({ ...n, [sheetWake.time]: v }));
    setSheetWake(null);
  };
  const saveInline = (time) => {
    const v = draftRef.current ? draftRef.current.value.trim() : '';
    setNotes((n) => ({ ...n, [time]: v }));
    setInlineKey(null);
  };

  const Hyp = hypno === 'A' ? HypnoLanes : HypnoStep;
  const Score = score === 'A' ? ScoreNum : ScoreRing;

  return (
    <div className={'screen' + (theme === 'light' ? ' light' : '')}>
      <StatusBar />
      <div className="body">
        {/* 1 — Header */}
        <Reveal i={0}>
          <div className="hd">
            <div className="nav" onClick={onBack} style={{ cursor: onBack ? 'pointer' : 'default' }}><span className="chev"><Chevron dir="left" size={15}/></span>{onBack ? 'Übersicht' : s.dateLabel}</div>
            <div className="range">{s.startClock}<span className="arrow">→</span>{s.endClock}</div>
            <div className="sub"><b>{fmtHM(s.asleepMin)}</b> geschlafen<span className="dot"></span>{fmtHM(s.inBedMin)} im Bett</div>
          </div>
        </Reveal>

        {/* 2 — Score */}
        <Reveal i={1}>
          <div className="card">
            <div className="card-h"><span className="t">Übersicht</span><span className="meta">FITBIT · Stufen</span></div>
            <Score />
          </div>
        </Reveal>

        {/* 3 — Hypnogramm */}
        <Reveal i={2}>
          <div className="card">
            <div className="card-h"><span className="t">Hypnogramm</span><span className="meta">{window.SLEEP.SEGMENTS.length} Phasen</span></div>
            <Hyp onWake={openWake} />
          </div>
        </Reveal>

        {/* 4 — Wachphasen */}
        <Reveal i={3}>
          <div className="card">
            <div className="card-h"><span className="t"><span className="accent">●</span> Wachphasen</span><span className="meta">antippen für Notiz</span></div>
            <WakeList notes={notes} mode={noteMode} openKey={inlineKey}
              onOpen={openWake} onSave={saveInline} onCancel={() => setInlineKey(null)} draftRef={draftRef} />
          </div>
        </Reveal>

        {/* 5 — Verteilung */}
        <Reveal i={4}>
          <div className="card">
            <div className="card-h"><span className="t">Phasen-Verteilung</span><span className="meta">vs. 30 Tage</span></div>
            <Distribution />
          </div>
        </Reveal>

        <Reveal i={5}>
          <div className="foot-note">
            <b>„Effizienz"</b> = geschlafen ÷ im Bett ({s.asleepMin} ÷ {s.inBedMin} min). Die Fitbit-API liefert keinen offiziellen Sleep-Score — angezeigt wird dieser ehrliche Proxy.
          </div>
        </Reveal>
      </div>

      {noteMode === 'sheet' && (
        <Sheet wake={sheetWake} note={sheetWake ? notes[sheetWake.time] : ''}
          onClose={() => setSheetWake(null)} onSave={saveSheet} draftRef={draftRef} />
      )}
    </div>
  );
}

Object.assign(window, { ScoreNum, ScoreRing, WakeList, Distribution, Sheet, Reveal, SleepView });
