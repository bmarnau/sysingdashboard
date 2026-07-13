
# Prompt 2A.5B — API Discovery Framework

Ziel: Statt einer manuellen Registry (`src/__tests__/api/registry/endpoints.ts`) entsteht ein automatisiertes Discovery-Framework, das den echten Buildstand als Wahrheitsquelle nimmt, mit der Registry abgleicht und daraus Inventar, Smoke-/Functional-Reports und Findings erzeugt. Die bestehende Contract-Registry bleibt als **Anreicherungsquelle** (Schemas, Auth-Meta), wird aber nicht mehr als alleiniger Nachweis akzeptiert.

## Kritische Vorbemerkung

Ein echter "Discovery"-Ansatz nur über statische Regex-Analyse ist fragil (die bestehenden tech-debt-Detektoren zeigen die Grenzen). Ich schlage einen **Hybrid** vor: TanStack Vite-Plugin generiert bereits `src/routeTree.gen.ts` — daraus lesen wir alle aktiven Routen deterministisch aus. Ergänzend eine leichtgewichtige AST-Analyse der Route-Dateien (via `@babel/parser`, bereits transitiv vorhanden) für HTTP-Methoden, Middleware, Validatoren. Kein Crawling.

Falls dir das zu schwer erscheint: Alternative wäre eine reine **Konventions-Pflicht** — jede Route exportiert ein `endpointMeta`-Objekt, Discovery liest nur diese Exports. Sauberer, aber invasiver. Sag Bescheid, wenn du das lieber willst.

## Umfang

### Discovery-Engine (`scripts/api-discovery/`)
- `discover.mjs` — Hauptskript: liest `src/routeTree.gen.ts` + parst `src/routes/api/**/*.ts` per AST
- `analyzers/` — je Analyzer eine Datei: `methods`, `middleware`, `validation`, `auth-guard`, `permission`, `correlation`, `logging`
- `exclude.mjs` — harte Liste (`archive/**`, `**/*.test.ts`, `**/__tests__/**`); Verstöße erzeugen Finding
- `enrich.mjs` — merged mit `ENDPOINTS`-Registry (Schemas, Klassifizierung)
- `inventory.mjs` — schreibt `test-report/api-inventory.json` deterministisch (Sort: path, method)

### Smoke-Tests (`src/__tests__/api/smoke/`)
- `smoke.test.ts` — iteriert das Inventar; testet je Endpoint: Erreichbarkeit, akzeptierte Methoden, 405 auf unerlaubte Methode, 400/422 auf ungültiges JSON, leere Payload, falscher Content-Type, Response ist JSON (nicht HTML), keine Stacktraces/Secrets im Body, Correlation-ID-Header
- `writers.guard.ts` — schreibende Endpoints laufen nur gegen In-Memory-Adapter (bestehende MSW-Testinstanz), Azure-Live nur bei `AZURE_TEST_LIVE=true`
- Reporter schreibt `test-report/api-smoke-report.json`

### Functional-Report (`src/__tests__/api/functional/`)
- `functional.test.ts` — aggregiert bestehende Runner-Tests + neue Szenarien (Auth-Negativ, Scope, Idempotenz wo anwendbar)
- Bewertung je Endpoint: `complete | partial | missing | blocked | not-applicable`
- Reporter schreibt `test-report/api-functional-report.json`

### Findings & Severity
- `scripts/api-discovery/findings.mjs` — Kategorien laut Prompt (Critical/High/Medium/Low)
- Merged in bestehendes `scripts/security/security-report.mjs`-Format, damit CI-Gate wiederverwendbar
- Neue Detector-Regel: aktiver Handler importiert aus `archive/**` → Critical

### Self-Tests (`src/__tests__/api-discovery/`)
- Fixtures unter `src/__tests__/api-discovery/fixtures/` mit synthetischen Routen (neu/entfernt/archiviert/multi-method/dynamic-param/no-validation/no-auth)
- Test prüft: JSON-Schema-Validität des Inventars, deterministische Reihenfolge, korrekte Findings

### CI (`ci.yml`)
- Neuer Job `api-discovery` nach `build`:
  1. `bun run api:discover` → Inventar
  2. `bun run test:api:smoke`
  3. `bun run test:api:functional`
  4. `bun run api:report` → Merge-Report + Findings
  5. Upload `test-report/api-*.json` als Artefakte
- Gates: Critical / High-Security / privilegiert-ohne-Auth / Secret-im-Response / Discovery-Error → **blocking**. Fehlende Doku / fehlende Correlation-ID / partial Functional → **warning**.

### Dokumentation (Doku-Sync-Pflicht)
- Neues HelpTopic „API Discovery und Testabdeckung" in `src/lib/help-documentation.ts` (`lastUpdated` heute; `DOCUMENTATION_VERSION` → 1.13.0)
- `docs/API.md`: manuelle Endpoint-Tabelle durch generierten Ausschnitt aus `api-inventory.json` ersetzen (Build-Script rendert Markdown-Tabelle)
- `CHANGELOG.md`: `## 1.34.0 - 2026-07-13`
- ADR-0014: „AST-basierte API-Discovery vs. Konventions-Meta-Export"

## Nicht enthalten (bewusst)
- Kein neuer Auth-Layer — offene SEC-CRIT-001/002 aus v1.33.0 bleiben. Discovery **meldet** sie neu, löst sie nicht.
- Keine Azure-Live-Tests — bleiben hinter `AZURE_TEST_LIVE`-Gate `not-configured`.
- Keine Rate-Limit-Implementierung — nur Reporting.

## Abschlussprüfung (wird am Ende ausgeführt)
`bun run build && bun run api:discover && bun run test:api:smoke && bun run test:api:functional && bun run test:security && bun run docs:check` — Ergebnisliste + Bewertung („bestanden mit Einschränkungen" ist zu erwarten, da SEC-CRIT-001/002 offen bleiben).

## Offene Frage
Willst du den **AST-Hybrid** (mein Vorschlag) oder den strengeren **Konventions-Meta-Export** (jede Route muss `export const endpointMeta = {...}` deklarieren)? Zweiter ist robuster, aber verlangt Änderungen an jeder heutigen und künftigen Route.
