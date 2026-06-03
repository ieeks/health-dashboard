# Changelog

## [Unreleased — V2]

### Added
- **V2 Navigation** — `App.jsx` mit `screen: 'home' | 'sleep'`-State; 200%-breiter Track mit
  CSS `transform: translateX` Slide-Transition (`.42s cubic-bezier(.5,.05,.2,1)`)
- **`OverviewView.jsx`** — Home/Hub-Screen mit:
  - `GoalRings` — 3 konzentrische SVG-Ringe (Schritte / AZM / Kalorien), Glow, Reveal-Animation
  - `SleepBridge` — Mini-Hypnogramm + Stats, klickbar → Schlaf-Detail
  - `MetricCard` + `Spark` — Schrittzahl, Strecke, Kalorien, AZM mit 24-Bar-Sparklines
  - `HeartCard` — Ruhepuls + HRV, 7-Tage SVG-Polylinien
  - `VitalsList` — SpO₂, Atemfrequenz, Hauttemperatur-Abweichung
  - `TabBar` — fixe Tab-Leiste (Übersicht / Schlaf / Verlauf)
- **`src/theme/overview.css`** — V2-Viewport-Layout + alle Übersicht-Komponenten-Styles
- **`src/hooks/useActivityData.js`** — liest `health/main/daily/{date}` aus Firestore
- **`scripts/sync.js`** erweitert — zusätzlich zu Sleep jetzt auch Activity-Sync:
  - Versucht 9 Activity-DataTypes (steps, calories, active_zone_minutes, distance, …)
  - Graceful: 404/400/403 → logged + skip, kein Abbruch
  - Aggregiert Tageswerte in `health/main/daily/{date}`
  - 7-Tage-Trends für Ruhepuls + HRV
- **`firestore.rules`** — `health/main/daily/{date}` read public, write nur Admin SDK
- **`SleepView.jsx`** — `onBack`-Prop für Zurück-Nav in V2; `.sv-back` Button-Style

### Notes
- Activity-DataType-Strings sind Schätzungen (API hat minimale Docs); tatsächliche Feldnamen
  werden beim ersten Sync-Lauf mit den neuen Scopes validiert
- Scopes für Aktivität: `googlehealth.activity_and_fitness.readonly` +
  `googlehealth.health_metrics_and_measurements.readonly` — bei Bedarf Re-Autorisierung nötig

## [Unreleased — V1]

### Added
- Vite + React Projektgerüst (kein Framework-Overhead, direktes GitHub Pages Deploy)
- `src/theme/tokens.css` — Design-Token-System, Dark (`:root`) + Light (`[data-theme="light"]`)
  - Schlafphasen-Skala: Tief `#4256c4` / Leicht `#4d92d8` / REM `#2fd8ff` / Wach `#e08a3c`
  - Fonts: Hanken Grotesk + Space Grotesk + JetBrains Mono (Google Fonts)
- `src/lib/firebase.js` — Firestore-Client via VITE_ENV (kein Secret im Bundle)
- `scripts/sync.js` — Täglicher Sync: Google Health API → FITBIT-Filter → Firestore upsert
  - Pagination über `nextPageToken`
  - HTTP 500 retry (bekannter API-Bug), bis 3x mit 2s Delay
  - `invalid_grant` abgefangen mit klarer Fehlermeldung + process.exit(1)
  - `merge: true` beim upsert — Wachphasen-Notizen werden nie überschrieben
- `.github/workflows/sync.yml` — Cron 07:00 UTC + `workflow_dispatch`
- `.github/workflows/deploy.yml` — Build + Deploy auf GitHub Pages bei Push auf main
- `firestore.rules` — read public, write nur Admin SDK; `nightNote` Frontend-Update; `wakeNotes` Frontend read/write
- Firebase-Projekt `health-dashboard-ieeks` in `europe-west3` (Frankfurt)
- GitHub Repo `ieeks/health-dashboard` (öffentlich)
- GitHub Pages auf `manuel-app.dev/health-dashboard/`
