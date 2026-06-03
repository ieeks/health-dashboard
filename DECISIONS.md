# Architecture Decisions

Entscheidungen die getroffen wurden und warum — damit der Kontext nicht verloren geht.

---

## Auth & Token-Betrieb

**Entscheidung:** Refresh-Token als GitHub Secret, Access-Token wird pro Sync-Lauf frisch geholt.

**Warum:** Access-Token läuft nach 3599s ab — sinnlos zu speichern.
Refresh-Token läuft (solange App im Testing-Modus) nach 7 Tagen ab.
Nach Verifizierung durch Google läuft er nicht mehr ab.

**Konsequenz:** Bis Verifizierung: roter Workflow = Re-Auth nötig.
`GOOGLE_REFRESH_TOKEN` Secret via `node scripts/get-refresh-token.js` aktualisieren.

**Nicht gebaut:** Plan-B Reconnect-Endpoint (Firebase Function).
Begründung: Overhead zu hoch für 7-Tage-Fenster, App-Verifizierung ist beantragt.

---

## Kein offizieller Sleep-Score

**Entscheidung:** Effizienz-Proxy = `minutesAsleep / minutesInSleepPeriod`, klar als Proxy gelabelt.

**Warum:** Google Health API liefert kein `efficiency`-Feld und keinen Score.
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

---

## Activity Sync: Graceful Failure bei unbekannten DataTypes

**Entscheidung:** Jeder Activity-DataType wird einzeln abgefragt; HTTP 400/403/404 → skip, kein Abbruch.

**Warum:** Die Google Health Connect REST API v4 hat minimale öffentliche Dokumentation.
Die korrekten DataType-Strings (z.B. `calories` vs. `calories.expended`) sind unsicher.
Ein harter Fehler würde den gesamten Sync abbrechen und auch Sleep-Daten gefährden.
Graceful-Mode ermöglicht iterative Validierung: Logs zeigen welche Strings die API akzeptiert.

**Konsequenz:** Beim ersten Sync-Lauf mit Activity-Scopes in den Logs sichtbar welche
DataTypes verfügbar sind. ACTIVITY_TYPES-Liste in `sync.js` danach ggf. bereinigen.

---

## Tag-Navigation: Client-seitig, einmaliger Load

**Entscheidung:** Alle 30 Nächte werden beim Start einmal aus Firestore geladen;
Navigation (‹/›) ist rein client-seitig über einen Index-State in `App.jsx`.

**Warum:** Alternativen wären lazy loading per Datum oder Echtzeit-Listener.
30 Nächte × ~2 KB/Dokument = ~60 KB — vernachlässigbar.
Sofortige Navigation ohne Netzwerk-Latenz ist die bessere UX.
`App.jsx` als einzige Datenquelle (kein doppelter Firestore-Aufruf in Overview + Sleep).

---

## Activity-Datenquelle: HEALTH_KIT statt FITBIT

**Entscheidung:** Für Activity-Daten (steps, distance) kein Plattform-Filter — alle Quellen akzeptiert.

**Warum:** Fitbit synct Aktivitätsdaten nicht in die Google Health Connect REST API.
Verfügbare Datenquelle ist `HEALTH_KIT` (iPhone). Kein Filter bedeutet: egal woher, Hauptsache Daten.
Für Sleep bleibt der FITBIT-Filter weil HealthKit nur `CLASSIC`-Stages liefert (kein STAGES-Modus).

**Konsequenz:** Steps/Distanz kommen vom iPhone. Kalorien, Herz, SpO₂ etc. sind nicht verfügbar
(Fitbit exposiert sie nicht via Health Connect API) — zeigen `—` im Dashboard.

---

## Activity DataPoint-Struktur (bestätigt 2026-06-03)

**Befund:** Werte leben in `dataPoint[type].fieldName`, nicht in `dataPoint.fieldName`.
Werte sind Strings, nicht Numbers. Einheiten:
- `steps.count` = String (Anzahl Schritte)
- `distance.millimeters` = String → /1000 für Meter

**Warum relevant:** `extractValue()` und der Datumsfilter in `aggregateActivity()` müssen
`p[dataType]?.interval?.endTime` lesen, nicht `p.interval?.endTime`.

---

## V2 Navigation: transform statt left

**Entscheidung:** Slide-Navigation via `transform: translateX(-50%)` auf einem 200%-breiten Track.

**Warum:** Design-Prototyp verwendete pixel-`left` wegen eines Browser-Bugs im Babel-Standalone-Setup.
In React/echtem Browser ist CSS `transform` performanter (GPU-composited, kein Reflow).
`translateX(-50%)` = eine Pane-Breite nach links (Track = 200%, jede Pane = 50%).
