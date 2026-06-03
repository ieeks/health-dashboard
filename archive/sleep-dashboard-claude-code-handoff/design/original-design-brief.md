# Design-Brief — Schlaf-View (Hi-Fi) für Claude Design

> **Aufgabe:** Aus dem beigefügten Lo-Fi-Wireframe (`sleep-view-wireframe.html`) eine **Hi-Fi-Designvorlage**
> machen. Ein einzelnes, in sich geschlossenes **HTML-File**, **mobile-only**, **Dark-Mode**.
> Es geht NICHT um Funktion/Daten — nur um Look & Feel, Typo, Farbe, Hierarchie, Motion.
> Output dient als visuelle Vorlage, die anschließend in React/Vite umgesetzt wird.

---

## Was FIX ist (Struktur nicht umwerfen)
Die fünf Sektionen aus dem Wireframe bleiben in dieser Reihenfolge — bitte nur visuell ausgestalten:
1. **Header** — Datum + Nacht-Range groß (`23:14 → 06:42`) + Sub-Zeile (geschlafen / im Bett)
2. **Score-Card** — eine Kennzahl dominant + 3 Sekundärwerte (Wachzeit, Aufwacher, Einschlafdauer)
3. **Hypnogramm** — Phasen-Timeline über die Nacht (Wach / REM / Leicht / Tief), Schlüssel-Visualisierung
4. **Wachphasen-Liste** — antippbare Einträge (Zeit · Dauer) mit Freitext-Notiz
5. **Phasen-Verteilung** — Anteile je Phase + Platz für 30-Tage-Vergleich

---

## Aesthetik-Richtung
- **Mood:** nächtlich, ruhig, präzise. Kein verspieltes Consumer-Bunti — eher „kalibriertes Instrument".
  Referenz-Vibe: Apple-Fitness-Übersicht (Card-Grid, große Werte), aber eigenständig.
- **Dark-Mode**, tiefer neutraler bzw. leicht blaustichiger Hintergrund (kein reines #000).
- **iOS-Tile-Sprache:** Cards mit `border-radius: 20px`, dezente Tiefe statt harter Schatten.
- **Farbsystem (Vorschlag, gern verfeinern):**
  - Primär-Akzent **Cyan `#00d2ff`** (kühl = Schlaf)
  - **Warmer Akzent (Terracotta/Amber, Richtung `#c98a3a`/`#c44b28`)** ausschließlich für **Wach/Störung** —
    das ist der eine Punkt, der aus der kühlen Palette herausstechen darf.
  - Idee Phasen-Skala kühl→warm: Tief = tiefes Indigo/Blau, Leicht = mittleres Blau, REM = Cyan/Türkis, Wach = warmer Akzent.
- **Typografie:** distinktiv, nicht Inter/Roboto/Arial. Große Zahlen brauchen Charakter (Display-Schnitt
  mit guter Tabular-Figures-Eignung); Fließtext ruhig und sauber. Zahlen sind die Helden.
- **Motion:** ein gut orchestrierter Page-Load (gestaffeltes Reveal der Cards), das Hypnogramm darf
  beim Laden „aufbauen". Subtil, nicht zappelig.

---

## Komponenten-Detail

### Hypnogramm (wichtigste Visualisierung)
- Bitte **zwei Varianten** durchspielen und die stärkere ausarbeiten:
  - **A:** liegende Phasen-Blöcke auf 4 Lanes (wie im Wireframe)
  - **B:** durchgehende **Stufenlinie/Area** über die Nacht (eine Linie, die zwischen den Tiefen springt)
- Zeitachse unten (`23:00 … 07:00`).
- **Wach-Segmente** sind visuell die Stars: warm akzentuiert, klar als „antippbar" lesbar (Marker/Glow/Puls).
- Mikro-Wachphasen optional dezenter darstellen als echte Aufwacher.

### Score-Card
- **Zwei Varianten:** (A) große Zahl wie im Wireframe, (B) **Ring/Arc** um die Zahl.
- **Bestätigt: Die API liefert KEINEN offiziellen Sleep-Score.** Angezeigt wird die selbst gerechnete
  **Effizienz** (`minutesAsleep / minutesInSleepPeriod`) bzw. ein klar als solcher gekennzeichneter Proxy.
  Also **kein** „offizieller Score"-Look — ehrlich „Effizienz" labeln, nüchtern. Sekundärwerte klar untergeordnet.

### Wachphasen-Liste + Notiz
- Einträge als ruhige Zeilen; vorhandene Notiz als Zitat/Snippet sichtbar, leere als dezenter „+ Notiz".
- Eingabe: **Bottom-Sheet** (slide-up) ODER inline-expand — bitte beide andenken, das elegantere zeigen.
  Sheet mit Textarea + Speichern/Abbrechen, dark, abgerundet oben.

### Phasen-Verteilung
- Balken oder Donut — was im Dark-Mode ruhiger wirkt. Platz für eine **30-Tage-Vergleichslinie/-marke**.

---

## Beispieldaten (zum Rendern verwenden — ECHTE Nacht aus `sleep-sample-fitbit.json`)
- Nacht: **Fr→Sa, 29./30. Mai**, `22:32 → 06:07` (Anzeige-Zeiten; Offset-Detail klärt der Code)
- **7 h 35 min im Bett**, **7 h 10 min geschlafen** (minutesAsleep 430 / minutesInSleepPeriod 455)
- **Effizienz ≈ 94 %** (430/455), Wachzeit **25 min**, **4 Aufwacher**
- Aufwacher: `22:32 · 3 min`, `02:33 · 5 min`, `04:30 · 7 min`, `04:50 · 10 min` (einem davon eine Beispiel-Notiz „Kind geweint" geben)
- Phasen: Tief **98 min** · Leicht **222 min** · REM **110 min** · Wach **25 min**
- ⚠️ **Wichtig fürs Hypnogramm:** eine echte Nacht hat **~29 Phasen-Segmente** (viele kurze Wechsel),
  nicht nur ~16. Bitte mit dieser Dichte rendern, damit die Darstellung bei echten Daten nicht gequetscht wirkt.
  Die volle Segment-Liste liegt in `sleep-sample-fitbit.json` → `sleep.stages[]`.

---

## Deliverable
- **1 HTML-File**, mobil (≈390 px Frame ok), Dark-Mode, self-contained.
- CSS-Variablen für Farben/Radien/Spacing (damit Übernahme in React leicht ist).
- Keine externen Daten/Backend, keine localStorage-Nutzung.
- Am Ende kurz die getroffenen Design-Entscheidungen notieren (Hypnogramm A/B, Score A/B, Notiz-Pattern).
