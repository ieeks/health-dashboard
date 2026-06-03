# Changelog

## [V2] — 2026-06-03

### Added
- **V2 Navigation** — `App.jsx` mit `screen: 'home' | 'sleep'`-State; 200%-breiter Track mit
  CSS `transform: translateX(-50%)` Slide-Transition (`.42s cubic-bezier(.5,.05,.2,1)`)
- **`OverviewView.jsx`** — Home/Hub-Screen mit:
  - `GoalRings` — 3 konzentrische SVG-Ringe (Schritte / AZM / Kalorien), Glow, Reveal-Animation
  - `SleepBridge` — Mini-Hypnogramm + Stats, klickbar → Schlaf-Detail
  - `MetricCard` + `Spark` — Schrittzahl, Strecke, Kalorien, AZM mit 24-Bar-Sparklines
  - `HeartCard` — Ruhepuls + HRV, 7-Tage SVG-Polylinien
  - `VitalsList` — SpO₂, Atemfrequenz, Hauttemperatur-Abweichung
  - `TabBar` — fixe Tab-Leiste (Übersicht / Schlaf / Verlauf)
- **Tag-Navigation** — ‹ 1/30 › durch alle gespeicherten Nächte blättern:
  - `useSleepNight` gibt jetzt alle `nights[]` zurück statt nur die neueste
  - `App.jsx` verwaltet `nightIdx`, reicht `night` + `nav`-Objekt als Props durch
  - Schlaf-Detail: Datum-Zeile mit ‹/› Pfeilen unter dem Zeit-Range
  - Übersicht: Schlaf-Brücke zeigt Nacht-Datum + ‹/› im Card-Header
  - Navigation rein client-seitig (einmaliger Firestore-Load)
- **`src/theme/overview.css`** — V2-Viewport-Layout + alle Übersicht-Komponenten-Styles
- **`src/hooks/useActivityData.js`** — liest `health/main/daily/{date}` aus Firestore
- **`scripts/sync.js`** erweitert — zusätzlich zu Sleep jetzt auch Activity-Sync:
  - Versucht 13 Activity-DataType-Varianten (inkl. Aliases wie `calories.expended`, `distance.delta`)
  - Graceful: 404/400/403 → logged + skip, kein Abbruch des gesamten Syncs
  - Aggregiert Tageswerte in `health/main/daily/{date}`
  - 7-Tage-Trends für Ruhepuls + HRV
- **`firestore.rules`** — `health/main/daily/{date}` read public, write nur Admin SDK
- **`SleepView.jsx`** — `onBack`-Prop + Back-Button-Style; Props statt Hook (Daten kommen von App.jsx)
- **`archive/`** — Design-Handoff-Dateien verschoben (sleep-dashboard-claude-code-handoff)

### Fixed (Activity Sync — iterativ ermittelt)
- **HTTP 400 bei allen Activity-Typen** — Ursache: Filter `interval.end_time >= "..."` gilt nur für Sleep.
  Fix: Activity-Endpunkte ohne Filter, Datumsfilterung client-seitig.
- **Kein Daily-Eintrag trotz DataPoints** — Ursache: `p.interval?.endTime` falsch; Struktur ist
  `p[dataType].interval.endTime`. Fix: `p[dataType]?.interval?.endTime` als primärer Pfad.
- **`extractValue` lieferte null** — Ursache: Werte sind Strings, nicht Numbers.
  Bestätigte Felder: `steps.count = "2"`, `distance.millimeters = "1503"` (mm → m via /1000).

### Notes
- Verfügbare Activity-Typen via Google Health Connect (Fitbit Air): **nur `steps` + `distance`**.
  Kalorien, Herz, HRV, SpO₂ etc. synct Fitbit nicht in die Health Connect API.
  Diese Werte zeigen `—` im Dashboard bis eine andere Datenquelle verfügbar ist.
- Datenquelle für steps/distance: `HEALTH_KIT` (iPhone) — die Google Health Connect API
  aggregiert alle verbundenen Quellen; iPhone-Schritte sind valide Daten.
- Scopes für Aktivität bereits im OAuth-Client konfiguriert.

---

## [V1] — 2026-06-03

### Added
- Vite + React Projektgerüst (kein Framework-Overhead, direktes GitHub Pages Deploy)
- `src/theme/tokens.css` — Design-Token-System, Dark (`:root`) + Light (`[data-theme="light"]`)
  - Schlafphasen-Skala: Tief `#4256c4` / Leicht `#4d92d8` / REM `#2fd8ff` / Wach `#e08a3c`
  - Fonts: Hanken Grotesk + Space Grotesk + JetBrains Mono (Google Fonts)
- `src/lib/firebase.js` — Firestore-Client via VITE_ENV (kein Secret im Bundle)
- `scripts/sync.js` — Täglicher Sync: Google Health API → FITBIT-Filter → Firestore upsert
  - Pagination über `nextPageToken`
  - HTTP 500 retry (bekannter API-Bug), bis 3x mit 2s Delay
  - `invalid_grant` abgefangen mit klarer Fehlermeldung + `process.exit(1)`
  - `merge: true` beim Upsert — Wachphasen-Notizen werden nie überschrieben
- `.github/workflows/sync.yml` — Cron 07:00 UTC + `workflow_dispatch`, Node 24
- `.github/workflows/deploy.yml` — Build + Deploy auf GitHub Pages bei Push auf `main`
- `firestore.rules` — read public, write nur Admin SDK; `nightNote` Frontend-Update erlaubt; `wakeNotes` Frontend read/write
- Firebase-Projekt `health-dashboard-ieeks` in `europe-west3` (Frankfurt)
- GitHub Repo `ieeks/health-dashboard` (öffentlich)
- GitHub Pages auf `manuel-app.dev/health-dashboard/`

### Fixed
- Zeitzonen-Bug: `toClock()` zeigte UTC statt Ortszeit (2h Differenz CEST).
  Fix: `new Date(isoString).getTime() + offsetSeconds * 1000` vor UTC-Extraktion
- Node.js 20 Deprecation in GitHub Actions → Node 24 + `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`
