# CLAUDE.md — Personal Sleep Dashboard (Start hier)

Du baust ein persönliches Schlaf-Dashboard. Stack: **React + Vite + Firebase/Firestore + GitHub Actions + GitHub Pages**.
Datenquelle: **Google Health API** (Fitbit Air). Single-User, kein App-Login.

## Bausteine — in dieser Reihenfolge lesen
1. **`health-dashboard-handoff.md`** — die Daten-/Backend-Seite: Auth, API-Endpoint, echtes Sleep-Format, FITBIT-Filter, Firestore-Schema, Sync-Action, Token-Betrieb. **Maßgeblich für alles, was mit Daten zu tun hat.**
2. **`design/README.md`** — die UI-Seite: High-Fidelity-Design beider Screens, finale Varianten, Design-Tokens (CSS-Variablen), Komponenten-Struktur, Interaktionen. **Maßgeblich für Aussehen & Verhalten.** Screenshots in `design/screenshots/`.
3. **`sleep-sample-fitbit.json`** — echte API-Antwort einer Nacht. Parser & Daten-Mapping daran ausrichten.

Die Design-Dateien (`design/*.jsx`, `*.css`, `data.js`) sind **Prototypen zum Nachbauen**, kein Produktivcode. Tokens 1:1 übernehmen, Komponenten in den echten Stack neu bauen (saubere ES-Module statt Babel-im-Browser, Props/API-Client statt `window.SLEEP`).

## V1-Scope — WICHTIG
- **V1 = Schlaf-View vollständig** (Design + echte Sleep-Daten + Wachphasen-Notizen + Sync + Firestore).
- Der Sync zieht in V1 **nur `sleep`** (siehe Daten-Handoff §3). Die Overview-Metriken (Schritte, Herz, Vitalwerte) sind **V2** — dafür gibt es in V1 noch keine Daten.
- Die Overview/Hub-Navigation ist designt, aber in V1 **optional**: Wenn gebaut, dann nur als Shell mit funktionierender **Schlaf-Brücke** (die hat echte Daten); die übrigen Metrik-Cards bleiben klar gekennzeichnete Platzhalter bis V2. Im Zweifel: V1 nur Schlaf-View, Overview ganz auf V2 schieben.

## Daten ↔ Design — die Brücke (hier treffen sich die zwei Handoffs)
Der Design-Prototyp liest aus `data.js` (`window.SLEEP`) mit lokalem State. In der echten App:

| Design-Prototyp | Echte App |
|---|---|
| `window.SLEEP` / `data.js` | Firestore-Lesen (`health/main/sleep/{date}`), gemappt aus echtem API-Format |
| `notes` lokaler State, **Key = Uhrzeit** | Firestore `wakeNotes/{stageStartTime}` — **Key = ISO `stage.startTime`**, nicht die Anzeige-Uhrzeit (stabil, kollisionsfrei) |
| Effizienz-Ring „94 %" | `minutesAsleep / minutesInSleepPeriod` (kein API-Score! siehe Daten-Handoff §5) |
| Hypnogramm-Segmente | `sleep.stages[]` → `type` bestimmt Lane, `startTime/endTime` die Position |
| **Hartes Fenster 22:00–06:30 (`SPAN=510`)** | **Dynamisch aus `interval.startTime/endTime` ableiten** (+ etwas Padding), sonst bricht die Achse bei abweichenden Schlafenszeiten |
| Wachphasen-Liste | `stages.filter(type==="AWAKE")` |
| Achsen-Uhrzeiten | erst den **Zeitzonen-Check** aus Daten-Handoff §4 klären (Z + `startUtcOffset`) |

Konsistenz-Bonus: Die Phasensummen im Design (Tief 1h38 / Leicht 3h42 / REM 1h50 / Wach 25) entsprechen exakt dem Sample (`stagesSummary`: DEEP 98 / LIGHT 222 / REM 110 / AWAKE 25 min). Design und Daten sind also bereits abgeglichen.

## Empfohlene Build-Reihenfolge
1. **Design-Tokens** aus `design/sleep.css` + `design/light-theme.css` in `theme/tokens.css` übernehmen (alles hängt daran).
2. **Sync-Action + Firestore** nach Daten-Handoff §6–8 (Refresh-Flow, FITBIT-Filter, Pagination, `invalid_grant`-Handling). Zeitzonen-Mapping einmal verifizieren.
3. **Schlaf-View-Komponenten** nach `design/README.md` (finale Varianten: Score=Ring, Hypnogramm=Lanes, Notiz=inline) — aber Daten aus Firestore, Notizen nach Firestore.
4. Polish (Motion, Light-Mode, Loading-States).
5. *(V2, später)* Overview-Metriken + zugehörige Scopes/Sync.

## Nicht vergessen (häufige Fehlerquellen)
- Nur `dataSource.platform === "FITBIT"` in Firestore (keine HealthKit-Dubletten).
- Kein Secret im Frontend-Bundle. Token-Betrieb + Plan B: Daten-Handoff §1/§1b.
- Es gibt **keinen** offiziellen Sleep-Score — nur den Effizienz-Proxy, ehrlich gelabelt.
