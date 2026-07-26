# Sprint A1 – Compliance Dashboard fertigstellen

## Analyse (Ist-Zustand)

- **Komponente**: `src/components/TechnicalReportDialog.tsx` (~330 Zeilen, monolithisch). Öffnen aus `src/routes/_authenticated/dashboard.tsx` (Servicemenü „Technischer Prüfbericht…").
- **Datenquelle**: `test-report/technical-test-report.json` via `?raw`-Import (Build-Snapshot, ADR-0017). Vergleichsdatei `technical-test-report.prev.json` vorhanden.
- **Statusmodell**: Findings mit `severity`, `category`, `area`, `source (auto|manual)`, `bucket`, `effort`, `accepted`, `status`, `evidence`, `description`, `recommendation`. Report enthält `summary`, `areas`, `diff`, `recommendation`, `identity`.
- **Aktuelle Defizite**:
  - Management-Summary nur als Zeile mit vier Zählern, keine visuelle Gewichtung.
  - Keine Trennung technisch vs. organisatorisch (source auto vs. manual).
  - Nur Severity- und Area-Filter; kein Status-/Kategorie-/Quelle-Filter, keine Suche.
  - Findings als Flat-List, kein Drill-Down (Evidence/Empfehlung nur inline gekürzt).
  - Keine Druckansicht, kein History-Zugriff auf `prev.json`, kein Responsive-Layout unterhalb `sm:` (Tabellen scrollen horizontal, Filter brechen um).
  - Statuslabels/Farben teils Tailwind-Rohfarben statt Design-Tokens.

## Umsetzung

Reine UI-Arbeit in `src/components/TechnicalReportDialog.tsx` + neue Präsentationsmodule unter `src/components/compliance/`. Keine Änderungen an Aggregator (`scripts/technical-report/build.mjs`), keinem Datenmodell, keinem Backend, keinen Tests der Fachlogik.

### 1. Modul-Aufteilung (Wiederverwendbarkeit)

Aufteilen von `TechnicalReportDialog.tsx` in:
- `compliance/ComplianceSummary.tsx` — Management-Kacheln (Gesamtstatus, Empfehlung, Severity-Kacheln mit Icon+Zahl+Label, Quellen-Status-Grid).
- `compliance/ComplianceFilters.tsx` — Filterleiste (Severity, Kategorie, Bereich, Status, Quelle, Volltextsuche).
- `compliance/ComplianceFindingList.tsx` — Liste mit Drill-Down (Accordion-Item pro Finding).
- `compliance/ComplianceFindingDetail.tsx` — aufgeklappte Detailansicht (Beschreibung, Empfehlung strukturiert, Evidence-Block, Komponenten-Chips, Akzeptanz-Info).
- `compliance/ComplianceAreaTable.tsx` — Bereichstabelle, responsiv (Karten <sm, Tabelle ≥sm).
- `compliance/ComplianceDiff.tsx` — Diff-Sektion inkl. Auflistung neu/verschlechtert/behoben (bisher nur Zähler).
- `compliance/ComplianceHistory.tsx` — Vergleich zum vorherigen Report aus `technical-test-report.prev.json?raw`; zeigt Vorgängerversion, Delta pro Severity, Trendpfeile.
- `compliance/ComplianceEmpty.tsx` — Fallback wenn Report fehlt.
- `compliance/types.ts` — `Report`/`Finding`-Typen (aus bestehendem Dialog extrahiert), keine Laufzeitlogik außer `parseReport` und Label-Maps.

`TechnicalReportDialog.tsx` bleibt Container: State (Filter, aktives Tab, aufgeklappte Finding-IDs), Komposition der Bausteine, Dialog-Chrome.

### 2. Management Summary

- Grid `grid-cols-2 md:grid-cols-4` mit vier Severity-Kacheln (CRITICAL/HIGH/MEDIUM/LOW) — Icon, Anzahl offen, Gesamtsumme klein daneben, konsistente semantische Tokens (`--destructive`, `--warning` falls vorhanden, sonst `bg-destructive/10` etc., keine neuen Tokens erfunden).
- Statusband (Gesamtstatus + Empfehlung) als eigene Karte darüber mit Icon-Stripe.
- Quellen-Status als kompakte Chip-Reihe (`security`, `api`, `backup`, `techdebt`, `ops`, `docs`, `manual`) mit farbiger Statuskugel.

### 3. Trennung technisch vs. organisatorisch

Tabs innerhalb der Findings-Sektion:
- **Alle**
- **Technisch** — `source === "auto"` (Scanner-Befunde).
- **Organisatorisch** — `source === "manual"` (aus `manual-findings.json`).
- **Akzeptiert** — `accepted === true` (bisher visuell versteckt).

Tab-Count-Badges nutzen bereits vorhandene Zähler bzw. clientseitige Ableitung — keine neuen Daten.

### 4. Filter

Filterleiste sticky oberhalb der Liste. Zusätzlich zu Severity/Bereich:
- **Kategorie** (`f.category`, dedupliziert)
- **Status** (`f.status`)
- **Bucket/Effort** (`f.bucket`, `f.effort`)
- **Volltextsuche** über `title`, `id`, `description`, `components`
- „Zurücksetzen"-Button
Filter-State lokal (`useState`), nicht persistent — konsistent mit ADR-0017 („kein localStorage als Primärquelle").

### 5. Drill-Down

Bestehende `<li>`-Karte → aufklappbarer Row (`data-state`-Toggle, keine neue Dependency). Detail-View zeigt:
- vollständige Beschreibung/Empfehlung (nicht mehr auf 1 Zeile begrenzt)
- Evidence mit `file`, `reportRef`, direkter Link/Copy-Button (nur clipboard, kein Fetch)
- Komponenten als Badge-Reihe
- Metadaten-Grid (Bucket, Effort, Source, Status, Accepted-Grund)
- Handlungsempfehlung strukturiert: „Empfehlung / Aufwand / Verantwortlichkeit (aus category)".

### 6. Historie

`ComplianceHistory.tsx` liest `technical-test-report.prev.json?raw` (defensiv – falls fehlt: Sektion versteckt). Zeigt Version-vs-Version und Severity-Delta. Kein zusätzlicher Store, keine Persistenz.

### 7. Druckansicht

- Dialog erhält Button „Drucken" → öffnet `window.print()` auf einer print-optimierten Ansicht.
- `@media print`-Regeln in `src/styles.css` (nur ergänzend, tokengebunden): Dialog-Chrome ausblenden, Karten stapeln, Farben in Graustufen mit erhaltenen Severity-Icons, Seitenumbrüche zwischen Sektionen. Kein separater Report-Renderer.

### 8. Responsive

- Dialog-Container: `max-w-4xl` bleibt Desktop, für Tablet `w-[min(96vw,56rem)]`.
- Areas-Tabelle: <sm als Karten-Liste (`grid gap-2`), ≥sm klassische Tabelle. Nutzt Muster aus `responsive-layout-patterns` (grid + `min-w-0` + `shrink-0`, `truncate` für Titel).
- Filterleiste: `flex flex-wrap gap-2` mit `min-w-0`; Selects `w-full sm:w-auto`.
- Findings-Karte: Kopfzeile `grid-cols-[minmax(0,1fr)_auto]` auf Mobile.

### 9. Design-Tokens

Alle Farben auf semantische Tokens umstellen (`text-destructive`, `bg-destructive/10`, `text-muted-foreground`, `bg-secondary/40`, `bg-accent` …). Bestehende Rohfarben (`text-red-600`, `bg-amber-500/15` …) entfernen — Grund: `design-craft`-Regel.

## Architektur

- UI-only. Keine neuen Datenquellen, keine Fetches, keine Fachlogik, kein Store, keine DB-Zugriffe. Datenparsing bleibt reines JSON-Deserialisieren mit Fallback.
- Keine neuen Runtime-Dependencies.
- Keine Änderungen am Servicemenü, am Auth-Flow oder an Reports.

## Qualität

Nach Umsetzung ausführen:
```
bun run lint
bun run typecheck        # tsgo
bun run build            # strikter Modus
bun run test             # vitest (inkl. bestehende Suites)
bun run docs:check
```
Keine bestehenden Tests werden angepasst — Präsentation-Refactor darf keine Regression erzeugen.

## Dokumentation

- `CHANGELOG.md`: neuer Eintrag `## 1.42.0 - <Datum>` mit UI-Refactor Compliance-Dashboard (Summary, Filter, Drill-Down, Historie, Druck, Responsive).
- `src/lib/help-documentation.ts`: HelpTopic „Technischer Prüfbericht" aktualisieren (`lastUpdated`, neue Sektionen Filter/Drill-Down/Druck/Historie).
- `README.md`: kurzer Abschnitt zum Compliance-Dashboard (nur wenn bereits Report-Kapitel existiert; sonst 3-Zeilen-Absatz unter Features).
- `test-report/technical-test-report.md` bzw. `.json` **nicht** manuell ändern — wird beim nächsten Aggregator-Lauf regeneriert.

## Kritischer Hinweis (custom-instruction)

Alternative, die ich verworfen habe: eigene Route `/_authenticated/compliance` statt Dialog. Vorteil wäre Deep-Link/Print-URL, Nachteil ist die Doppelung zur Servicemenü-Einstiegskonvention aller anderen Prüf-Dialoge (Backup, Logs, SystemStatus). Empfehlung: **beim Dialog bleiben**, dafür Druckansicht sauber via `@media print` — falls du Deep-Link willst, sag Bescheid, dann promote ich zur Route (kleiner Zusatzschritt, keine Fachlogik-Änderung).

## Abnahmekriterien-Mapping

- Managementübersicht → Abschnitt 2 (Summary-Karten + Statusband + Quellen-Chips).
- Keine offenen UI-Baustellen → Abschnitte 3–8 (Tabs, Filter, Drill-Down, Historie, Druck).
- Responsive → Abschnitt 8, verifiziert Desktop + Tablet-Breakpoints.
- Keine Duplikate → Modul-Split (Abschnitt 1), Wiederverwendung bestehender Label-Maps.
- Keine Regression → Qualitäts-Pipeline (Build/Typecheck/Lint/Tests) grün, keine Änderungen außerhalb UI/Doku.
