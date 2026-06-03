# Architecture Decisions

Entscheidungen die getroffen wurden und warum — damit der Kontext nicht verloren geht.

---

## Auth & Token-Betrieb

**Entscheidung:** Refresh-Token als GitHub Secret, Access-Token wird pro Sync-Lauf frisch geholt.

**Warum:** Access-Token läuft nach 3599s ab — sinnlos zu speichern.
Refresh-Token läuft (solange App im Testing-Modus) nach 7 Tagen ab.
Nach Verifizierung durch Google läuft er nicht mehr ab.

**Konsequenz:** Bis Verifizierung: roter Workflow = Re-Auth nötig.
`GOOGLE_REFRESH_TOKEN` Secret manuell aktualisieren.

**Nicht gebaut:** Plan-B Reconnect-Endpoint (Firebase Function).
Begründung: Overhead zu hoch für 7-Tage-Fenster, App-Verifizierung ist beantragt.
Wird gebaut falls Verifizierung scheitert.

---

## Kein offizieller Sleep-Score

**Entscheidung:** Effizienz-Proxy = `minutesAsleep / minutesInSleepPeriod`, klar als Proxy gelabelt.

**Warum:** Google Health API liefert keinen Score, keine `efficiency`-Feld.
Selbst gerechneter Score wäre irreführend wenn nicht klar kommuniziert.

---

## Nur FITBIT-Daten in Firestore

**Entscheidung:** Hartes Filter auf `dataSource.platform === "FITBIT"` vor jedem Upsert.

**Warum:** API liefert pro Nacht mehrere Quellen (Fitbit Air + alte HealthKit/AutoSleep-Historie).
Ohne Filter: Doppeleinträge, inkonsistente Stage-Daten (HealthKit liefert nur `CLASSIC`, kein `STAGES`).

**Konsequenz:** Firestore-Historie baut sich erst ab Fitbit-Air-Inbetriebnahme auf.

---

## Tagesschlüssel = Aufwach-Tag (endTime lokal)

**Entscheidung:** Firestore-Key = lokales Datum der `interval.endTime`.

**Warum:** `startTime` wäre das Datum an dem man ins Bett geht (meist Vortag).
`endTime` = Aufwachtag ist intuitiver ("Schlaf vom 30. Mai" = Nacht auf den 30.).

**Impl:** `localDateKey(endTime, endUtcOffset)` in `scripts/sync.js`.

---

## Design-Tokens: Dark als Default

**Entscheidung:** Dark Mode ist `:root`, Light Mode ist `[data-theme="light"]`.

**Warum:** Dashboard wird primär morgens nach dem Aufwachen verwendet — da ist
Ambient-Licht noch gering. Dark als Default schont die Augen.
Light Mode ("Morgen-Review") ist opt-in per Toggle.

---

## Hosting: GitHub Pages statt Firebase Hosting

**Entscheidung:** Vite Build → GitHub Actions → GitHub Pages.

**Warum:** Kein Build-Step-Overhead, kein zusätzlicher Service, Deployment-Pipeline
läuft sowieso über GitHub Actions. Firebase Hosting würde einen weiteren Login/Config-Layer bedeuten.

---

## Firestore: read public, keine Auth

**Entscheidung:** Firestore-Regeln erlauben `read: true` ohne Authentifizierung.

**Warum:** Single-User, persönliche Daten, kein sensitiver Inhalt.
Schlafdaten sind nicht finanziell oder medizinisch kritisch.
App-Login würde Komplexität ohne Benefit hinzufügen.

**Sicherung:** Write ist gesperrt (nur Admin SDK / Sync). `wakeNotes` write erlaubt
weil das Gerät des Users das einzige ist das die Seite benutzt.
