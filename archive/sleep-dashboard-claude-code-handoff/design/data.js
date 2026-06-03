/* ───────────────────────────────────────────────────────────────
   Schlafdaten — echte Nacht Fr→Sa, 29./30. Mai
   Quelle: sleep-sample-fitbit.json (sleep.stages[], 29 Segmente)
   Fenster-Nullpunkt = 22:00. Zeiten als Anzeige-Wall-Clock.
   ─────────────────────────────────────────────────────────────── */
(function () {
  const WINDOW_START = 22 * 60;     // 22:00
  const WINDOW_END   = 6 * 60 + 30; // 06:30 (nächster Tag) → +24h
  const SPAN = (WINDOW_END + 24 * 60) - WINDOW_START; // 510 min

  function toMin(hhmm) {            // "HH:MM" | "HH:MM:SS" → Min ab 22:00
    const p = hhmm.split(':').map(Number);
    let v = p[0] * 60 + p[1] + (p[2] ? p[2] / 60 : 0);
    if (v < WINDOW_START - 60) v += 24 * 60;   // nach Mitternacht
    return v - WINDOW_START;
  }

  // [type, startClock] — Ende = Start des nächsten Segments
  const POINTS = [
    ['awake', '22:32'],
    ['light', '22:35'],
    ['deep',  '22:43'],
    ['light', '23:00'],
    ['deep',  '23:12'],
    ['rem',   '23:43'],
    ['light', '00:04'],
    ['deep',  '00:18:30'],
    ['light', '00:20'],
    ['deep',  '00:26'],
    ['light', '00:39'],
    ['deep',  '00:44'],
    ['light', '01:14:30'],
    ['rem',   '01:23:30'],
    ['light', '01:56:30'],
    ['deep',  '02:24:30'],
    ['light', '02:29:30'],
    ['awake', '02:33'],
    ['light', '02:38'],
    ['rem',   '03:07'],
    ['light', '03:42:30'],
    ['awake', '04:30'],
    ['light', '04:37:30'],
    ['awake', '04:50'],
    ['light', '04:59:30'],
    ['rem',   '05:22:30'],
    ['light', '05:31:30'],
    ['rem',   '05:54:30'],
    ['light', '06:06'],
  ];
  const FINAL = '06:07';

  // → Segmente mit min-Start/Ende und Dauer
  const SEGMENTS = POINTS.map(([type, clock], i) => {
    const startClock = clock;
    const endClock = i < POINTS.length - 1 ? POINTS[i + 1][1] : FINAL;
    const a = toMin(startClock), b = toMin(endClock);
    return { type, startClock, endClock, start: a, end: b, dur: b - a };
  });

  // Wachphasen (echte Aufwacher) — chronologisch, mit Beispiel-Notiz
  const WAKES = SEGMENTS
    .filter((s) => s.type === 'awake')
    .map((s) => {
      const dur = Math.round(s.dur);
      const t = s.startClock.slice(0, 5);
      return { time: t, dur, start: s.start, end: s.end };
    });
  // Notiz auf den letzten/längsten Aufwacher (04:50 · 10 min)
  const NOTES = { '04:50': 'Kind geweint – kurz aufgestanden' };

  // Phasen-Zusammenfassung (aus summary.stagesSummary)
  const STAGES = [
    { key: 'deep',  label: 'Tief',   min: 98,  count: 6  },
    { key: 'light', label: 'Leicht', min: 222, count: 14 },
    { key: 'rem',   label: 'REM',    min: 110, count: 5  },
    { key: 'awake', label: 'Wach',   min: 25,  count: 4  },
  ];

  const SUMMARY = {
    dateLabel: 'Freitag, 30. Mai',
    startClock: '22:32',
    endClock: '06:07',
    inBedMin: 455,      // minutesInSleepPeriod
    asleepMin: 430,     // minutesAsleep
    awakeMin: 25,
    wakeCount: 4,
    fallAsleepMin: 3,   // 22:32→22:35
    efficiency: Math.floor((430 / 455) * 100), // 94
    // 30-Tage-Vergleich (Demo-Baseline für Vergleichsmarken)
    avg30: { deep: 84, light: 240, rem: 96, awake: 31, efficiency: 90 },
  };

  window.SLEEP = { WINDOW_START, SPAN, toMin, SEGMENTS, WAKES, NOTES, STAGES, SUMMARY };
})();
