# Handoff: Schlaf-View & Aktivität-Übersicht (Health-Dashboard, mobil)

## Overview
Mobile Health-/Fitness-App (Fitbit-Datenquelle, Google-Health-API). Zwei verbundene
Screens für ~390 px Breite, Dark-Mode als Default + optionaler heller „Morgen-Modus":

1. **Schlaf-View (Detail)** — Auswertung einer Nacht: Effizienz, Hypnogramm (Schlafphasen
   über Zeit), antippbare Wachphasen mit Notizfunktion, Phasen-Verteilung vs. 30-Tage-Schnitt.
2. **Aktivität-Übersicht (Home/Hub)** — Tagesziele, Schlaf-Brücke (→ Detail), Aktivitäts-
   Metriken, Herz-Trends, nächtliche Vitalwerte.

Die finale Richtung ist **V2**: Home-Übersicht ist der Hub, die Schlaf-View ist ein
Detail-Screen, der über die Schlaf-Brücke oder den „Schlaf"-Tab geöffnet wird.

## About the Design Files
Die Dateien in diesem Bundle sind **Design-Referenzen, erstellt in HTML/CSS/React-JSX
(via Babel-Standalone im Browser)** — Prototypen, die Aussehen und Verhalten zeigen, **kein
produktiver Code zum direkten Übernehmen**. Aufgabe ist, diese Designs in der bestehenden
Umgebung des Zielprojekts **nachzubauen** (z. B. React + Vite, das angepeilte Setup) mit
dessen etablierten Patterns, Komponenten und Libraries. Falls noch keine Umgebung existiert,
das passendste Framework wählen und dort umsetzen.

Die JSX nutzt globale `window`-Zuweisungen und einen Babel-Browser-Transpiler nur zu
Prototyp-Zwecken — in der echten App durch saubere ES-Module/Imports ersetzen.

## Fidelity
**High-fidelity (hifi).** Finale Farben, Typografie, Spacing, Radien, Motion und
Interaktionen sind festgelegt und sollten möglichst exakt nachgebaut werden. Alle
Design-Werte liegen als CSS-Variablen vor (siehe Design Tokens) und sind 1:1 übertragbar.

---

## Screens / Views

### 1. Schlaf-View (Detail-Screen)
**Purpose:** Nutzer reviewt seinen Schlaf der letzten Nacht und kann zu Wachphasen Notizen
hinterlegen (z. B. „Kind geweint").

**Layout:** Vertikaler Scroll-Screen, 390 px breit. Fixe Statusleiste oben, darunter ein
scrollbarer Body (`padding: 16px 20px 96px`, `display:flex; flex-direction:column; gap:16px`).
Reihenfolge der Sektionen (fix):

1. **Header** — Zurück-Nav („‹ Übersicht"), große Nacht-Range, Sub-Zeile.
2. **Score-Card** — Effizienz + sekundäre Kennzahlen.
3. **Hypnogramm-Card** — die Schlüssel-Visualisierung.
4. **Wachphasen-Card** — antippbare Liste mit Inline-Notiz.
5. **Phasen-Verteilung-Card** — Stacked-Bar + Zeilen mit Ø-Vergleichsmarken.
6. **Fußnote** — Erklärung des Effizienz-Proxys.

**Komponenten:**

- **Header**
  - Nav-Zeile: 13 px, Farbe `--ink-2`, Chevron-links (15 px). Klickbar → zurück zur Übersicht.
  - Range: `--font-display` (Space Grotesk) 600, **36 px**, `letter-spacing:-1.5px`,
    `tabular-nums`. Format `22:32 → 06:07`; der Pfeil `→` in `--cyan`, 27 px.
  - Sub-Zeile: 12,5 px `--ink-2`, `white-space:nowrap`. Inhalt: **„7 h 10 min geschlafen ·
    7 h 35 im Bett"**. Der erste Wert (`b`) in `--ink`.

- **Score-Card (finale Variante = „B", Ring)**
  - Card: `--surface`, 1 px Border `--surface-line`, `border-radius:20px`, `padding:20px`,
    Schatten `--shadow-card`.
  - Card-Header: Label „ÜBERSICHT" (12 px, uppercase, `letter-spacing:.12em`, `--ink-2`) +
    Meta „FITBIT · Stufen" (12 px mono, `--ink-dim`).
  - **Ring:** SVG 116×116, r=50, `stroke-width:9`. Hintergrund-Ring `rgba(150,180,230,.10)`,
    Vordergrund `--cyan` mit `drop-shadow(0 0 6px rgba(47,216,255,.45))`, `stroke-linecap:round`,
    gefüllt nach `efficiency/100` (94 %). Anim: `stroke-dashoffset` 1,2 s `cubic-bezier(.22,.61,.36,1)`.
    Zentriert: Wert 34 px display 600 (mit `%` in 15 px `--cyan`) + Label „EFFIZIENZ" (10 px uppercase).
  - **Sekundär-Kennzahlen** (rechts, `gap:14px`): „Wach 25 min" (Wert in `--warm`),
    „Aufwacher 4×", „Eingeschlafen in 3 min". Werte: display 19 px 500.
  - *(Alt-Variante „A" = große Zahl statt Ring; im Canvas zum Vergleich vorhanden.)*

- **Hypnogramm-Card (finale Variante = „A", Lanes)**
  - 4 horizontale Lanes, oben→unten: **Wach, REM, Leicht, Tief** (`LANE_ORDER`). Lane-Höhe 30 px.
  - Jede Lane: Label links (42 px, 10 px uppercase `--ink-2`) + Track. Track-Mittellinie:
    1 px `rgba(150,180,230,.07)`.
  - **Segmente** (absolute Blöcke): Höhe 13 px, `border-radius:4px`, `left`/`width` aus
    Zeitanteil am Fenster (22:00–06:30, `SPAN=510min`). Farben: Tief `--ph-deep`,
    Leicht `--ph-light`, REM `--ph-rem` (mit Glow `0 0 8px rgba(47,216,255,.35)`).
  - **Wach-Segmente:** Höhe 19 px, Verlauf `--warm → --warm-deep`, Glow + 1 px Ring,
    `cursor:pointer`, `z-index:2`. Wach-Blöcke ≥ 5 min haben einen pulsierenden Ring
    (`@keyframes pulse`, 2,4 s). Tap öffnet die Notiz für diese Wachphase.
  - **Riser-Linien:** dünne vertikale 1 px Verbinder zwischen aufeinanderfolgenden Phasen
    (SVG-Overlay, `rgba(150,180,230,.16)`, `vectorEffect:non-scaling-stroke`).
  - **Achse:** unter den Lanes, Ticks 22:00 / 00:00 / 02:00 / 04:00 / 06:00 (10 px mono `--ink-dim`).
  - **Legende:** über den Lanes, 4 Einträge mit 9×9-Swatch.
  - Reveal-Animation: jedes Segment skaliert von `scaleX(0)`→`scaleX(1)` (transform-origin links),
    gestaffelt nach Startzeit; Riser blenden danach ein.
  - *(Alt-Variante „B" = durchgehende Stufenlinie/Area mit Gradient-Stroke + Wach-Marker als
    Sterne; im Canvas vorhanden, in `sv-hypnogram.jsx` als `HypnoStep`.)*

- **Wachphasen-Card (finale Variante = „inline")**
  - Card-Header: „● Wachphasen" (Bullet in `--cyan`) + Meta „antippen für Notiz".
  - Liste (`gap:8px`). Jede Zeile (`.witem`): `padding:12px 14px`, `border-radius:14px`,
    Hintergrund `--surface-hi`, 1 px Border `--surface-line`, `cursor:pointer`.
    Hover: Hintergrund/Border warm getönt. Active: `scale(.99)`.
    - Links: Tick-Punkt 9 px `--warm` mit `box-shadow:0 0 0 4px --warm-soft`.
    - Mitte: Zeit (display 16 px 500, `tabular-nums`, `nowrap`) + Dauer (12 px mono `--warm`).
      Darunter Notiz-Text — vorhanden: kursiv `--ink` in „…"-Anführungszeichen; leer:
      „keine Notiz hinterlegt" `--ink-2`.
    - Rechts: CTA „bearbeiten ›" bzw. „+ Notiz" (`--cyan`).
  - **Inline-Editor** (`.winline`): unter der geklickten Zeile, animiert `max-height` 0→180px +
    Opacity. Enthält `<textarea>` (min-height 96 px, Fokus-Border `--cyan` + 3 px Glow) und
    Buttons „Abbrechen" (ghost) / „Speichern" (primary, `--cyan` auf dunklem Text).
  - Echte Wachphasen: **22:32 (3 min), 02:33 (5 min), 04:30 (7 min), 04:50 (10 min)**.
    Vorbelegte Notiz auf 04:50: „Kind geweint – kurz aufgestanden".
  - *(Alt-Pattern = Bottom-Sheet statt Inline; im Canvas + als `Sheet` in `sv-sleepview.jsx`.)*

- **Phasen-Verteilung-Card**
  - **Stacked Bar:** Höhe 14 px, `border-radius:999px`, Segmente Tief/Leicht/REM/Wach nach
    Minutenanteil, Anim `width` 1 s.
  - **Zeilen** (je Phase): Grid `16px 70px 1fr auto`. Swatch + Name + Meter (6 px Höhe,
    Track `rgba(150,180,230,.08)`, Füllung in Phasenfarbe) + Wert (mono 12 px).
    Im Meter eine **Ø-Marke** (1,5 px vertikaler Strich + „Ø"-Label) für den 30-Tage-Schnitt.
  - Werte: Tief **1 h 38**, Leicht **3 h 42**, REM **1 h 50**, Wach **25 min**.
  - Fußzeile: „— Ø = 30-Tage-Schnitt".

- **Fußnote:** 11,5 px `--ink-dim`, linker 2 px Border. Text erklärt, dass „Effizienz" =
  geschlafen ÷ im Bett (430 ÷ 455 min) ist und die Fitbit-API **keinen** offiziellen
  Sleep-Score liefert → ehrlicher Proxy, kein erfundener Score.

### 2. Aktivität-Übersicht (Home/Hub)
**Purpose:** Einstiegsscreen; Tagesüberblick + Sprung in die Schlaf-Detail-View.

**Layout:** Wie Schlaf-View aufgebaut (Statusleiste + Scroll-Body), zusätzlich fixe **Tab-Bar**
unten (`position:absolute; bottom:0`). Body-`padding-bottom:110px` wegen Tab-Bar.

**Komponenten (Reihenfolge):**
1. **Header:** „Übersicht" (display 30 px 600) + Datum „Samstag, 30. Mai" + Avatar-Kreis „MK"
   (38 px, Verlauf `--ph-light → --ph-deep`).
2. **Tagesziele-Card:** 3 konzentrische Ringe (r=42/31/20, `stroke-width:8.5`) für
   **Schritte / Active Zone Min / Kalorien**, je mit Glow. Daneben Key-Values:
   „Schritte 8.381 / 10.000", „Active Zone Min 42 / 30", „Kalorien 816 / 1.010".
   *(Hinweis: Fitbit-Ziele — nicht Apples Bewegen/Trainieren/Stehen.)*
3. **Schlaf-Brücke-Card** (klickbar → Detail): groß „7 h 10 min", Sub „22:32 → 06:07 · 94 % ·
   4 Aufwacher", darunter ein **Mini-Hypnogramm** (kompakte Phasen-Balken). Chevron rechts,
   wandert bei Hover + färbt sich `--cyan`.
4. **Metrik-Grid (2×2):** Karten „Schrittzahl 8.381", „Strecke 7,94 km", „Kalorien 816 kcal",
   „Active Zone Min 42 min". Jede mit Titel + Chevron, „Heute", großem Wert, **Sparkline**
   (24 Bars, Tagesverlauf, Peaks `--cyan`) und Achse 00/06/12/18.
5. **Herz-Card (7 Tage):** zwei Spalten — „Ruhepuls 54 bpm" (Trendlinie `--warm`),
   „HRV 48 ms" (Trendlinie `--cyan`).
6. **Vitalwerte-Card (über Nacht):** Liste „SpO₂ 97 %", „Atemfrequenz 14,2 /min",
   „Hauttemp.-Abw. −0,3 °C", je mit Kontext-Label.
7. **Tab-Bar:** Übersicht (aktiv) / Schlaf / Verlauf. Aktiv-Farbe `--cyan`. „Schlaf" navigiert
   zum Detail; „Verlauf" aktuell Platzhalter (Deko).

---

## Interactions & Behavior

- **V2-Navigation (Hub → Detail):** `AppV2` hält State `screen: 'home' | 'sleep'`. Zwei Panes
  liegen in einem 200 % breiten Track nebeneinander; der Wechsel animiert die **`left`**-
  Eigenschaft des Tracks (0 → −390 px), Transition `left .42s cubic-bezier(.5,.05,.2,1)`.
  - **Wichtig:** Nicht `transform: translateX(%)` für diesen Slide verwenden — in der
    Prototyp-Engine blieb eine prozentuale `transform`-Transition bei 0 hängen. Pixel-`left`
    (oder pixel-`translateX`) funktioniert zuverlässig. In React/echtem Browser ist `transform`
    grundsätzlich ok; falls ein Slide nicht animiert, auf Pixelwerte statt Prozent umstellen.
  - Brücke/„Schlaf"-Tap → `screen='sleep'`. Back-Nav im Header → `screen='home'`.
- **Notiz erfassen:** Tap auf Wach-Segment (Hypnogramm) **oder** Wachphasen-Zeile → Inline-Editor
  öffnet unter der Zeile (finale Variante). Speichern schreibt in lokalen `notes`-State
  (Key = Uhrzeit). *(Alt: Bottom-Sheet, slide-up `translateY(100%)→0`, mit Overlay-Blur.)*
- **Page-Load-Motion:** Cards staffeln rein (`opacity`+`translateY(14px)`, je +90 ms);
  Hypnogramm baut sich Segment-für-Segment auf; Ringe/Meter/Stacks animieren ihre Füllung.
  Alle Reveals nutzen ein `requestAnimationFrame`-Gate (`useReveal`).
- **Hover/Active:** Wachphasen-Zeilen (warm), Brücke-Chevron (verschiebt + `--cyan`),
  Buttons (Helligkeit/Farbe).

## State Management
- `AppV2`: `screen` (`'home' | 'sleep'`).
- `SleepView`: `notes` (Map Uhrzeit→Text, init aus `SLEEP.NOTES`), `sheetWake` (aktive Wachphase
  fürs Sheet), `inlineKey` (welche Zeile inline offen ist). Ein `draftRef` aufs Textarea.
- Theme: Prop `theme: 'dark' | 'light'` an `SleepView`/`Overview`/`AppV2`. Im echten Code als
  `data-theme`-Attribut / Context lösen — Light überschreibt nur Tokens (siehe `light-theme.css`).
- Datenzugriff im Prototyp über `window.SLEEP` (aus `data.js`); in der App durch echten
  API-Client / Props ersetzen.

## Design Tokens
Vollständige Definition in `sleep.css` (`:root`), Light-Overrides in `light-theme.css`
(`.screen.light`). Kernwerte:

**Farben — Dark**
- Hintergründe: `--bg:#080b12`, `--bg-grad-top:#0c111c`, `--surface:#101725`
- Linien/Flächen: `--surface-line:rgba(150,180,230,.10)`, `--surface-hi:rgba(150,180,230,.045)`
- Text: `--ink:#eef2fb`, `--ink-2:#9aa6be`, `--ink-3:#66718a`, `--ink-dim:#535d76`
- Akzent kühl: `--cyan:#2fd8ff` (+ `--cyan-soft:rgba(47,216,255,.16)`)
- Akzent warm (nur Wach/Störung): `--warm:#e08a3c`, `--warm-deep:#c8532b`, `--warm-soft:rgba(224,138,60,.16)`
- Phasen-Skala kühl→warm: `--ph-deep:#4256c4`, `--ph-light:#4d92d8`, `--ph-rem:#2fd8ff`, `--ph-awake:#e08a3c`

**Farben — Light** (`.screen.light`)
- `--bg:#e9edf5`, `--surface:#ffffff`, Text `--ink:#16203a`/`--ink-2:#586a88`
- Akzente abgedunkelt: `--cyan:#0a8fbf`, `--warm:#cf6a23`
- Phasen: `--ph-deep:#3a4cae`, `--ph-light:#4486cf`, `--ph-rem:#12a7c9`, `--ph-awake:#d2722a`
- Atmosphäre: warmer „Dawn-Glow" oben statt nächtlicher Sternenwäsche.

**Radien:** `--r-card:20px`, `--r-tile:14px`, `--r-pill:999px`
**Spacing:** 4 / 8 / 12 / 16 / 20 / 24 px (`--sp-1`…`--sp-6`)
**Schatten:** `--shadow-card`, `--shadow-soft` (weich, kühl; im Light kühl-grau)

**Typografie** (Google Fonts)
- Display (Zahlen/Headlines): **Space Grotesk** 400–700, `--font-display`. `tabular-nums` für Zahlen.
- Body: **Hanken Grotesk** 400–700, `--font-body`.
- Mono (Achsen/Meta/Zeiten): **JetBrains Mono** 400/500, `--font-mono`.

**Maße:** Screen 390 px breit; V2-Telefon 390×844 mit scrollbarem Body; Hit-Targets ≥ 44 px
(Wachphasen-Zeilen, Buttons).

## Data
Echte Google-Health-/Fitbit-Antwort einer Nacht (29./30. Mai), maskiert: `sleep-sample-fitbit.json`.
Im Prototyp aufbereitet in `data.js` (`window.SLEEP`):
- `SEGMENTS` — 29 Phasen-Segmente (type/start/end/dur), Fenster-Null = 22:00, `SPAN=510`.
- `WAKES` — die 4 echten Aufwacher. `NOTES` — Beispiel-Notiz auf 04:50.
- `STAGES` — Summen je Phase. `SUMMARY` — Range 22:32→06:07, 455 min im Bett, 430 geschlafen,
  Effizienz 94 %, 4 Aufwacher, Einschlafen 3 min, plus `avg30`-Baseline für Ø-Marken.

**Konsistenz-Hinweis:** Home-Brücke und Detail nutzen durchgängig dieselben echten Werte
(7 h 10 · 22:32→06:07 · 94 % · 4 Aufwacher). Das Original-Wireframe nannte abweichende
Beispielzahlen — bewusst auf die echten Daten vereinheitlicht.

## Assets
Keine Bilddateien. Alle Icons sind Inline-SVG (Statusleiste, Chevrons, Tab-Icons,
Herz/Mond-Glyphen) und alle Visualisierungen (Hypnogramm, Ringe, Sparklines, Trends) sind
SVG/DOM aus Daten generiert. Schriften via Google Fonts.

## Files
Geöffnet/lauffähig: **`Schlaf-View Hi-Fi.html`** (Canvas mit allen Varianten — V2 oben,
darunter die A/B-Vergleiche je Komponente + Light-Mode).

- `Schlaf-View Hi-Fi.html` — Einstieg, lädt alle Module, ordnet Varianten auf einem Design-Canvas an.
- `data.js` — echte Schlafdaten als `window.SLEEP`.
- `sleep.css` — Design-Tokens + Grund-Layout (Screen, Statusleiste, Header, Card).
- `sleep-components.css` — Score/Hypnogramm/Wachliste/Verteilung/Sheet + V2-Viewport.
- `overview.css` — Aktivität-Übersicht (Ringe, Brücke, Metrik-Grid, Herz, Vitalwerte, Tab-Bar).
- `light-theme.css` — heller Modus (Token-Overrides auf `.screen.light`).
- `sv-shared.jsx` — Helfer (Zeitformat, Achsen, Phasen-Meta), Statusleiste, Chevron-Icon.
- `sv-hypnogram.jsx` — `HypnoLanes` (Variante A) + `HypnoStep` (Variante B).
- `sv-sleepview.jsx` — Score A/B, Wachliste, Verteilung, Sheet, `SleepView` (komplett).
- `sv-overview.jsx` — `Overview` (Home) inkl. Ringe, Sparklines, Mini-Hypnogramm.
- `sv-appv2.jsx` — `AppV2`: navigierbarer Hub→Detail-Flow.
- `design-canvas.jsx` — nur Präsentations-Wrapper (Pan/Zoom-Canvas); **nicht** Teil des Produkts.
- `sleep-sample-fitbit.json` — Rohdaten-Referenz.
- `original-design-brief.md` — ursprünglicher Design-Brief.

### Empfohlene Komponenten-Struktur (Zielcodebase)
```
SleepView/
  SleepHeader        Score (Ring|Number)   Hypnogram (Lanes|Step)
  WakeList + WakeNoteEditor (inline|sheet)  StageDistribution   EfficiencyFootnote
Overview/
  GoalRings  SleepBridge  MetricCard(+Sparkline)  HeartCard  VitalsList  TabBar
App/  (Routing Home ⇄ SleepDetail)   theme/tokens.css (aus sleep.css + light-theme.css)
data/ (API-Client → ersetzt window.SLEEP)
```
Tokens zuerst übernehmen, dann Komponenten — sie hängen alle an den CSS-Variablen.
