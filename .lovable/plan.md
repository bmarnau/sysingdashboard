
# Plan – Prompt 2A.1: Architektur der zentralen Testinstanz

Ziel: **eine** Testinstanz, die den aktuellen Buildstand des Hauptprojekts prüft – keine Parallelanwendung, keine zweite Codebasis. Aufsatz strikt auf der bestehenden Vitest-/Testing-Library-/vitest-axe-/CI-Infrastruktur.

## Leitentscheidungen

1. **Keine neue Test-Runtime.** Vitest bleibt Runner, `src/__tests__/` bleibt Wurzel. Neue Modi sind Vitest-*Projects* (via `test.projects` in `vitest.config.ts`) mit eigenen `include`/`setupFiles` – kein zweiter Config-Baum.
2. **E2E via Playwright** gegen den bestehenden Dev-Server auf `localhost:8080` (bereits im Repo für Browser-Debugging etabliert). Kein separates Cypress/WebdriverIO.
3. **Isolierte Umgebung** über eine zentrale `src/__tests__/env/test-instance.ts`, die
   - `VITE_TEST_INSTANCE=1` / `NODE_ENV=test` erzwingt,
   - Storage-Präfix auf `test:` umlegt (neuer Namespace in `dashboard-persistence.ts` via bereits vorhandener Injektionspunkt bzw. neuer `getStorageNamespace()` – additive Erweiterung, keine Signaturänderung),
   - eine dedizierte IndexedDB-DB (`sysingdashboard-test`) für `logger.indexeddb.ts` und `export-download-service.ts` verwendet,
   - Fake Timers (`vi.useFakeTimers({ now: '2026-01-01T00:00:00Z' })`) und einen seeded PRNG bereitstellt.
4. **Deterministische Fixtures** unter `src/__tests__/fixtures/` (bestehendes `users.ts`, `activities.ts` erweitern um `projects.ts`, `workpackages.ts`, `assignments.ts`, `azure-responses.ts`).
5. **Azure-Mock zwingend.** `src/lib/azure/azure-service.ts` wird nicht angefasst; stattdessen `src/__tests__/mocks/azure-service.mock.ts` + MSW-Handler unter `src/__tests__/mocks/handlers/`. Ein späterer echter Azure-Testmodus wird über ein Flag `AZURE_TEST_LIVE=1` freigeschaltet – standardmäßig aus, CI blockt.
6. **Bestehender Code bleibt unverändert**, außer zwei minimalen additiven Hooks: Storage-Namespace-Injektion in `store/dashboard-persistence.ts` und IndexedDB-Namensauflösung in `logger.indexeddb.ts` / `export-download-service.ts` (defaultet auf heutigen Namen).

## Testmodi → Vitest-Projects / Playwright-Suites

| Modus                        | Ort                                          | Runner            |
| ---------------------------- | -------------------------------------------- | ----------------- |
| Unit                         | `src/__tests__/lib/**`, `src/__tests__/hooks/**` | Vitest project `unit` |
| Komponenten                  | `src/__tests__/components/**`                | Vitest project `components` (jsdom) |
| Frontend-Integration         | `src/__tests__/integration/**` (bestehend)   | Vitest project `integration` |
| Backend-Integration          | `src/__tests__/backend/**` (neu)             | Vitest project `backend` (node env) |
| API/Endpoint                 | `src/__tests__/api/**` (neu, ruft TSS-Routes über `unstable_dev`-ähnlich; solange nicht verfügbar: Handler-Import + Mock-Request) | Vitest project `api` |
| UI-E2E                       | `e2e/**` (neu)                               | Playwright        |
| Security/RBAC                | `src/__tests__/security/**` + bestehendes `rbac.test.ts`; zusätzlich `scripts/security-check.mjs` und `scripts/check-rbac.mjs` | Vitest + Node-Scripts |
| Import/Export                | `src/__tests__/io/**` (neu, konsolidiert `exports.test.ts`, `import.test.ts`) | Vitest |
| Backup/Restore               | `src/__tests__/backup/**` (neu)              | Vitest |
| Azure-Mock                   | `src/__tests__/azure/**` (neu, MSW)          | Vitest |
| Accessibility                | `src/__tests__/a11y/**` (bestehend)          | Vitest + vitest-axe |
| Performance/Bundle           | `scripts/check-bundle.mjs` (neu, liest `dist/` nach `bun run build`) | Node-Script |
| Doku-/Version                | `scripts/check-docs-sync.mjs` (bestehend)    | Node-Script |
| Technical Debt               | `scripts/check-tech-debt.mjs` (neu: ESLint-Complexity-Report, TODO-Grep, `tsgo --noEmit` Zählung) | Node-Script |
| Regression (Full)            | `bun run test:full` – ruft alle o.g. seriell | Meta-Script       |

## package.json – neue Scripts (additiv, existierende bleiben)

```
test              → vitest run             (alle Vitest-Projects)
test:unit         → vitest run --project unit
test:components   → vitest run --project components
test:integration  → vitest run --project integration
test:backend      → vitest run --project backend
test:api          → vitest run --project api
test:security     → vitest run --project security && bun run rbac:check && bun run security:check
test:a11y         → vitest run --project a11y
test:io           → vitest run --project io
test:backup       → vitest run --project backup
test:azure        → vitest run --project azure
test:e2e          → playwright test
test:perf         → node scripts/check-bundle.mjs
test:docs         → bun run docs:check
test:debt         → node scripts/check-tech-debt.mjs
test:regression   → bun run test && bun run test:e2e
test:full         → bun run lint && bun run test:regression && bun run test:security && bun run test:a11y && bun run test:perf && bun run test:docs
test:report       → node scripts/generate-test-report.mjs   (aggregiert JUnit/JSON in test-report/)
```

## Zentrale Testkonfiguration

- **`vitest.config.ts`**: umstellen auf `test.projects: [...]`; jedes Projekt lädt zusätzlich zu `src/__tests__/setup.ts` den neuen `src/__tests__/env/test-instance.ts`. Coverage-Konfig bleibt bestehen.
- **`src/__tests__/env/test-instance.ts`**: Fake Timer, Storage-Namespace, IndexedDB-Name, Seed-PRNG, `beforeAll`/`afterEach`-Reset (localStorage/sessionStorage/IndexedDB-Wipe).
- **`src/__tests__/mocks/server.ts`**: MSW-Node-Server (`msw` neu als devDependency), zentral in `test-instance.ts` gestartet/gestoppt.
- **`playwright.config.ts`** (neu): `baseURL: http://localhost:8080`, `webServer: { command: 'bun run dev', reuseExistingServer: true }`, Chromium headless, Test-Storage-State-Injection.
- **`e2e/fixtures.ts`**: setzt `localStorage['test:...']` mit deterministischen Rollen/Projekten vor jedem Test.

## Datentrennung (Abnahmekriterium „keine Produktionsdaten“)

- Storage-Präfix `test:` für alle localStorage-Keys.
- IndexedDB `sysingdashboard-test` (Logger, Downloads).
- Azure-Service im Testmodus wirft, wenn `AZURE_TEST_LIVE` nicht gesetzt – garantiert kein Zugriff auf reale Ressourcen.
- Ein Guard in `test-instance.ts` prüft beim Start, dass `import.meta.env.MODE === 'test'` und bricht sonst ab.

## CI-Integration (`.github/workflows/ci.yml`)

Bestehenden Job `verify` erweitern um Schritte:
1. `bun run test:full`
2. `bunx playwright install --with-deps chromium`
3. `bun run test:e2e`
4. `bun run test:report`
5. `actions/upload-artifact@v4` für `test-report/`, `playwright-report/`, `coverage/`.

Lint/Docs/RBAC/Security-Scan-Steps bleiben.

## Dokumentation

- Neues Handbuch-Kapitel **„Testinstanz und Qualitätssicherung“** in `src/lib/help-documentation.ts`:
  - Zweck (Buildstand-Prüfung, keine zweite App)
  - Aufbau (Vitest-Projects, Playwright, Node-Scripts)
  - Testarten (15 Modi als Tabelle, mit `bun`-Befehl)
  - Ausführung (lokal vs. CI)
  - Interpretation (Coverage, JUnit-Report, Artefakte)
  - Entwicklersicht (Fixtures, MSW, Fake Timer) vs. Managementsicht (Abnahmekriterien, Risikoabdeckung, Reporting-Kadenz)
  - Rollen-Gating: `permission: "systemstatus.view"` (Manager) / `documentation.view` (Entwickler-Abschnitt bleibt offen).
  - `HELP_QUICKLINKS` um Eintrag „Testinstanz" ergänzen.
- `docs/ARCHITECTURE.md`: Abschnitt „Testing-Architektur" ergänzen (verweist auf ADR-0009).
- Neuer **ADR-0009 `docs/ADR/0009-central-test-instance.md`**: Entscheidung für Vitest-Projects + Playwright + MSW gegen Alternativen (getrennte Test-App, Cypress, Testcontainers).
- `docs/ADR/README.md` aktualisieren.
- `CHANGELOG.md` v1.28.0: „Zentrale Testinstanz eingeführt (15 Modi, Vitest-Projects, Playwright, MSW, ADR-0009, Handbuch-Kapitel)".
- `DOCUMENTATION_VERSION` → 1.5.0 (größerer Handbuch-Umbau).

## Neue Dateien (Übersicht)

```
src/__tests__/env/test-instance.ts
src/__tests__/mocks/server.ts
src/__tests__/mocks/handlers/azure.ts
src/__tests__/mocks/handlers/api.ts
src/__tests__/fixtures/projects.ts
src/__tests__/fixtures/workpackages.ts
src/__tests__/fixtures/assignments.ts
src/__tests__/fixtures/azure-responses.ts
src/__tests__/backend/status.test.ts
src/__tests__/backend/sync.test.ts
src/__tests__/api/status.route.test.ts
src/__tests__/api/sync.route.test.ts
src/__tests__/io/import.test.ts        (verschoben aus integration/)
src/__tests__/io/exports.test.ts       (verschoben aus integration/)
src/__tests__/backup/backup-service.test.ts
src/__tests__/azure/azure-service.mock.test.ts
src/__tests__/security/rbac-endpoints.test.ts
e2e/smoke.spec.ts
e2e/rbac-gating.spec.ts
e2e/import-export.spec.ts
e2e/fixtures.ts
playwright.config.ts
scripts/check-bundle.mjs
scripts/check-tech-debt.mjs
scripts/generate-test-report.mjs
docs/ADR/0009-central-test-instance.md
```

## Additive Code-Anpassungen (minimal, nicht funktional)

- `src/lib/store/dashboard-persistence.ts`: Storage-Key-Prefix aus `import.meta.env.VITE_TEST_STORAGE_PREFIX ?? ''` (default = heutiges Verhalten).
- `src/lib/logger.indexeddb.ts` & `src/lib/export-download-service.ts`: DB-Name aus `import.meta.env.VITE_TEST_IDB_NAME ?? '<current>'`.
- Keine weiteren Änderungen an Produktivpfaden.

## Abnahmekriterien-Mapping

| Kriterium                              | Umsetzung                                          |
| -------------------------------------- | -------------------------------------------------- |
| Läuft lokal                            | `bun run test:full`                                |
| Läuft in CI                            | Erweiterter `ci.yml`-Job + Artefakte              |
| Testdaten isoliert                     | `test:`-Prefix, dedizierte IDB, Fixtures          |
| Kein Zugriff auf produktives Azure     | `azure-service.mock.ts` + `AZURE_TEST_LIVE`-Guard |
| Fehler strukturiert erfasst            | Vitest JUnit + Playwright HTML + `test-report/`   |
| Nutzbar für technischen Prüfbericht    | `scripts/generate-test-report.mjs` konsolidiert   |

## Nicht enthalten (bewusst außerhalb Scope)

- Echter Azure-Live-Testmodus (nur Flag vorbereitet, spätere Iteration).
- Migration bestehender Tests in neue Ordnerstruktur nur dort, wo es die Modi-Trennung erfordert (io/); alle anderen bleiben liegen.
- Kein Wechsel des Test-Runners, kein Storybook, kein Testcontainers.
