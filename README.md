# Health Dashboard

Persönliches Gesundheits-Dashboard für Fitbit Air Daten via Google Health API.
Gehostet auf GitHub Pages, Daten gecacht in Firestore.

**Live:** [manuel-app.dev/health-dashboard](http://manuel-app.dev/health-dashboard/)

## Stack

- **Frontend:** React + Vite → GitHub Pages
- **Datenquelle:** Google Health API v4 (Fitbit Air)
- **Cache:** Firebase Firestore (`health/main/sleep/` + `health/main/daily/`)
- **Sync:** GitHub Action (cron, täglich 08:00 Wien)

## Features

### V2 (aktuell)

**Übersicht (Home/Hub)**
- Tagesziele: Schritte / Active Zone Min / Kalorien als konzentrische Ringe
  *(Schritte + Distanz live via iPhone/HealthKit; Kalorien/Herz/Vitalwerte zeigen `—` — Fitbit synct diese nicht in Health Connect)*
- Schlaf-Brücke: Mini-Hypnogramm + Stats, klickbar → Detail
- Metrik-Karten: Schrittzahl, Strecke, Kalorien, AZM mit Sparklines
- Herz: Ruhepuls + HRV, 7-Tage Trendlinien
- Vitalwerte: SpO₂, Atemfrequenz, Hauttemperatur-Abweichung

**Schlaf-Detail**
- Effizienz-Ring (`minutesAsleep / minutesInSleepPeriod`)
- Hypnogramm (4 Lanes: Tief / Leicht / REM / Wach)
- Wachphasen mit Freitext-Kommentar (Firestore)
- Phasen-Verteilung vs. 30-Tage-Schnitt
- Tag-Navigation: ‹ 1/30 › durch alle gespeicherten Nächte blättern

**App**
- Slide-Navigation Home ↔ Schlaf-Detail
- Dark Mode (Default) + Light Mode (Morgen-Review)

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
| `GOOGLE_REFRESH_TOKEN` | Einmalig via `node scripts/get-refresh-token.js` |
| `FIREBASE_PROJECT_ID` | `health-dashboard-ieeks` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Console → Service Accounts → JSON generieren |

## OAuth Scopes

Alle drei Scopes müssen beim OAuth-Flow autorisiert sein:

| Scope | Daten |
|-------|-------|
| `googlehealth.sleep.readonly` | Schlafphasen, Effizienz |
| `googlehealth.activity_and_fitness.readonly` | Schritte, Kalorien, AZM, Distanz, Ruhepuls, HRV |
| `googlehealth.health_metrics_and_measurements.readonly` | SpO₂, Atemfrequenz, Hauttemperatur |

## Sync manuell auslösen

```bash
# Via GitHub CLI
gh workflow run sync.yml

# Lokal (mit .env.local befüllt + GOOGLE_* gesetzt)
node scripts/sync.js
```

## Firestore Schema

```
health/main/sleep/{YYYY-MM-DD}        ← Schlafdaten (Sync schreibt)
  └── wakeNotes/{stageStartTime}      ← { text, createdAt, updatedAt } (Frontend schreibt)
      nightNote: string               ← Freitext ganze Nacht (Frontend schreibt)

health/main/daily/{YYYY-MM-DD}        ← Aktivitätsdaten (Sync schreibt)
  steps, calories, azm, distanceM     ← Tageswerte
  restingHr, hrv                      ← Herz (letzter Wert des Tages)
  restingHr7days[], hrv7days[]        ← 7-Tage-Arrays für Trend-Polylinien
  spo2, respiratoryRate               ← Nächtliche Vitalwerte
  skinTempDeviation                   ← vs. Baseline (°C)
```

Schlüssel = lokales Datum der `interval.endTime` (Aufwach-Tag, UTC + Offset).

## Zeitzonen

Alle API-Zeiten sind UTC (`Z`) + separater `startUtcOffset`/`endUtcOffset` in Sekunden.
Lokale Wandzeit = UTC + Offset. Wien = +7200s (CEST) / +3600s (CET).

## Token-Situation (bis App-Verifizierung durch ist)

App ist in Google-Verifizierung. Solange: Refresh-Token läuft nach 7 Tagen ab (`invalid_grant`).
Der Sync schlägt dann fehl (roter Workflow) — manuell Re-Auth durchführen:

```bash
node scripts/get-refresh-token.js
```

Das Script öffnet den Browser, startet einen lokalen OAuth-Server und schreibt
den neuen `GOOGLE_REFRESH_TOKEN` direkt als GitHub Secret.
