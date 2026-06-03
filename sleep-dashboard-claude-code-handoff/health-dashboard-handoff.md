# Personal Health Dashboard — Claude Code Handoff (FINAL)

> Ziel: Persönliches Schlaf-Dashboard für die eigenen Fitbit-Air-Daten, gehostet auf GitHub Pages,
> Daten über die **Google Health API**, Cache in **Firestore**.
> **V1 = NUR Schlaf**: Schlaf-Detail inkl. Wachphasen-Timeline mit Freitext-Kommentarfunktion.
> Muster wie die bestehenden Projekte: GitHub Action (cron) zieht Daten → Firestore → React/Vite liest Firestore.
> **Status: Auth + Datenformat sind verifiziert (echter 200-Call gemacht). Keine offenen Blocker mehr.**

## Getroffene Entscheidungen (fix)
- **Single-User** → Firestore-Schema `health/main/...`, KEIN `personId`.
- **Kommentar = reiner Freitext** pro Wachphase (kein Tag-System).
- **V1-Scope = ausschließlich Schlaf.** Aktivität/Herz/Vitalwerte = V2 (Apple-Fitness-Stil).
- **Nur Fitbit-Daten:** beim Sync hart filtern auf `dataSource.platform === "FITBIT"`. Siehe §3 — kritisch.
- **Scopes (alle drei readonly, bereits autorisiert):**
  `googlehealth.sleep.readonly` (V1) · `googlehealth.activity_and_fitness.readonly` (V2) · `googlehealth.health_metrics_and_measurements.readonly` (V2).
  V1 nutzt aktiv nur `sleep.readonly`; die anderen beiden sind schon im Token, damit V2 ohne erneuten Console-Gang läuft.

---

## 1. Auth (VERIFIZIERT, funktioniert)
- Web-Server-OAuth-Client (Authorization Code Flow) liefert Access- **und Refresh-Token**.
- 3 Credentials dauerhaft nötig: **Refresh-Token + Client ID + Client Secret** → alle als **GitHub Secrets**. Access-Token (läuft nach 3599s ab) NICHT speichern; Action holt ihn pro Lauf frisch via Refresh-Token (POST `https://oauth2.googleapis.com/token`).
- Niemals ins Repo/Frontend-Bundle. Secret wurde nach dem Test rotiert (altes war auf Screenshot sichtbar).

### Token-Lebensdauer — wichtig fürs Set-and-forget
- **Testing-Modus + External + Health-Scopes ⇒ Refresh-Token läuft nach 7 Tagen ab** (`invalid_grant`). Production/verifiziert hebt das auf.
- Status aktuell: **App ist in Verifizierung** (Production beantragt). Bis das durch ist, kann der 7-Tage-Ablauf noch greifen.
- ⇒ Sync **muss `invalid_grant` robust behandeln**: abfangen, klar loggen und **benachrichtigen** (z. B. Workflow rot / Mail), damit eine manuelle Re-Autorisierung möglich ist. Nach erfolgreicher Verifizierung sollte Re-Auth entfallen.

### Auth-Härtung (sonst undokumentierte 403/500 vom Data-Plane)
- `access_type=offline` setzen (sonst kein Refresh-Token).
- **NICHT `include_granted_scopes=true`** — sonst werden ggf. alte `fitness.*`-Scopes in den Token gemerged und die Health-API lehnt Mixed-Scope-Tokens mit internem Fehler ab.
- Token darf **nur `googlehealth.*`-Scopes** enthalten (keine legacy `fitness.*`, kein `cloud-platform`, keine Agent-Registry-Scopes).
- `prompt=consent` nur wenn wirklich nötig.

## 1b. Optional — Token-Reconnect (Plan B, NUR falls Verifizierung nicht durchgeht)
Nur relevant, solange die App im **Testing**-Status ist (Refresh-Token läuft alle 7 Tage ab).
Nach erfolgreicher Verifizierung **komplett überflüssig** — dann nicht bauen.
Ziel: die wöchentliche Re-Auth auf „ein Link, ein Klick" reduzieren. Drei Teile:

**1. Refresh-Token in Firestore statt GitHub Secret**
- Ablage z. B. `health/main/secrets` → Feld `googleRefreshToken`.
- Sync liest ihn zur Laufzeit via Firebase Admin SDK (kein GitHub-Secret-Update mehr nötig).
- Nur **Firebase-Service-Account + Google Client Secret** bleiben GitHub Secrets (laufen nicht ab).
- ⚠️ **Security Rules:** dieses Doc/diese Collection für ALLE Client-Zugriffe sperren (nur Admin-SDK). Das Frontend liest es nie — es ist ein Credential.

**2. Reconnect-Endpoint (Firebase Function + Hosting, ~30 Zeilen)**
- `GET /reconnect` → Redirect zu Google OAuth (die 3 readonly-Scopes, `access_type=offline`, **kein** `include_granted_scopes`).
- `GET /oauth/callback` → Code → Token tauschen → neuen `refresh_token` nach Firestore schreiben → simple „✅ verbunden"-Seite.
- Client Secret lebt nur serverseitig in der Function.

**3. Reminder aus dem Sync**
- Bei `invalid_grant`: Lauf als fehlgeschlagen markieren + Benachrichtigung (Mail aus der Action oder GitHub Issue) mit dem Reconnect-Link.
- Optional proaktiv: Consent-Zeitpunkt mitspeichern, ~Tag 6 vorwarnen (Ablauf = 7 Tage ab Consent, nicht ab letzter Nutzung).

Ergebnis: Mail → Link tippen → bei Google „Zustimmen" → Sync läuft weiter. Der Consent-Klick selbst ist **nicht** automatisierbar (Google-Vorgabe); alles drumherum schon.

## 2. Endpoint (VERIFIZIERT)
```
GET https://health.googleapis.com/v4/users/me/dataTypes/sleep/dataPoints?pageSize=25
Authorization: Bearer {accessToken}
Accept: application/json
```
- `sleep` hat **pageSize default = max = 25** → über `nextPageToken` paginieren.
- Sporadische `500 INTERNAL` auf dem sleep-Endpoint sind ein bekannter API-Bug → Retry / `pageSize`/Filter setzen.
- `users/me/identity` braucht einen ANDEREN (Profile-)Scope und ist für V1 irrelevant — ignorieren.
- Filter optional, z. B.: `?filter=sleep.interval.end_time >= "2026-05-29T00:00:00Z"`.

## 3. ⚠️ Multi-Source — der wichtigste Datenpunkt
Die API liefert **pro Nacht mehrere, überlappende dataPoints** aus verschiedenen Quellen:
- `dataSource.platform = "FITBIT"` → der Fitbit Air (Ziel-Quelle)
- `dataSource.platform = "HEALTH_KIT"` (App `com.apple.health…` oder `com.tantsissa.AutoSleep`) → alte Historie

**Hart filtern auf `dataSource.platform === "FITBIT"`.** Nur diese Einträge in Firestore schreiben.
- Damit genau **ein** Eintrag pro Nacht, **kein** `:reconcile` nötig.
- Fitbit liefert immer `sleep.type === "STAGES"` (volle Phasen). Andere Quellen liefern teils `type === "CLASSIC"` (nur asleep/awake, keine Phasen) — fällt durch den Filter ohnehin weg.
- Folge: Historie baut sich **erst ab jetzt** auf (Air ist neu). Akzeptiert.

## 4. Echtes Datenformat (siehe `sleep-sample-fitbit.json`)
Pfad pro Nacht: `dataPoints[].sleep`
- `sleep.type`: "STAGES" (bei Fitbit immer)
- `sleep.interval`: `startTime`, `endTime` (RFC-3339, **mit `Z`**), `startUtcOffset`, `endUtcOffset` (z. B. "7200s")
- `sleep.stages[]`: je `type` ∈ {AWAKE, LIGHT, DEEP, REM}, `startTime`, `endTime` (+ Offsets)
- `sleep.summary`: `minutesInSleepPeriod`, `minutesAsleep`, `minutesAwake`, `minutesToFallAsleep`, `minutesAfterWakeUp`, `stagesSummary[]` (je type → `count`, `minutes`)
- **Zahlen kommen als Strings** ("455") → parsen.
- ⚠️ **Zeitzone:** Zeiten tragen `Z` + separaten `startUtcOffset`. Lokale Wandzeit = UTC + Offset.
  **Einmal gegen eine Nacht mit bekannter Schlafenszeit prüfen**, ob die Anzeige (z. B. „22:32" vs „00:32") stimmt — d. h. ob der Offset zu addieren ist oder die `Z`-Zeit faktisch schon lokal ist. Erst dann das Hypnogramm-Achsen-Mapping fixieren.

## 5. Score — es gibt KEINEN
Das Format enthält **weder `efficiency` noch einen Sleep-Score**. Selbst berechnen:
- Effizienz-Proxy = `minutesAsleep / minutesInSleepPeriod` (Beispiel-Nacht: 430/455 ≈ 94 %).
- Optionaler 0–100-Proxy-Score aus Effizienz + Deep/REM-Anteil + Anzahl/Dauer Wachphasen. Klar als Proxy labeln.

## 6. Feature-Spec V1 — Schlaf
### 6.1 Schlaf-View
- Von–bis (interval start/end, lokal), Gesamtschlaf (minutesAsleep), Zeit im Bett (minutesInSleepPeriod), Wachzeit (minutesAwake)
- Effizienz-Proxy (§5)
- **Hypnogramm** aus `stages[]` (4 Ebenen Wach/REM/Leicht/Tief)
- **Wach-Marker**: `stages.filter(s => s.type === "AWAKE")` → je Start + Dauer, antippbar
- 30-Tage-Kontext aus aggregierten Firestore-Nächten (selbst rechnen; API liefert keinen 30-Tage-Schnitt im dataPoint)

### 6.2 Kommentarfunktion (Firestore, reiner Freitext)
```
health/main/sleep/{YYYY-MM-DD}                              # Nacht (API-Daten, gecacht)
health/main/sleep/{YYYY-MM-DD}/wakeNotes/{stageStartTime}   # { text, createdAt, updatedAt }
health/main/sleep/{YYYY-MM-DD}  → feld: nightNote           # Freitext ganze Nacht
```
- Key = `stage.startTime` der jeweiligen AWAKE-Phase (stabiler Identifier).
- Render = Join API-Wachphasen ⨝ Firestore-Notizen über diesen Key.
- Kommentare schreibt das **Frontend** direkt; **Sync überschreibt Notizen nie** (nur API-Felder upserten).
- Tagesschlüssel = lokales Datum der `interval.endTime` (Aufwach-Tag) — konsistent definieren.

## 7. Sync-Architektur
```
GitHub Action (cron 1×/Tag morgens + workflow_dispatch)
  └─ Node-Skript:
       1. Access-Token via Refresh-Token (GitHub Secret)
       2. GET sleep dataPoints letzte ~3 Tage (pageSize 25, paginieren)
       3. filter platform==="FITBIT"  → normalisieren → Firestore upsert (nur API-Felder)
React/Vite (GitHub Pages): liest Firestore read-only; schreibt nur wakeNotes/nightNote
```

## 8. Build-Reihenfolge (V1)
1. Sync-Skript + GitHub Action (Refresh-Flow, FITBIT-Filter, idempotenter upsert, Pagination, 500-Retry)
2. Zeitzonen-Mapping einmalig verifizieren (§4)
3. Firestore-Schema final
4. Frontend Schlaf-View: Hypnogramm + Wach-Marker + Freitext-Kommentar (Kern zuerst)
5. Polish: mobil, Dark-Mode, Loading-States
→ nach jedem Schritt `DECISIONS.md` / `CHANGELOG.md` / `README.md` aktualisieren.

## 9. Akzeptanzkriterien (V1)
- [ ] Kein Secret im Repo/Frontend.
- [ ] Nur `platform==="FITBIT"` landet in Firestore (keine HealthKit-Dubletten).
- [ ] Schlaf-View: von–bis, Dauer, Effizienz-Proxy, Hypnogramm korrekt aus echten Daten.
- [ ] Jede AWAKE-Phase ist Marker + per Freitext kommentierbar; Kommentar überlebt den nächsten Sync.
- [ ] Sync idempotent; `sleep`-Pagination (25) korrekt; 500-Retry vorhanden.
- [ ] Sync fängt `invalid_grant` ab und benachrichtigt (Token-7-Tage-Ablauf bis Verifizierung durch).
- [ ] Zeitzonen-Anzeige verifiziert.
- [ ] Mobil sauber.

## 10. Referenzdateien
- `sleep-sample-fitbit.json` — echte Response (1 Nacht, FITBIT, User-ID maskiert). Parser daran ausrichten.
- `sleep-view-wireframe.html` — Lo-Fi-Struktur. Hi-Fi-Design kommt separat aus Claude Design.

## 11. V2 (NICHT jetzt)
Aktivität/Herz/Vitalwerte im Apple-Fitness-Stil (Ring-Card + Metrik-Cards mit Tageszeit-Bars).
Schema-Erweiterung dann `health/main/daily/{date}`. Siehe `activity-overview-wireframe.html`.
