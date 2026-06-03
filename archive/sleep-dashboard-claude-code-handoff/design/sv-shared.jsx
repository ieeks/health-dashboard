/* sv-shared.jsx — Helfer, Status-Bar, Icons, Phasen-Meta */

const PH = {
  deep:  { label: 'Tief',   lane: 'Tief',   color: 'var(--ph-deep)'  },
  light: { label: 'Leicht', lane: 'Leicht', color: 'var(--ph-light)' },
  rem:   { label: 'REM',    lane: 'REM',    color: 'var(--ph-rem)'   },
  awake: { label: 'Wach',   lane: 'Wach',   color: 'var(--ph-awake)' },
};
// Lane-Reihenfolge oben→unten (Wach oben, Tief unten)
const LANE_ORDER = ['awake', 'rem', 'light', 'deep'];

function fmtHM(min) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, '0')} min`;
}
function fmtHMshort(min) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, '0')}`;
}
function pctOf(min) { return (min / window.SLEEP.SPAN) * 100; }

// Achsen-Ticks 22:00 … 06:00
const AXIS_TICKS = ['22:00', '00:00', '02:00', '04:00', '06:00'];
function axisLeft(clock) {
  const [h, m] = clock.split(':').map(Number);
  let v = h * 60 + m; if (v < window.SLEEP.WINDOW_START - 60) v += 24 * 60;
  return pctOf(v - window.SLEEP.WINDOW_START);
}

function StatusBar() {
  return (
    <div className="statusbar">
      <span>9:41</span>
      <span className="glyphs">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
          <rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/>
          <rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/>
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.9">
          <path d="M1 4.5 A9 9 0 0 1 15 4.5" strokeWidth="1.4"/>
          <path d="M3.5 7 A5.5 5.5 0 0 1 12.5 7" strokeWidth="1.4"/>
          <circle cx="8" cy="9.5" r="1.1" fill="currentColor" stroke="none"/>
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" opacity="0.5"/>
          <rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor"/>
          <rect x="23" y="4" width="1.5" height="4" rx="0.75" fill="currentColor" opacity="0.5"/>
        </svg>
      </span>
    </div>
  );
}

function Chevron({ dir = 'right', size = 16 }) {
  const d = dir === 'left' ? 'M11 3L5 8l6 5' : dir === 'down' ? 'M3 6l5 5 5-5' : 'M6 3l5 5-5 5';
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  );
}

Object.assign(window, { PH, LANE_ORDER, fmtHM, fmtHMshort, pctOf, AXIS_TICKS, axisLeft, StatusBar, Chevron });
