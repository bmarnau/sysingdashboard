# Performance-Optimierung (v1.25.0)

## Kritische Einordnung vorab

Der Prompt schlägt einige Maßnahmen vor, die für diese Codebasis **nicht sinnvoll** sind. Ich weiche bewusst ab und begründe:

- **Virtual Scrolling / `@tanstack/react-virtual`** — **nicht jetzt**. Ich habe nichts gefunden, was regelmäßig >100 sichtbare DOM-Zeilen produziert (Engineers/Projects/Work-Packages sind in der Regel <100). Ohne Messnachweis wäre das Overhead + neue Dependency ohne Nutzen. Aufnahme in ADR als "verworfen bis Messung".
- **`memo` + Custom Equality-Function pauschal** — der ursprüngliche Vorschlag `(prev, next) => prev.task.id === next.task.id` ist **fehlerhaft**: Updates am selben Task würden nie neu rendern. `memo` gezielt nur dort, wo Selector-Hooks bereits Referenzstabilität liefern (Pub-Sub-Store liefert das, ADR-0004).
- **Bundle-Plugin**: `vite-plugin-visualizer` existiert nicht — richtig heißt es **`rollup-plugin-visualizer`** (funktioniert mit Vite). Nur als Dev-Dep + optionales `bun run analyze`-Script, kein Default-Build-Overhead.
- **Lighthouse ≥ 85 als Done-Criteria** — messe ich lokal einmal und dokumentiere den Wert im CHANGELOG. Kein CI-Gate (siehe frühere A11y-Entscheidung: Chrome-Download in CI zu teuer/flaky).

## 1. Lazy-Loading der schweren Dialoge (Haupthebel)

`src/routes/index.tsx` importiert **11 Dialoge eager** (~5000 LOC + `jspdf`, `jspdf-autotable`, `recharts` über `PerformanceReport`). Alle sind hinter Buttons versteckt und werden von den meisten Sessions nie geöffnet.

Umbau auf `React.lazy` + `<Suspense fallback={null}>`:
- `ExportDialog`, `LocalArchiveDialog`, `PerformanceReport`, `WorkingTimeModelsDialog`, `UserManagementDialog`, `UserManualDialog`, `BackupDialog`, `SystemStatusDialog`, `DownloadCenterDialog`, `ImportExportDialog`, `AzureDataDialog`

Rendering-Muster: Suspense-Wrapper **um jeden Dialog einzeln**, damit ein spät geladener Chunk andere Dialoge nicht blockiert. `fallback={null}` genügt — Dialog ist zu = keine UI sichtbar.

Erwartung: Initial-Bundle sinkt spürbar (`jspdf` + `recharts` verlassen den Main-Chunk).

## 2. Bundle-Analyse-Script (opt-in)

- `bun add -D rollup-plugin-visualizer`
- `vite.config.ts`: Plugin nur aktiv wenn `process.env.ANALYZE === "1"`, Output nach `dist/stats.html` (gitignored)
- `package.json`: `"analyze": "ANALYZE=1 bun run build"`
- Kurze Notiz in `docs/ARCHITECTURE.md` § Performance

## 3. Gezielte Memoisierung — nur mit Messnachweis

Ich profile **erst** mit React DevTools (via `bun run dev` + kurzem Playwright-Skript, das die häufigsten Interaktionen anfährt und Render-Counts loggt). Konkrete `memo`-/`useCallback`-Anwendungen erst nach Fund. Keine spekulativen Wraps — die verschlechtern oft mehr, als sie helfen.

**Falls** die Profile-Ergebnisse keine Hotspots zeigen: transparent im CHANGELOG dokumentieren ("keine relevanten Re-Renders gefunden, keine Änderung").

## 4. Nicht-Ziele (explizit ausgeschlossen)

- Kein `@tanstack/react-virtual` (siehe oben)
- Keine Icon-Optimierung (Lucide ist bereits tree-shaked)
- Keine PDF-Bildkompression (aktueller Export enthält keine Rasterbilder)
- Kein `React.lazy` für Route-Komponenten — nur eine Haupt-Route existiert, TanStack macht Route-Splitting bereits automatisch

## 5. Nebenbei-Fix (Hydration-Error)

Der Runtime-Fehler `System-Administrator` vs. `Senior Systems Engineer` in `src/routes/index.tsx:761` ist ein SSR/CSR-Mismatch beim User-Titel — vermutlich `getActiveUser()` liest localStorage bei SSR nicht. Fix: den User-Block in einen client-only Read (via `useHydrated()`-Muster oder `useEffect`-init) verlagern. Ich mache das mit, weil Hydration-Errors React zwingen, den Subtree client-seitig neu zu rendern — das kostet exakt die Performance, die wir optimieren wollen.

## Done Criteria

- ✅ Alle 11 Dashboard-Dialoge lazy geladen
- ✅ `bun run analyze` funktioniert, `stats.html` gitignored
- ✅ Hydration-Mismatch weg (Console clean)
- ✅ Vorher/Nachher Bundle-Größen im CHANGELOG (Main-Chunk kB)
- ✅ Lighthouse-Score lokal einmal gemessen und im CHANGELOG notiert
- ✅ Handbuch-Kapitel `architektur` + `changelog` aktualisiert, `bun run docs:check` grün
- ❌ **Kein** Lighthouse-Gate in CI, **kein** Virtual-Scrolling, **kein** spekulatives `memo`

## Geänderte/neue Dateien (grob)

- `src/routes/index.tsx` — Lazy-Imports + Suspense-Wrapper + Hydration-Fix
- `vite.config.ts` — optionaler Visualizer
- `package.json` — `analyze`-Script + `rollup-plugin-visualizer` (dev)
- `.gitignore` — `dist/stats.html`
- `docs/ARCHITECTURE.md` — Performance-Abschnitt (Lazy-Strategie, Analyze-Script)
- `docs/ADR/0006-no-virtual-scrolling.md` — Kurz-ADR "verworfen bis Messung"
- `docs/ADR/README.md` — Index-Eintrag
- `CHANGELOG.md` v1.25.0
- `src/lib/help-documentation.ts` — `architektur.lastUpdated`

Sag Bescheid, ob (a) der Umfang passt, (b) ich das ADR-0006 wirklich schreiben soll oder ob eine Zeile in ARCHITECTURE.md reicht, (c) der Hydration-Fix mit rein soll oder als eigener Turn.
