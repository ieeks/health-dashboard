# Health Dashboard

Persönliches Schlaf-Dashboard für Fitbit Air Daten via Google Health API.
Gehostet auf GitHub Pages, Daten gecacht in Firestore.

**Live:** [manuel-app.dev/health-dashboard](http://manuel-app.dev/health-dashboard/)

## Stack

- **Frontend:** React + Vite → GitHub Pages
- **Datenquelle:** Google Health API (Fitbit Air, `googlehealth.sleep.readonly`)
- **Cache:** Firebase Firestore (`health/main/sleep/{YYYY-MM-DD}`)
- **Sync:** GitHub Action (cron, täglich 08:00 Wien)

## V1 Scope

Schlaf-View vollständig:

- Effizienz-Ring (minutesAsleep / minutesInSleepPeriod)
- Hypnogramm (4 Lanes: Tief / Leicht / REM / Wach)
- Wachphasen mit Freitext-Kommentar
- Phasen-Verteilung vs. 30-Tage-Schnitt
- Dark Mode (Default) + Light Mode (Morgen-Review)

V2 (später): Aktivität, Herz, Vitalwerte.

## Lokale Entwicklung

```bash
# 1. Abhängigkeiten
npm install

# 2. Firebase Config eintragen
cp .env.example .env.local
# .env.local mit Firebase-Werten befüllen (siehe Firebase Console → Projekteinstellungen)

# 3. Dev-Server
npm run dev
```

## GitHub Secrets einrichten

Einmalig im GitHub Repo → Settings → Secrets and Variables → Actions:

| Secret | Woher |
|--------|-------|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Projekteinstellungen → Web-App |
| `VITE_FIREBASE_AUTH_DOMAIN` | " |
| `VITE_FIREBASE_PROJECT_ID` | " |
| `VITE_FIREBASE_STORAGE_BUCKET` | " |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | " |
| `VITE_FIREBASE_APP_ID` | " |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → OAuth 2.0 Client |
| `GOOGLE_CLIENT_SECRET` | " |
| `GOOGLE_REFRESH_TOKEN` | Einmalig via OAuth-Flow generiert |
| `FIREBASE_PROJECT_ID` | `health-dashboard-ieeks` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Console → Service Accounts → JSON generieren |

## Sync manuell auslösen

```bash
# Via GitHub CLI
gh workflow run sync.yml

# Lokal (mit .env.local befüllt)
node scripts/sync.js
```

## Firestore Schema

```
health/main/sleep/{YYYY-MM-DD}        ← API-Daten (Sync schreibt, nie Notizen überschreiben)
  └── wakeNotes/{stageStartTime}      ← { text, createdAt, updatedAt } (Frontend schreibt)
      nightNote: string               ← Freitext ganze Nacht (Frontend schreibt)
```

Tagesschlüssel = lokales Datum der `interval.endTime` (Aufwach-Tag, UTC + Offset).

## Zeitzonen

Alle API-Zeiten sind UTC (`Z`) + separater `startUtcOffset`/`endUtcOffset` in Sekunden.
Lokale Wandzeit = UTC + Offset. Wien = +7200s (CEST) / +3600s (CET).

> Einmalig verifizieren: bekannte Schlafenszeit gegen API-Response prüfen
> (22:32 lokal = 20:32Z bei +7200s → Offset addieren).

## Token-Situation (bis App-Verifizierung durch ist)

App ist in Google-Verifizierung. Solange: Refresh-Token läuft nach 7 Tagen ab (`invalid_grant`).
Der Sync schlägt dann fehl (roter Workflow) — manuell Re-Auth durchführen und neuen
`GOOGLE_REFRESH_TOKEN` als Secret setzen.

Nach erfolgreicher Verifizierung entfällt das.
