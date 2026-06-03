# Changelog

## [Unreleased]

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
