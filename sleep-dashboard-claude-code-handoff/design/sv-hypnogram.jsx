/* sv-hypnogram.jsx — Variante A (Lanes) + Variante B (Stufenlinie/Area) */

const LANE_H = 30;

function useReveal(deps) {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return on;
}

function Legend() {
  return (
    <div className="hyp-legend">
      {LANE_ORDER.map((k) => (
        <span className="lg" key={k}><i style={{ background: PH[k].color }}></i>{PH[k].label}</span>
      ))}
    </div>
  );
}

function Axis({ full }) {
  return (
    <div className={'hyp-axis' + (full ? ' full' : '')}>
      {AXIS_TICKS.map((t) => (
        <span key={t} style={{ left: axisLeft(t) + '%' }}>{t}</span>
      ))}
    </div>
  );
}

/* ── Variante A — Lanes ── */
function HypnoLanes({ onWake }) {
  const on = useReveal();
  const segs = window.SLEEP.SEGMENTS;
  const laneY = (type) => LANE_ORDER.indexOf(type) * LANE_H + LANE_H / 2;

  return (
    <div className="hyp">
      <Legend />
      <div className="lanes" style={{ position: 'relative' }}>
        {LANE_ORDER.map((laneKey) => (
          <div className="lane" key={laneKey}>
            <span className="lab">{PH[laneKey].lane}</span>
            <div className="track">
              {segs.filter((s) => s.type === laneKey).map((s, i) => {
                const isWake = s.type === 'awake';
                const bigWake = isWake && s.dur >= 5;
                return (
                  <div
                    key={i}
                    className={'seg ' + s.type + (bigWake ? ' tap' : '')}
                    style={{
                      left: pctOf(s.start) + '%',
                      width: 'max(' + pctOf(s.dur) + '%, 5px)',
                      transform: on ? 'translateY(-50%) scaleX(1)' : 'translateY(-50%) scaleX(0)',
                      transition: `transform .5s cubic-bezier(.22,.61,.36,1) ${0.15 + s.start / window.SLEEP.SPAN * 0.9}s`,
                      opacity: on ? 1 : 0,
                    }}
                    onClick={isWake ? () => onWake && onWake(s) : undefined}
                    title={isWake ? `${s.startClock.slice(0,5)} · ${Math.round(s.dur)} min` : undefined}
                  ></div>
                );
              })}
            </div>
          </div>
        ))}
        {/* Riser-Linien zwischen aufeinanderfolgenden Phasen */}
        <svg
          style={{ position: 'absolute', left: 42, top: 0, right: 0, width: 'calc(100% - 42px)', height: LANE_ORDER.length * LANE_H, pointerEvents: 'none', overflow: 'visible' }}
          preserveAspectRatio="none" viewBox={`0 0 100 ${LANE_ORDER.length * LANE_H}`}
        >
          {segs.slice(0, -1).map((s, i) => {
            const next = segs[i + 1];
            const x = pctOf(s.end);
            return (
              <line key={i} x1={x} y1={laneY(s.type)} x2={x} y2={laneY(next.type)}
                stroke="rgba(150,180,230,.16)" strokeWidth="1" vectorEffect="non-scaling-stroke"
                style={{ opacity: on ? 1 : 0, transition: `opacity .4s ease ${0.4 + s.start / window.SLEEP.SPAN * 0.9}s` }} />
            );
          })}
        </svg>
      </div>
      <Axis />
    </div>
  );
}

/* ── Variante B — Stufenlinie / Area ── */
function HypnoStep({ onWake }) {
  const on = useReveal();
  const segs = window.SLEEP.SEGMENTS;
  const W = 326, H = 132;          // Innen-Zeichenfläche
  const PAD_T = 8, PAD_B = 8;
  const levels = { awake: 0, rem: 1, light: 2, deep: 3 };
  const levelY = (t) => PAD_T + (levels[t] / 3) * (H - PAD_T - PAD_B);
  const xOf = (min) => (min / window.SLEEP.SPAN) * W;

  // Stufen-Pfad bauen
  let d = '';
  segs.forEach((s, i) => {
    const x1 = xOf(s.start), x2 = xOf(s.end), y = levelY(s.type);
    if (i === 0) d += `M ${x1.toFixed(1)} ${y.toFixed(1)}`;
    else { const py = levelY(segs[i - 1].type); d += ` L ${x1.toFixed(1)} ${py.toFixed(1)} L ${x1.toFixed(1)} ${y.toFixed(1)}`; }
    d += ` L ${x2.toFixed(1)} ${y.toFixed(1)}`;
  });
  const areaD = d + ` L ${W} ${H} L 0 ${H} Z`;
  const pathRef = React.useRef(null);
  const [len, setLen] = React.useState(0);
  React.useEffect(() => { if (pathRef.current) setLen(pathRef.current.getTotalLength()); }, []);

  const wakeSegs = segs.filter((s) => s.type === 'awake');

  return (
    <div className="hyp">
      <Legend />
      <div className="hyp-step">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
          <defs>
            <linearGradient id="stepArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ph-rem)" stopOpacity="0.20"/>
              <stop offset="55%" stopColor="var(--ph-light)" stopOpacity="0.14"/>
              <stop offset="100%" stopColor="var(--ph-deep)" stopOpacity="0.05"/>
            </linearGradient>
            <linearGradient id="stepLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--ph-deep)"/>
              <stop offset="50%" stopColor="var(--ph-light)"/>
              <stop offset="100%" stopColor="var(--ph-rem)"/>
            </linearGradient>
          </defs>
          {/* lane guide-lines */}
          {LANE_ORDER.map((k) => (
            <line key={k} x1="0" x2={W} y1={levelY(k)} y2={levelY(k)} stroke="rgba(150,180,230,.06)" strokeWidth="1"/>
          ))}
          <path className="area" d={areaD} fill="url(#stepArea)"
            style={{ opacity: on ? 1 : 0, transition: 'opacity 1s ease .4s' }}/>
          <path ref={pathRef} className="stepline" d={d} stroke="url(#stepLine)"
            strokeDasharray={len || 1} strokeDashoffset={on ? 0 : (len || 1)}
            style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(.4,0,.2,1) .1s' }}/>
          {/* Wach-Marker (Stars) */}
          {wakeSegs.map((s, i) => {
            const cx = xOf((s.start + s.end) / 2), cy = levelY('awake');
            return (
              <g key={i} className="wake-marker" onClick={() => onWake && onWake(s)}
                 style={{ opacity: on ? 1 : 0, transition: `opacity .4s ease ${1.2 + i * 0.12}s` }}>
                <rect x={xOf(s.start)} y={cy - 4} width={Math.max(xOf(s.dur), 4)} height="8" rx="3"
                      fill="var(--warm)" className="wake-glow"/>
                <circle cx={cx} cy={cy} r="3.5" fill="var(--warm)" stroke="#131b2b" strokeWidth="1.5"/>
              </g>
            );
          })}
          {/* lane labels */}
          {LANE_ORDER.map((k) => (
            <text key={k} className="lane-lab" x="2" y={levelY(k) - 5}>{PH[k].lane}</text>
          ))}
        </svg>
      </div>
      <Axis full />
    </div>
  );
}

Object.assign(window, { HypnoLanes, HypnoStep });
