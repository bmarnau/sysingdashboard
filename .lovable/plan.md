
# Testing-Infrastruktur (Vitest + Testing Library) — inkl. Alternativvorschläge

Fokus **Geschäftslogik & Sicherheit zuerst**. UI-Tests bewusst minimal, keine fragilen Route-Snapshots.

## 1. Dependencies (dev)

```
vitest @vitest/coverage-v8 @vitest/ui
@testing-library/react @testing-library/user-event @testing-library/jest-dom
jsdom
```

## 2. Konfiguration

**`vitest.config.ts`** (eigenständig, damit Cloudflare-Plugin nicht in Tests lädt):
- `plugins: [react(), tsconfigPaths()]`
- `test.environment = 'jsdom'`, `globals: true`
- `setupFiles: ['src/__tests__/setup.ts']`
- `include: ['src/__tests__/**/*.{test,spec}.{ts,tsx}']`
- `coverage: { provider: 'v8', reporter: ['text','html','lcov'], include: ['src/lib/**','src/hooks/**'], exclude: ['**/*.d.ts','src/routeTree.gen.ts'] }`
- **Per-File-Threshold** für `src/lib/time-period.ts` ≥ 80 % (keine globalen Gates → siehe Kritik).

**`src/__tests__/setup.ts`**: `@testing-library/jest-dom/vitest`, `matchMedia`-/`ResizeObserver`-Stubs, `afterEach(cleanup)`.

**`tsconfig.json`** ergänzen: `types: ["vite/client","vitest/globals","@testing-library/jest-dom"]`.

## 3. Struktur

```
src/__tests__/
  setup.ts
  fixtures/
    activities.ts        // makeActivity(overrides)
    users.ts             // makeUser(role)
  lib/
    time-period.test.ts
    rbac.test.ts
    export-data.test.ts
    user-management.test.ts
  components/
    PermissionGate.test.tsx      // statt Dashboard/TaskEditor
  integration/
    exports.test.ts              // json-export round-trip
    import.test.ts               // json-import + Schema-Validation
```

**Alternative umgesetzt:**
- **kein** `Dashboard.test.tsx` / `TaskEditor.test.tsx` (TaskEditor existiert nicht; Dashboard-Route braucht Router/Query/Portal-Setup → hoher Wartungsaufwand, geringer Nutzen). Ersatz: `PermissionGate.test.tsx` als sauberer, deterministischer UI-Einstieg.
- E2E-Smoke (Playwright, bereits im Sandbox verfügbar) als **Folge-Iteration** vorgemerkt, nicht Teil dieses Prompts.

## 4. Tests (≥ 20)

**time-period.test.ts** (Ziel ≥ 80 % Coverage):
- `getWorkingDaysOfMonth`: Standardmonat, Mai (1.5. Feiertag), Dezember (25./26.), Feb 2024 (Schaltjahr, 29 Tage), Feb 2025 (28).
- `germanHolidays`: Karfreitag 2025 = 18.4., Ostermontag 2024 = 1.4., Christi Himmelfahrt 2025 = 29.5.
- `calculateMonthlyTargetHours`: Vollzeit 168 h, Teilzeit 50 %, custom `DailyTargetFn`.
- `calculateWeeklyTargetHours`: normale KW und KW mit Feiertag.
- `calculateUtilization`: Target 0 → 0 %, Overload > 100 %.
- `sumActivitiesInRange`, `buildChartBuckets` Woche & Monat, `periodKey`/`getPeriodRangeByKey` Round-Trip.

**rbac.test.ts**:
- `can(null,…)` → false.
- Matrix-Invarianten: `azure.database.build` ⊆ {systemadministrator}; `azure.import ⊆ azure.export`; `viewer`/`customer` ohne `*.edit`/`azure.*`.
- `requirePermission` wirft, `canAny`/`canAll`.

**export-data.test.ts** / **user-management.test.ts**: Serialize→Parse Round-Trip, Rollen-Defaults, Validierungen.

**integration/exports.test.ts**, **integration/import.test.ts**: JSON-Export/Import Pipeline, gültige & ungültige Payloads, fehlende Pflichtfelder → Fehlerpfad.

**PermissionGate.test.tsx**: Kinder gerendert bei erlaubter Permission, `fallback` sonst — `useCurrentUser` gemockt.

Konvention: `should_<verhalten>_when_<kontext>`, AAA-Kommentare, deterministische Fixtures (kein Faker/Zufall).

## 5. Scripts

```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui",
"test:coverage": "vitest run --coverage"
```

`test` läuft im Run-Mode (CI-tauglich, kein Watch-Hang). `test:watch` liefert das interaktive Verhalten.

## 6. CI (`.github/workflows/ci.yml`)

Neuer Step nach Lint, vor Build:

```yaml
- name: Test
  run: bun run test:coverage
- name: Upload coverage
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: coverage
    path: coverage/
```

Codecov bewusst weggelassen (Token/Account-Setup Nutzer-Freigabe nötig; auf Zuruf nachrüstbar).

## 7. Doku-Sync-Pflicht

- Neuer HelpTopic „Tests & Qualitätssicherung" in `src/lib/help-documentation.ts` (`lastUpdated` gesetzt).
- `CHANGELOG.md`-Eintrag (neue Minor-Version) mit Bullet zur Test-Infrastruktur.
- `bun run docs:check` grün.

## 8. Umgesetzte Alternativvorschläge (aus letzter Runde)

1. **Kein Dashboard-/TaskEditor-Snapshot** → PermissionGate-Test + geplante Playwright-Smoke.
2. **`vitest run` statt `vitest`** als `test`-Script (CI-safe).
3. **Nur per-File-Threshold** für `time-period.ts` statt globaler 80 %-Gate (verhindert Rot-CI ohne Sicherheitsgewinn).
4. **jsdom** beibehalten (Radix/Portale robuster als happy-dom).
5. **Deterministische Fixture-Factories** statt Zufallsdaten.
6. **Mocks bei Bedarf** (`vi.mock` für `azure-service`/`syncService`) — erst wenn Integrationstests sie berühren, Iteration 1 mock-frei.

## 9. Done-Kriterien

- `bun run test` grün, ≥ 20 Tests.
- `bun run test:coverage` erzeugt Report; `time-period.ts` ≥ 80 %.
- CI-Job „Test" blockt bei Rot (Branch-Protection aktiviert der Nutzer in GitHub-Settings).
- Handbuch + CHANGELOG aktualisiert, `docs:check` grün.

## 10. Nicht enthalten (bewusst)

Playwright/E2E, MSW, Visual Regression, Mutation Testing — separate Iterationen.
