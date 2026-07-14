
# Prompt 2A.7 — Performance-, Build- und Betriebsprüfung

Ziel: eine reproduzierbare Betriebsprüfung, die den aktuellen Buildstand misst, Baselines schreibt und Regressionen sichtbar macht — ohne willkürliche Grenzwerte. Analog zu 2A.5B/2A.6: Soft-Gate, JSON+MD-Report, Handbuch-Update.

## Prinzipien

- **Baselines statt Wunschwerte**: Erster Lauf schreibt Referenz (`test-report/ops-baseline.json`), spätere Läufe vergleichen und melden Trend. Kein Fail bei fehlender Baseline.
- **Soft-Gate**: Der Report-Job scheitert nicht am Messwert, nur an echten Fehlern (Build kaputt, Typecheck rot, Playwright-Crash). Hart-Gate ist späterer Bump.
- **Additiv**: keine bestehenden Tests umbauen, keine ADR-Umkehr, keine Änderungen an Produktionscode außer im Systemstatus-Payload (siehe „Betrieb").

## Umfang & Struktur

### 1. Build-Checks (`scripts/ops/build-checks.mjs`)
Aggregiert existierende Prüfungen zu einem Report:
- `bun run build` (prod) + `bun run build:dev` (dev) — Dauer, Exit-Code, Warnings
- `bunx tsgo --noEmit` — TypeScript
- `bun run lint` — ESLint (soft; Ergebnis nur protokollieren)
- `bunx prettier --check .` — Formatierung
- `bun run docs:check`, `bun run check:no-console`, `bun run check:rbac`, `bun run security:check` (bereits vorhanden — hier nur konsolidiert)
Output: `test-report/build-report.{json,md}`

### 2. Bundle-Checks (erweitert `scripts/check-bundle.mjs` → `scripts/ops/bundle-report.mjs`)
- Gesamt/Top-15 (schon vorhanden)
- Neu: Entry-Chunk vs Lazy-Chunks (Vite-Manifest lesen)
- Neu: Doppelte Deps via `bun pm ls --all` + Duplikat-Erkennung (Package-Name+Major)
- Neu: „Schwere Libs im Initial-Bundle" — Heuristik (Regex auf Chunk-Sourcemaps für `xlsx`, `jspdf`, `pdfjs`, `fflate`, `zod`) mit Whitelist
- Neu: Trend gegenüber `test-report/bundle.prev.json` (Diff je Chunk, Gesamt-Delta)
Output: `test-report/bundle-report.{json,md}`

### 3. Performance-Messungen (Playwright, `e2e/perf/*.spec.ts`)
Läuft gegen den Dev-Server (wie bestehende E2E-Specs). Nutzt `performance.mark`/`measure` und `Performance API`.
- `startup.spec.ts` — Navigation Timing (FCP, LCP, TTI-Näherung via `PerformanceObserver`) für `/`
- `dialogs.spec.ts` — Öffnen der schweren Dialoge (Backup, Import/Export, Log Viewer, System Status, Azure) — jeweils Zeit bis interaktiv
- `lists.spec.ts` — 500 Aufgaben/Tätigkeiten seeden via localStorage-Fixture, Render-Zeit messen
- `io.spec.ts` — Import-Preview und Export mit synthetischem Datensatz (500 Zeilen)
- `memory.spec.ts` — `performance.memory` (nur Chromium) vor/nach 20× Dialog-Auf/Zu
Ergebnisse werden in `test-report/perf-raw.json` gesammelt.

### 4. Stabilität (`e2e/stability/*.spec.ts`)
- Dialog-Loop (20× Open/Close, kein Memory-Growth-Guard, nur Zahl protokollieren)
- Benutzerwechsel: Rolle wechseln, prüfen dass UI-Gates konsistent bleiben
- Cross-Tab-Sync: zwei Contexts, `storage`-Event auslösen, State-Konsistenz prüfen
- Reload-Persistenz: Dashboard-Store übersteht F5
- Offline-Simulation: `context.setOffline(true)` → Fehler-Banner erwartet, App bleibt bedienbar
- API-Ausfall: MSW/Route-Interception liefert 500 auf `/api/status` → Systemstatus zeigt Fehler statt Crash
- Speicherausfall: `localStorage.setItem` → QuotaExceeded simulieren
- Lange Sitzung: 10 min Idle + Interaktion (verkürzte Version in CI: 30 s)

### 5. Kompatibilität
- Playwright-Projekte erweitern: `chromium` (bereits), `firefox`, `webkit` als optionale CI-Matrix (webkit nur wenn `RUN_WEBKIT=1`, Standard aus wegen CI-Kosten)
- Viewports: Desktop (1280×800, bereits) + Mobile (`iPhone 13`)-Projekt für die Smoke-Suite (Nav + Dashboard + ein Dialog)

### 6. Betrieb (`e2e/ops/*.spec.ts` + Codeänderung)
- Health: GET `/api/status` → 200, Body enthält `application.mode`, keine Secrets (Regex-Prüfung auf `key`, `token`, `password`, `connectionString`)
- ENV-Validierung: Server-Fn-Aufruf mit fehlender Pflicht-ENV → 500 mit generischer Message (kein Variablenname im Body)
- **Kleine Änderung an `src/routes/api/status.ts`**: sicherstellen, dass `azure.missingEnv` in Prod-Mode nur Booleans/Counts liefert, keine Variablennamen (aktuell werden Namen zurückgegeben — Public-Endpoint, siehe `endpointMeta.public = true`). Neuer Feld `azure.missingEnvCount: number`; `missingEnv[]` nur im Development-Mode. Dokumentiert in Report + Handbuch.
- Rollback-Doku: prüfen, dass `docs/DEPLOYMENT.md` einen Rollback-Abschnitt enthält (statischer Check)
- Backup-Verfügbarkeit: prüfen, dass `BackupService.create()` in Test-Instance ein gültiges ZIP liefert (bereits via `backup/create.test.ts` abgedeckt — hier nur re-verlinkt)

### 7. Report-Aggregator (`scripts/ops/report.mjs`)
- Sammelt: build-report, bundle-report, perf-raw, stability-raw, compat-matrix, ops-checks
- Vergleicht gegen `test-report/ops-baseline.json`, schreibt Diff
- Erzeugt `test-report/ops-report.{json,md}` mit Sektionen: Build / Bundle / Performance / Stability / Compat / Betrieb / Trends / Bekannte Einschränkungen
- Erst-Lauf: schreibt Baseline, meldet „no baseline yet"
- Follow-Läufe: markiert Deltas > 20 % als Warning (nicht Fail)

### 8. CI-Integration (`.github/workflows/ci.yml`)
Neuer Job `ops-check` (nach `build`):
```
- bun run build
- bun run test:ops:build
- bun run test:ops:bundle
- bunx playwright test e2e/perf e2e/stability e2e/ops --project=chromium
- bun run ops:report
- upload-artifact: test-report/
```
Kein hartes Fail außer bei echten Runner-Fehlern.

### 9. package.json
Neue Scripts:
- `test:ops:build`, `test:ops:bundle`, `test:ops:perf`, `test:ops:stability`, `test:ops:compat`, `test:ops:betrieb`
- `ops:report` (Aggregator)
- `test:ops` (alle oben)

### 10. Dokumentation
- `docs/adr/ADR-0016-ops-baselines.md` — Baseline-vs-Threshold-Entscheidung, Soft-Gate-Begründung, Cross-Browser-Matrix (Chromium-Standard, Firefox opt-in, WebKit gated)
- `CHANGELOG.md` v1.36.0
- `src/lib/help-documentation.ts` — neues Topic „Performance-, Build- und Betriebsprüfung" (Kapitel: was gemessen wird, wo Reports liegen, wie Baselines aktualisiert werden), `DOCUMENTATION_VERSION` → 1.15.0
- README-Verweis auf `test-report/ops-report.md`

## Technische Details

### Baseline-Format (`test-report/ops-baseline.json`)
```
{
  "createdAt": "...",
  "build": { "prodMs": 12345, "devMs": 7890, "tscMs": 3456 },
  "bundle": { "totalKB": 850, "entryKB": 220, "topChunks": [...] },
  "perf": { "startupMs": 180, "dialogOpen": { "backup": 45, ... } },
  "stability": { "dialogLoopGrowthKB": 1.2 }
}
```

### Playwright-Perf-Snippet (Beispiel)
```ts
const nav = await page.evaluate(() => JSON.stringify(performance.getEntriesByType("navigation")[0]));
const paint = await page.evaluate(() => performance.getEntriesByType("paint"));
```

### Duplikat-Erkennung
`bun pm ls --all` → parse → `Map<name, Set<major>>` → alle mit `size > 1` sind Duplikate. Whitelist für bekannte Fälle (React DevTools shims etc.).

### Bewusst NICHT im Umfang
- Lighthouse-Integration (extra Toolchain, unproportional für interne Ops-Suite)
- Echte Load-Tests (kein Backend-Zustand, der davon profitiert)
- Bundle-Größen-Hard-Gate (Follow-up nach ≥3 Baselines)

## Bekannte Einschränkungen (im Report gelistet)
- WebKit-Coverage nur opt-in (CI-Kosten)
- `performance.memory` nur Chromium
- Baselines sind maschinenabhängig — CI-Runner-Wechsel verzerrt Trends
- Kein echtes Load-/Stress-Testing

## Abnahmekriterien
- `bun run test:ops` läuft lokal grün durch
- `test-report/ops-report.md` enthält alle 6 Sektionen + Trend
- CI-Artefakt sichtbar
- Handbuch-Topic verlinkt und `docs:check` grün
- ADR-0016 commited
