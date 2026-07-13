# Changelog

Zentrale Änderungshistorie des Dashboards. **Pflicht:** Bei jeder Dashboard-Änderung
mit Nutzersichtbarkeit hier einen neuen Eintrag (neueste oben) ergänzen. Diese Datei
wird zur Build-Zeit in das integrierte Benutzerhandbuch (Kapitel
„Änderungshistorie") eingelesen. Die jeweils oberste Version bestimmt automatisch
`DASHBOARD_VERSION`.

Format pro Eintrag:

```
## <semver> - YYYY-MM-DD
- Kurzbeschreibung der Änderung (eine Zeile pro Bullet).
```

## 1.34.0 - 2026-07-13

- **API Discovery Framework (ADR-0014)**: neues Framework unter `scripts/api-discovery/` erkennt aktive Server-Routen (`src/routes/api/**`) automatisch per statischer Analyse und schreibt das deterministische Inventar nach `test-report/api-inventory.json`. Archivierte Verzeichnisse (`archive/**`) und Tests werden strikt ausgeschlossen; Imports aus `archive/**` in aktiven Routen erzeugen ein Critical-Finding.
- **Discovery-Analyzer** erkennen HTTP-Methoden, `withCorrelation`-Wrapper, Zod-Validierung, Auth-Guards (`checkAuth`, `X-Sync-Token`, `requireSupabaseAuth`), Permissions, Logger-Nutzung und destruktive Wirkung. Endpoints werden als `public | authenticated | privileged | unclassified` klassifiziert.
- **API Smoke-Suite** (`src/__tests__/api/smoke/smoke.test.ts`): iteriert das Inventar, prüft Handler-Existenz, korrekte 4xx-Antwort auf ungültige Methode/JSON, secret-freie Responses (JWT/SAS/Connection-String/Stacktrace), Correlation-ID-Header. Rohdaten → `api-smoke-raw.json`, aggregiert → `api-smoke-report.json`.
- **API Functional-Coverage** (`src/__tests__/api/functional/functional.test.ts`) dokumentiert je Endpoint fachlichen Zweck, positive/negative Fälle, Auth/Scope/Validation/Idempotency/Audit und explizite Gaps. `complete | partial | missing | blocked | not-applicable`; `skipped/not-implemented/not-configured` werden **niemals** als `passed` gewertet.
- **Discovery Self-Tests** (`src/__tests__/api-discovery/discovery.test.ts`) mit synthetischen Fixtures für neu/entfernt/archiviert/dynamischer Parameter, deterministische Sortierung und Finding-Kategorien.
- **CI**: neuer Job-Block `API discovery` (Inventar → Smoke → Functional → Report → soft Gate) direkt hinter den Contract-Tests. Artefakte `api-inventory.json`, `api-smoke-report.json`, `api-functional-report.json`, `api-findings.md` werden über den bestehenden `test-report`-Upload mitgeschickt.
- **Handbuch**: neues Kapitel „API Discovery und Testabdeckung" (Kategorie Service) inkl. Bedeutung der Klassifizierungen, Aufbau der drei Artefakte, Unterschied Smoke vs. Functional, Umgang mit archivierten Routen und CI-Gate-Verhalten. `DOCUMENTATION_VERSION` auf **1.13.0** angehoben.
- **docs/API.md** ergänzt um Discovery-Hinweis: manuelle Endpoint-Tabelle bleibt, verweist aber jetzt auf das automatisch erzeugte Inventar als Wahrheitsquelle.
- **ADR-0014** dokumentiert die Entscheidung für regex-basierte statische Analyse gegenüber Konventions-Meta-Export.

## 1.33.0 - 2026-07-13

- **Sicherheits-, RBAC- und Auth-Test-Suite (ADR-0013)**: neue Vitest-Suite unter `src/__tests__/security/` (rbac-v1, rbac-v2, manipulation, logging, source-scan) und E2E-Specs unter `e2e/specs/security/` (ui-gate-tamper, api-direct-call). Prüft FE↔BE-Parität der RBAC-Matrix, Sysadmin/Admin-Lockout, verbotene Berechtigungen, Scope-Kanonisierung und -Inklusion, abgelaufene/revokierte Assignments, Zod-Reject bei Import-Injection, Logger-Redaction (Frontend + Backend) und statische Quellcode-Scans (direkte `role===`-Vergleiche außerhalb `src/lib/rbac`, Auth-Token-Persistenz in localStorage).
- **Ehrliches Findings-Gate statt grüner Platzhalter**: `scripts/security/static-findings.json` listet Design- und Infrastruktur-Lücken, die strukturell nicht via Test grün werden können (Backend hat keine RBAC-Middleware, Rolle nur in localStorage, kein produktiver Auth-Provider, Connection-Strings entgehen der Logger-Redaction). `scripts/security/release-rules.mjs` codiert Severity→Release-Wirkung; `scripts/security/security-report.mjs` erzeugt `test-report/security-report.{md,json}` und `security:gate` failed CI bei offenen Critical-Findings.
- **CI**: neuer Job-Step `Security suite` + `Security report` (Artefakt) + `Security release gate`. Report läuft `if: always()`, Gate blockiert nur bei tatsächlichen Blockern.
- **Handbuch-Kapitel** „Sicherheits- und RBAC-Tests" (Kategorie Service) inkl. Abdeckung, Grenzen, Release-Regeln und expliziter Nicht-Zertifizierungsklausel. `DOCUMENTATION_VERSION` auf **1.12.0** angehoben.
- **ADR-0013** dokumentiert die Entscheidung, Lücken als strukturierte Findings mit Release-Gate zu führen, statt sie durch Skip-Tests oder Platzhalter-Assertions zu verstecken.
- **Backend-Typings**: `backend/services/rbac.d.mts` schließt die letzte Lücke für strikt getypte Tests gegen die Backend-Rechte-Matrix.

## 1.32.0 - 2026-07-13

- **Zentrale Correlation-ID** für alle aktiven API-Routen (`/api/status`, `/api/sync`). Neuer Wrapper `withCorrelation` in `src/lib/correlation-context.server.ts` nutzt `AsyncLocalStorage`, um pro Request eine ID durch den gesamten Server-Baum zu propagieren; Utilities (`generateCorrelationId`, `isValidCorrelationId`, `acceptOrGenerateCorrelationId`) in `src/lib/correlation.ts`. Format: UUID v4 (default) oder eingehende Client-ID, sofern sie `^[A-Za-z0-9._-]{8,64}$` erfüllt — sonst wird sie verworfen und eine neue erzeugt.
- **Response-Header `X-Correlation-Id`** wird auf jeder Antwort gesetzt (auch bei Fehlern) und kann vom Handler nicht überschrieben werden. Strukturierte Fehler-Response (`{ ok:false, code, message, correlationId, timestamp }`) via `jsonErrorWithCorrelation` — kein Stack, keine Provider-Details.
- **Backend-Logger** (`backend/services/logger.mjs`) reichert jeden Eintrag additiv um `correlationId`, `route`, `method` und `durationMs` an, sofern ein Request-Kontext aktiv ist. Bestehende `logger.info/warn/error`-Aufrufe funktionieren unverändert.
- **Frontend**: `useSystemStatusHealth` liest den Header und speichert die letzte Referenz-ID. `SystemStatusDialog` zeigt sie sichtbar an, inkl. Copy-Button und Anzeige im Fehlerfall. `LogViewerDialog`-Suche findet Einträge auch nach `correlationId`.
- **Tests**: neue Suite `src/__tests__/api/correlation.test.ts` (Utils, Wrapper, Header-Handling, parallele Requests, Fehler-Shape, Logger-Enrichment) und E2E `e2e/specs/correlation.spec.ts` gegen den Dev-Server. Contract-Schemas (`endpoints.ts`) erwarten das neue Feld.
- **Tech-Debt-Detektor** `correlation-id.mjs`: markiert neue TSS-Routes ohne `withCorrelation`, unstrukturierte Fehlerantworten und ungeprüften Rohzugriff auf den Client-Header.
- **Systemstatus**-Abschnitt „Sicherheit" ergänzt um `correlationId.middlewareActive` / Anzahl unterstützter Routen. Handbuch-Kapitel „Correlation-ID & Nachverfolgung" hinzugefügt, `DOCUMENTATION_VERSION` auf **1.11.0**.


## 1.31.0 - 2026-07-13

- **UI- und End-to-End-Test-Suite (ADR-0012)**: Playwright-Suite unter `e2e/specs/` mit sieben Bereichen — Navigation, Dashboard, Servicemenü, Fehlerzustände, Responsive, Accessibility (axe-core WCAG 2.1 A/AA), RBAC (datengetriebene Rollen-Matrix über alle 7 Rollen + Backend-Denial gegen direkte HTTP-Requests). Läuft gegen den lokalen Dev-Server, Chromium-only.
- **Rollen-Fixture** (`e2e/fixtures/roles.ts`) seedet Benutzer und aktive Rolle vor jedem Test in `localStorage`; Storage wird nach jedem Test gelöscht (Test-Isolation). Für Accessibility gibt es einen `@axe-core/playwright`-Wrapper (`e2e/fixtures/axe.ts`).
- **Reports** unter `e2e/reports/`: `ui-matrix.md` (UI-Funktion ↔ Testfall, manuell gepflegt), `untested.md` (bewusste Lücken), `test-report.md` (auto-generiert via `scripts/generate-e2e-report.mjs` aus dem Playwright-JSON). Alle drei plus HTML-Report werden in CI als Artefakte hochgeladen.
- **CI**: neuer Playwright-Browser-Cache (`actions/cache@v4` auf `~/.cache/ms-playwright`) senkt die Job-Laufzeit; neuer Report-Step läuft `if: always()`. Neue Scripts `test:e2e:ui` (lokal headed) und `test:e2e:report`.
- **Handbuch-Kapitel** „UI- und End-to-End-Tests" (Kategorie Service) inkl. Ausführung, Reports, Werkzeug-Entscheidung und Grenzen (Rollen-Sichtbarkeit ist kein Sicherheitsnachweis). Verlinkt in „test-instance", „api-endpoint-tests", „barrierefreiheit", „system-status". `DOCUMENTATION_VERSION` auf **1.10.0** angehoben.
- **ADR-0012** dokumentiert die Entscheidungen Dev-Server statt Wrangler-Preview, Chromium-only, client-seitiges Rollen-Seeding und die daraus folgenden Grenzen.

## 1.30.0 - 2026-07-13

- **API- und Endpoint-Test-Suite (ADR-0011)**: Contract-first Registry unter `src/__tests__/api/registry/` — jede Server-Route ist ein `EndpointContract` mit Pfad, Methoden, Auth-Flag, Zod-Schemas und `loadRoute()`. Der generische Runner `src/__tests__/api/runner.test.ts` iteriert die Registry und erzeugt pro aktivem Endpoint dieselben Kategorien: Grundfunktion (Methoden, Content-Type, Statuscode, Response-Schema), Payload-Varianten (ungültiges JSON, leerer Body, 1 MB Oversize, unerwartete Felder, Injection-nahe Eingaben), Security-Scan (JWT/Bearer/Connection-String/SAS/Stacktrace im Body, sensitive Header, Auth-Negativfall), Stabilität (10 parallele Requests) und Nachvollziehbarkeit (strukturierter Fehler). Nicht-unterstützte HTTP-Methoden werden hart geprüft (Handler darf nicht existieren).
- **Endpoint-Matrix** wird bei jedem Runner-Lauf als `test-report/api-matrix.{md,json}` erzeugt und in CI als Artefakt hochgeladen. Enthält Endpoint, Methode, Auth, Permission, Scope, Request-/Response-Schema, Case-Zähler, Status und offene Risiken.
- **Vorbereitete Registry-Einträge** für spätere Routen (`/api/azure/*`, `/api/rbac/assignments`) mit Status `planned` — Runner überspringt sie via `test.todo`, bleibt aber in der Matrix sichtbar als bekannte Lücke.
- **Playwright-Smoke `e2e/api-smoke.spec.ts`**: echter HTTP-Round-Trip für die Fälle, die der Handler-direct-Runner nicht sieht (Middleware, Framework-Header).
- **Legacy-Tests entfernt**: `src/__tests__/api/status.route.test.ts` und `sync.route.test.ts` werden vollständig vom Runner abgedeckt.
- Handbuch-Kapitel „API- und Endpoint-Tests" (Kategorie Service) inkl. Testumfang, Ausführung, Fehlerinterpretation, Sicherheitsgrenzen und bekannten Einschränkungen; verlinkt im Hilfe-Quick-Menü. ADR-0011 dokumentiert die Registry-Entscheidung. `DOCUMENTATION_VERSION` auf 1.9.0 angehoben.

## 1.29.0 - 2026-07-13

- **Technical-Debt-Scanner (ADR-0010)**: Hybrider Ansatz aus acht automatisierten Detektoren (`scripts/tech-debt/detectors/`: `cyclic-deps`, `layer-violations`, `oversize-modules`, `endpoint-guards`, `orphan-modules`, `doc-drift`, `coverage-gaps`, `console-usage`) und einem kuratierten Manual-Katalog (`tech-debt/findings.json`). Gemeinsames Schema mit ID, Titel, Kategorie, Location, Beschreibung, Ursache, Auswirkung, Severity, Wahrscheinlichkeit, Empfehlung, Aufwand, Status, `firstDetected`, `lastChecked`, Version und Quelle.
- **Aggregator** (`scripts/tech-debt/run.mjs`) validiert beide Quellen, mergt, priorisiert nach Prompt-Ranking (Security → Datenverlust → offener privilegierter Endpoint → RBAC → Backup → funktional → Stabilität → Architektur → Performance → Doku → Kosmetik) und produziert `test-report/tech-debt.{json,md}`, `tech-debt-summary.md`, `tech-debt-actions.md` sowie `tech-debt-diff.json` gegen den vorherigen Lauf.
- **CI-Gate**: Nur Critical-Funde brechen die Pipeline (Exit 2); alles darüber ist Trend-Metrik. Actions-Cache persistiert `tech-debt.prev.json` pro Branch für echten Diff.
- **Alter `scripts/check-tech-debt.mjs` entfernt** (LOC/TODO-Zähler passte nicht ins Schema).
- Handbuch-Kapitel „Technical-Debt-Analyse" (Kategorie Service) inkl. Grenzen und bewusst nicht automatisierten Prüfpunkten; verlinkt im Hilfe-Quick-Menü.

## 1.28.0 - 2026-07-13

- **Zentrale Testinstanz eingeführt (ADR-0009)**: 15 klar getrennte Testmodi (Unit, Komponenten, Frontend-/Backend-Integration, API, I/O, Backup, Azure-Mock, A11y, Security/RBAC, Performance/Bundle, Docs, Technical Debt, UI-E2E, Regression, Full) über Vitest-Pfad-Filter + Playwright + MSW. Isolation via `src/__tests__/env/test-instance.ts` (Fake Timer, seeded PRNG, Storage-Präfix `test:`, IndexedDB `sysingdashboard-test`, Vitest-Guard). Fixtures für Projects/WorkPackages/Assignments/Azure-Responses. Additive Namespace-Hooks in `store/dashboard-persistence.ts` und `logger.indexeddb.ts` (`VITE_TEST_STORAGE_PREFIX`, `VITE_TEST_IDB_NAME`); Produktions-Default unverändert. Azure-Live-Aufrufe hart geblockt (nur mit `AZURE_TEST_LIVE=1`).
- **Neue Scripts**: `test:{unit,components,integration,backend,api,io,backup,azure,a11y,security,e2e,perf,docs,debt,regression,full,report}`. Aggregierter Prüfbericht unter `test-report/summary.{json,md}` via `scripts/generate-test-report.mjs`.
- **CI erweitert**: Docs-Check, Tech-Debt-Report, Playwright-Chromium, Bundle-Report und Prüfbericht mit Artefakt-Upload (`coverage/`, `test-report/`, `playwright-report/`).
- **Handbuch-Kapitel „Testinstanz und Qualitätssicherung"** (Kategorie Service), verlinkt im Hilfe-Quick-Menü. ADR-0009 dokumentiert die Architekturentscheidung.

## 1.27.2 - 2026-07-13

- **Legacy-Standalone-Backend archiviert**: `backend/server.mjs` und `backend/routes/` (bis v1.16.0 lokaler Node-HTTP-Server) nach `archive/legacy-standalone-backend/` verschoben. Keine Runtime-Änderung — die produktiven TanStack-Server-Routes (`src/routes/api/status.ts`, `src/routes/api/sync.ts`) importieren weiterhin die framework-freien Services aus `backend/services/`. Doku (`docs/API.md`, `docs/ARCHITECTURE.md`, Handbuch-Kapitel „Sync-Architektur" und „ENV-Validierung") und CI-Guard `scripts/check-no-console.mjs` entsprechend bereinigt.

## 1.27.1 - 2026-07-13

- **ADR-0008 — RBAC v2 Assignment-Architektur**: Design-Dokument für die produktive Nutzung der v2-Typen. Definiert Domänenmodell (Principal, ScopeRef, Lifecycle, Audit), Datenfluss (Store ↔ Repository ↔ ScopeResolver), Repository-Port (`AssignmentRepository` mit Local- und Remote-Adapter), `AssignmentService` samt Invarianten (Lockout-Schutz, Scope-Validierung, Duplikat-Prevention) und einen fünfphasigen Migrationspfad (M1 Typen → M5 Backend-Mirror). Bestehende v2-Typen bleiben unverändert; keine Code- oder UI-Änderung in dieser Version.

## 1.27.0 - 2026-07-12

- **Forensischer Actor-Kontext**: `UserManagementService.createUser/updateUser/deleteUser/setUserStatus/setUserRole` akzeptieren jetzt einen optionalen `ActorContext` (`actorId`, `actorRole`, `reason`). Audit-Log-Einträge enthalten damit sowohl Ziel- als auch Ausführer-Id. Fehlt der Actor, loggt der Service bewusst auf `warn`, damit der Log Viewer forensische Lücken sichtbar macht. `UserManagementDialog` reicht den aktiven Benutzer automatisch als Actor durch.
- **RBAC v2 – Datenmodell vorbereitet** (additiv, kein Breaking Change): Neue Typen für `ResourceType`, hierarchische `ResourceScope`, `PermissionV2` (`resource:action`), `PermissionGroup` und `RoleAssignment` in `src/lib/rbac/types.ts`. Scope-Utilities (`parseScope`, `scopeIncludes`, `narrowestScope`) und `evaluateAccess()` mit v1-Fallback in `src/lib/rbac/{scope,access,permission-groups}.ts`. Dokumentiert in ADR-0007 und `docs/RBAC-MATRIX.md`.

## 1.26.1 - 2026-07-11

- **Einheitliches Logging in Servicefunktionen**: Alle verbliebenen `console.*`-Aufrufe in `ExportDialog`, `SaveTargetDialog`, `AzureDataDialog` sowie `backend/server.mjs` durch den zentralen Logger ersetzt. Neue strukturierte `info/warn/error`-Meldungen mit `module`/`action`-Kontext in `json-export-service`, `json-import-service`, `export-download-service`, `azure/azure-service`, `azure/azure-history-store`, `user-management`. Aufrufe im Log Viewer sichtbar, Secret-Redaction weiter aktiv.
- **RBAC-Audit-Trail**: Erfolgreiche und blockierte Rollen-/Statuswechsel sowie SysAdmin/Admin-Lockouts werden mit Code (`SYSADMIN_LOCKOUT`, `ADMIN_LOCKOUT`) und Ziel-`userId` protokolliert.
- **Erweiterter No-Console-Guard**: `scripts/check-no-console.mjs` deckt jetzt zusätzlich `json-export-service`, `export-download-service`, `user-management`, `ExportDialog`, `SaveTargetDialog`, `components/azure/`, `backend/routes` und `backend/server.mjs` ab.

## 1.26.0 - 2026-07-10

- **Log Viewer im Servicemenü**: Neuer Menüpunkt „Log Viewer…" macht die bestehende Logger-Infrastruktur sichtbar (`src/components/LogViewerDialog.tsx`). Führt In-Memory-Ringpuffer und persistierten IndexedDB-Sink (`dashboard-logs`) zusammen, deduziert pro `ts|level|message` und sortiert absteigend.
- **Read-only Reader**: Neue `src/lib/logger.indexeddb-reader.ts` (`readAllLogs`, `clearAllLogs`) — bewusst getrennt vom Write-Sink (`logger.indexeddb.ts`), damit der Logger-Hot-Path unverändert bleibt. Kein Schema-Change, kein neuer Store.
- **Filter & Detail**: Level-Checkboxen, Zeitraum-Preset (15 min / 1 h / 24 h / 7 d / alle), Quellen-Multi-Select aus `context.{label,module,operation,component}`, Volltextsuche mit `useDeferredValue`, Detail-Sheet mit vollständigem JSON-Kontext, optionalem Stacktrace, „Als JSON kopieren", JSON-Export der gefilterten Einträge, Auto-Refresh (5 s).
- **Grenzen dokumentiert**: Anzeige-Limit 1000 Zeilen (konsistent mit ADR-0006 „No Virtual Scrolling"), Secrets bereits im Logger maskiert (keine doppelte Verarbeitung). Neues Handbuch-Kapitel `log-viewer` (Kategorie „Service"), verweist auf `fehlerbehandlung-logging`.
- Kritisches Feedback zur ursprünglichen Vorlage: bewusst **kein** neuer Log-Endpoint / kein Server-Upload (widerspräche ADR-0005), **kein** RBAC-Gate (Logs sind lokal im Browser, kein Fremd-Datenzugriff), **kein** eigener Download-Center-Eintrag (Logs sind Debug-Artefakt, kein Report).

## 1.25.0 - 2026-07-09

- **Performance / Lazy-Loading**: Alle 11 schweren Dashboard-Dialoge (`ExportDialog`, `LocalArchiveDialog`, `PerformanceReport`, `WorkingTimeModelsDialog`, `UserManagementDialog`, `UserManualDialog`, `BackupDialog`, `SystemStatusDialog`, `DownloadCenterDialog`, `ImportExportDialog`, `AzureDataDialog`) via `React.lazy` + `Suspense` ausgelagert und gegen ihren jeweiligen `open`-State gegated — schwergewichtige Chunks (`jspdf`, `jspdf-autotable`, `recharts`) verlassen den Initial-Bundle und werden erst beim ersten Öffnen des jeweiligen Dialogs geladen.
- **Bundle-Analyse**: Neues opt-in-Script `bun run analyze` (nutzt `rollup-plugin-visualizer`, nur DevDep) erzeugt `dist/stats.html`. Standard-Build unverändert, kein Overhead.
- **Hydration-Fix**: `useCurrentUser`/`useUsers` starten SSR- und Client-seitig identisch mit `null`/`[]` und lösen `localStorage` erst in `useEffect` auf — beseitigt den Hydration-Mismatch beim User-Titel im Header (Runtime-Error „System-Administrator" vs. „Senior Systems Engineer"), der bislang zu einem clientseitigen Neu-Render des kompletten Header-Subtrees führte.
- **Neues ADR-0006** „Kein Virtual Scrolling (bis Messnachweis)": begründet, warum `@tanstack/react-virtual` bewusst **nicht** eingeführt wurde — heutige Listen sind <100 Zeilen; Reopen-Trigger dokumentiert.
- Kritisches Feedback zur ursprünglichen Vorlage: `vite-plugin-visualizer` existiert nicht (heißt `rollup-plugin-visualizer`); Vorschlag `memo((prev, next) => prev.task.id === next.task.id)` **fehlerhaft** (Updates am selben Task würden nie neu rendern) — deshalb keine spekulative Memoisierung; Referenz-Stabilität liefert bereits der Pub-Sub-Store (ADR-0004). Kein Lighthouse-Gate in CI (Overkill/flaky), konsistent mit v1.23.0.

## 1.24.0 - 2026-07-08

- **Architekturdokumentation**: Neue `docs/ARCHITECTURE.md` (Systemübersicht, Modulgrenzen, Datenfluss, Runtime-Grenzen, Trust-Boundaries), `docs/API.md` (`/api/status`, `/api/sync`), `docs/DEPLOYMENT.md` (Cloudflare-Worker-Deploy, ENV, CI) und `docs/DATA-SCHEMA.md` (verweist auf `src/lib/json-schema.ts` + Migrationsregeln, kein Doppelbestand).
- **Architecture Decision Records** unter `docs/ADR/` mit Index und Template: ADR-0001 (TanStack Start), ADR-0002 (Frontend-RBAC gespiegelt — mit expliziter Trust-Boundary-Warnung), ADR-0003 (Local-First localStorage), ADR-0004 (Pub-Sub-Store statt Zustand/Redux), ADR-0005 (Frontend-Logger statt Sentry).
- **README** verlinkt die neue Doku-Sektion; neues Handbuch-Kapitel `architektur` mit Kurzfassung und Verlinkung.
- Kritisches Feedback zur ursprünglichen Vorlage: `docs/CONTRIBUTING.md` **nicht** überschrieben (das Bestehende ist gepflegter), Datenmodell **nicht** in Prosa dupliziert (driftet garantiert), zwei zusätzliche ADRs (Store, Logger) für bislang „stille" Entscheidungen.

## 1.23.0 - 2026-07-07

- **Barrierefreiheit (WCAG 2.1 AA)**: Automatisierte A11y-Tests mit `vitest-axe` (`src/__tests__/a11y/smoke.test.tsx`, `keyboard.test.tsx`) — laufen im bestehenden CI-Test-Schritt. Kritisches Feedback zur ursprünglichen Vorlage: bewusst `vitest-axe` statt `jest-axe` (Vitest-Projekt) und **kein Lighthouse in CI** (Overkill, flaky) — statt dessen dokumentierte Empfehlung für lokales Audit.
- Icon-only Header-Buttons (Suche zurücksetzen, Einstellungen, Hilfe, Benutzerprofil) erhalten `aria-label` + `aria-expanded` / `type="button"` + `aria-hidden` an Lucide-Icons.
- Suchfeld erhält `aria-label="Globale Suche"` und `type="search"`.
- `suppressHydrationWarning` auf den vom Dashlane/LastPass/Grammarly-Injektions-Angriff betroffenen Inputs/Buttons — beseitigt die Hydration-Mismatch-Runtime-Errors (kein A11y-Regress, nur Extension-Workaround).
- Neues Handbuch-Kapitel `barrierefreiheit`: Prüfabdeckung (axe automatisch, Screenreader/Tastatur manuell), Konventionen, bekannte Einschränkung PDF-Export (jsPDF ≠ PDF/UA — Empfehlung: TXT-/JSON-Export für strikte A11y).
- Tests: 94 → 98.

## 1.22.0 - 2026-07-06

- Zentraler **Dashboard-Store** (`src/lib/store/dashboard-store.ts`) für Domain-State (Projekte, Arbeitspakete, Tätigkeiten, Engineer) als Modul-Singleton mit Pub-Sub, ohne neue Runtime-Dependency (keine Zustand-/Redux-Bibliothek).
- React-Bindings via `useSyncExternalStore` (`src/lib/store/useDashboardStore.ts`): selektor-basierte Hooks `useProjects`, `useWorkPackages`, `useActivities`, `useEngineer` — Consumer rendern nur bei Änderung ihres Slices.
- **Persistenz-Layer** (`src/lib/store/dashboard-persistence.ts`) mit Debounce (300 ms) statt Full-Blob-Write bei jedem Tastendruck, `storage`-Event-Sync zwischen Tabs, Rehydrate bei Benutzerwechsel; Backwards-compatible zum bestehenden Storage-Key `northbit-dashboard-v2`.
- `src/routes/index.tsx` liest jetzt aus dem Store; UI-State (Dialoge, Suche, Menüs) bleibt bewusst lokal. Prop-Interfaces zu Kind-Komponenten unverändert (Direct-Read-Migration folgt profilergesteuert).
- 16 neue Tests (`dashboard-store`, `dashboard-persistence`, `useDashboardStore`) — Gesamt: 78 → 94.
- Neues Handbuch-Kapitel `state-management` erläutert Store, Persistenz und DevTools-Zugriff (`window.__dashboardStore` nur im DEV-Build).

## 1.21.0 - 2026-07-05


- Zentraler **Logger** (`src/lib/logger.ts`) mit Level `debug|info|warn|error`, In-Memory-Ringpuffer (500 Einträge), asynchronem IndexedDB-Sink (`dashboard-logs`, Rotation nach 1000 Zeilen / 7 Tagen) und automatischer Secret-Redaction (Token/Password/Authorization/Bearer/API-Key, JWT-ähnliche Strings). ESM-Pendant `backend/services/logger.mjs` für Node/Worker.
- Neue **Error-Klassen** (`src/lib/errors.ts`): `DashboardError` + `SyncError`, `ValidationError`, `ImportError`, `ExportError`, `AzureError`, `BackupError`, `RbacError` mit stabilen `code`-Feldern und `toJSON()` für sicheres Logging.
- Kritische Services umgestellt: `backend/services/syncService.mjs` wirft `SyncError` mit Codes, `src/lib/backup-service.ts` nutzt `logger.*` + `BackupError`, `src/lib/azure/azure-service.ts` loggt Stub-Aufrufe.
- Neuer Hook **`useSafeAsync`** (`src/hooks/useSafeAsync.ts`) für Ad-hoc-Async-Handler in Komponenten mit automatischem Logging.
- CI-Guard **`lint:no-console`** (`scripts/check-no-console.mjs`) blockiert direkte `console.*`-Aufrufe in `src/lib/backup-service.ts`, `src/lib/json-import-service.ts`, `src/lib/azure/**` und `backend/services/**`. Nur die drei Logger-Dateien sind ausgenommen.
- 14 zusätzliche Tests (`errors.test.ts`, `logger.test.ts`, `useSafeAsync.test.tsx`) — Testsumme ≥ 75.
- Neues Handbuch-Kapitel **„Fehlerbehandlung & Logging"**.

## 1.20.0 - 2026-07-04

- Test-Infrastruktur eingeführt: **Vitest + @testing-library/react** mit jsdom, `@testing-library/jest-dom` und v8-Coverage. Neue Skripte `test`, `test:watch`, `test:ui`, `test:coverage`.
- Neue Test-Struktur unter `src/__tests__/` mit deterministischen Fixture-Factories (Activities, Users) und **61 Tests** in 7 Dateien: `time-period` (20), `rbac` (13), `user-management` (13), `export-data` (5), `PermissionGate` (4), Integrationstests für Export (2) und Import-Schema-Validation (4).
- Per-File-Coverage-Threshold für `src/lib/time-period.ts` (≥ 80 %) — bewusst kein globaler Gate.
- CI-Pipeline (`.github/workflows/ci.yml`) erweitert: Tests laufen nach Lint/RBAC und vor Build; Coverage-Report wird als Artifact hochgeladen. Merge blockiert, wenn Tests rot sind.
- Neues Handbuch-Kapitel **„Tests & Qualitätssicherung"** ergänzt.

## 1.19.0 - 2026-07-02

- Neuer Servicebereich **Azure Daten** (Service → „Azure Daten…") mit drei Tabs: **Status**, **Aktionen** und **Historie**. UI- und Service-Fassade fertig, Backend-Anbindung folgt später (Stubs antworten `not implemented`, ohne zu werfen).
- Alle Azure-Aktionen laufen ausschließlich manuell per Button: **Verbindung testen**, **Datenbank aufbauen** (Textbestätigung `AUFBAUEN`, nur Systemadministrator), **Nach Azure exportieren** (Bestätigung), **Aus Azure importieren** (Pflicht-Vorschau + Pflicht-Backup + Textbestätigung `IMPORTIEREN`), **Lokale Historie leeren**.
- Buttons werden per `PermissionGate` nur bei vorhandener RBAC-Berechtigung angezeigt; bei fehlender Azure-Konfiguration (DEV) sind ausführende Buttons deaktiviert und der Status zeigt „Not configured". Ein ErrorBoundary im Dialog sorgt dafür, dass ein Azure-Ausfall das Dashboard nicht beeinträchtigt.
- Lokale, secret-freie Anzeige-Historie (`AzureHistoryStore` in `localStorage`) für Verbindungstests, Exporte und Importe.
- Handbuch-Kapitel **„Azure Daten – Servicegebiet"** ergänzt, `DOCUMENTATION_VERSION` auf `1.6.0` angehoben.

## 1.18.4 - 2026-07-01

- Handbuch-Suche erweitert: globale Header-Suche findet jetzt auch Handbuch-Kapitel (Sektion „Handbuch"); Klick öffnet das passende Kapitel mit übernommenem Suchbegriff.
- Im Benutzerhandbuch werden Treffer im Kapiteltext gelb hervorgehoben; Trefferzähler (`n / total`) und Sprung zum nächsten/vorherigen Treffer via Pfeilbuttons oder Enter/Shift+Enter.
- Deep-linkable Suche: aktive Kapitel-ID und Suchbegriff werden als `?help=<id>&hq=<query>` in der URL persistiert und beim Öffnen des Dialogs wieder eingelesen; beim Schließen entfernt.

## 1.18.3 - 2026-07-01


- Neue **Managementübersicht** (`docs/MANAGEMENT_OVERVIEW.md`) mit 14 Sektionen für nicht-technische Entscheider: Zielbild, Sicherheitsarchitektur, ENV-Validierung, Fail-Fast in Produktion, DEV ohne Azure, kein automatischer Sync, lokaler Betrieb bleibt führend, Rollenmodell, Export-/Import, Konflikthandling, Systemstatus, Entra-ID- und Key-Vault-Roadmap, Risiken und Gegenmaßnahmen.
- Handbuch-Kapitel **Managementübersicht** ergänzt (Kategorie „Betrieb"), verweist auf die versionierte MD-Datei.
- Systemstatus (Sektion „Documentation") zeigt Managementübersicht jetzt als vorhanden statt „not configured".
- `DOCUMENTATION_VERSION` auf `1.5.0` angehoben.

## 1.18.2 - 2026-06-30

- Benutzerhandbuch erweitert um die Kapitel **Lokaler Betrieb ohne Azure**, **Azure Servicebereich**, **Azure Datenbank aufbauen**, **Azure Verbindung testen**, **Nach Azure exportieren**, **Aus Azure importieren**, **Konflikthandling beim Import**, **Backup vor Import**, **Sicherheitsprinzipien** und **Was bei Azure-Ausfall passiert**. Neue Kategorien „Azure", „Betrieb" und „Sicherheit" im Navigationsbaum.
- Import-/Datenbank-/Azure-Kapitel mit klaren Warnhinweisen bei Überschreiben und Import; rollenbasierte Sichtbarkeit (`azure-database-build` und `azure-import` nur für berechtigte Rollen). Keine Secrets/Connection-Strings/SAS-Tokens dokumentiert.
- `DOCUMENTATION_VERSION` auf `1.4.0` angehoben; `lastUpdated` aller neuen Kapitel auf 2026-06-30 gesetzt.

## 1.18.1 - 2026-06-29

- Systemstatus (Check 8) auf sieben strukturierte Sektionen umgebaut: **Application**, **GitHub**, **Lovable**, **Azure**, **Security**, **Data**, **Documentation** — exakt gemäß Anforderung.
- `/api/status` (`backend/services/statusService.mjs`) liefert jetzt ein vollständiges, **secret-freies** Payload (nur Booleans, ENV-Namen, Metadaten). Quellen: `secretManager.status()`/`validate()`, `keyVault.isKeyVaultConfigured()`, RBAC-Mirror, `syncService.getSyncMeta()`. Niemals `consume()` — keine Werte, keine Connection-Strings, keine SAS-Tokens, keine Stacktraces im Body.
- Fehlende Felder werden defensiv als "Not configured" angezeigt; fehlt das Backend, bleibt der Dialog dank lokaler Fallbacks (Version, Build, Backup, PROJECT_INFO) voll bedienbar.
- Fehlende ENV-Variablen werden in Sektion 4 und 5 ausschließlich mit **Namen** als Chips dargestellt — keine Werte, keine Previews.
- `useSystemStatusHealth` gibt das komplette Payload typisiert weiter (`SystemStatusPayload`); Startvalidierung (`bootstrapSystemStatusCheck`) und 3-s-Timeout bleiben unverändert.
- Handbuch-Kapitel „Systemstatus" auf neue 7-Sektionen-Struktur aktualisiert (`lastUpdated: 2026-06-29`).

## 1.18.0 - 2026-06-28

- RBAC-Modell eingeführt (Prompt 7): 7 Rollen (System-Administrator, Administrator, Teamleiter, Projektmanager, Systemingenieur, Kunde, Viewer) und 14 atomare Permissions (`dashboard.view`, `documentation.view`, `systemstatus.view`, `project.edit`, `workpackage.edit`, `activity.edit`, `azure.connection.test`, `azure.export`, `azure.import`, `azure.database.build`, `backup.restore`, `users.manage`, `roles.manage`, `auditlog.view`).
- Frontend-Matrix `src/lib/rbac/permissions.ts` (Single Source of Truth) + Hook `usePermission` + UI-Komponente `PermissionGate`. Backend-Mirror in `backend/services/rbac.mjs` für spätere Server-Guards.
- Invarianten (Check 7): `azure.database.build` nur System-Administrator; `azure.import` ⊆ {sysadmin, admin}; Import-Träger ⊆ Export-Träger; `roles.manage` nur sysadmin; `viewer` read-only; `customer` ohne Admin-/Status-Zugriff. CI-Skript `scripts/check-rbac.mjs` (npm script `rbac:check`) vergleicht Frontend- und Backend-Matrix und verifiziert alle Invarianten.
- Sicherheits-Härtung User-Management: letzter aktiver System-Administrator kann nicht degradiert, deaktiviert oder gelöscht werden; Rollen-Select im UserEditor ist außerhalb `roles.manage` gesperrt und blendet die SysAdmin-Rolle aus.
- Einmalige Migration: bestehender Default-Administrator wird beim Start auf `systemadministrator` angehoben (Flag `northbit-rbac-migrated-v1`).
- Entra-ID-Readiness: `config/roleResolver.mjs` mit `resolveRoleFromGroups()` (Least-Privilege-Fallback `viewer`) plus Beispiel-Mapping `config/entraMapping.example.json`. Entra liefert nur Identität; die interne Matrix bleibt autoritativ.

## 1.17.8 - 2026-06-27

- Secret-Management-Check (Check 4) bestanden: alle ENV-Zugriffe laufen über `config/secretManager.mjs`; `src/routes/api/sync.ts` nutzt jetzt `getEnv("SYNC_TRIGGER_TOKEN", false)` statt direktem `process.env`-Zugriff. Kein Secret im Frontend-Bundle, keine Werte in Logs/Responses.
- `config/envValidator.mjs` wieder eingeführt als reine Kompatibilitäts-Fassade (Re-Export aus `secretManager`) — semantischer Name, ohne Duplikate.
- `config/keyVault.mjs` als Architektur-Platzhalter hinzugefügt (`isKeyVaultConfigured`, `resolveSecret`). Aktivierung benötigt später nur `AZURE_KEY_VAULT_URL` plus Azure-Pakete; ENV-Pfad bleibt Default-Fallback.

## 1.17.7 - 2026-06-27

- Konsolidierung: `config/envValidator.mjs` entfernt; Validierung wandert als `validate()` in `config/secretManager.mjs`. Single Source of Truth für die Liste der Azure-Pflicht-ENVs (`KNOWN` / `REQUIRED_IN_PROD`).
- Aufrufer (`backend/server.mjs`, `backend/services/ensure-env.mjs`) importieren jetzt `validate` aus `secretManager`. Verhalten unverändert: PROD-Fail-Fast, DEV-Warnung, keine Werte im Log.
- Handbuch-Kapitel „ENV-Validierung & Production-Gating" und Backend-Typen aktualisiert.

## 1.17.6 - 2026-06-26

- Zentrale ENV-Validierung: neue Datei `config/envValidator.mjs` mit `isDev()`, `isProd()`, `getEnv(name, requiredInProd)` und `validateEnv()`. Pflicht-ENVs (`AZURE_SQL_CONNECTION`, `AZURE_TABLE_CONNECTION`, `AZURE_STORAGE_SAS`, `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`) sind nur in PROD zwingend; DEV läuft mit Warnung weiter.
- PROD-Fail-Fast: `backend/server.mjs` ruft `validateEnv()` vor `server.listen(...)`; fehlende Pflicht-ENVs werfen aggregiert und stoppen den Boot. TanStack Server-Routes (`/api/status`, `/api/sync`) nutzen den lazy Guard `backend/services/ensure-env.mjs` und antworten generisch mit 500 „Service not configured" — keine Variablennamen/Werte im Body.
- Logging-Regel: ausschließlich Variablennamen werden geloggt, niemals Werte. Modul ist backend-only und wird nicht aus `src/` importiert.

## 1.17.5 - 2026-06-26

- Offline-Check (Check 2) bestanden: Dashboard startet ohne Azure-Konfiguration, Projekte/Arbeitspakete/Tätigkeiten laufen ausschließlich aus `localStorage`, kein automatischer Azure-Aufruf, `/api/status`-Ausfall blockiert nichts. Architektur unverändert — Bestätigung dokumentiert.
- Neues Handbuch-Kapitel „Offline-Betrieb" mit den sieben Offline-Garantien und klarer Abgrenzung lokal/Backend.
- Systemstatus-Dialog: neue Sektion „Security-Scan" listet Custom-Scanner, Gitleaks und CI-Workflow inkl. Trigger-Plan; Health-Block weist darauf hin, dass `/api/status`-„nicht erreichbar" im Static-Deploy erwartet ist und keinen Funktionsverlust bedeutet.

## 1.17.4 - 2026-06-24

- CI-Security-Scan eingeführt: neuer Workflow `.github/workflows/security.yml` läuft bei Push/PR und montags 03:00 UTC. Erkennt Azure-AccountKeys/SAS-Tokens/Connection-Strings, AWS/Stripe/OpenAI/GitHub-Keys, Private-Key-Blöcke, JWT-Literale, gefährliche CORS-/CSP-/X-Frame-Header und dynamisches `dangerouslySetInnerHTML`. CRITICAL/HIGH blocken den Build.
- Neuer Scanner `scripts/security-check.mjs` (plain Node, keine Dependency) + `bun run security:check`. Schreibt `security-report/findings.json` und `findings.md`, die als GitHub-Actions-Artefakt 30 Tage aufbewahrt werden. Inline-Allowlist via `// security-scan-allow: <regel-id>`.
- Zweite Verteidigung: `gitleaks-action@v2` mit `.gitleaks.toml` (Allowlist für Doku/Lockfiles/Typdeklarationen).
- PRs erhalten automatisch einen Sticky-Comment mit dem Markdown-Report.

## 1.17.3 - 2026-06-24

- Sicherheits-Baseline (Check 1) durchgeführt; Ergebnisse in `.lovable/plan.md` dokumentiert. Keine Secrets/SAS-Tokens/Connection-Strings im Frontend, kein Azure-SDK im Client, generische Fehlerantworten an `/api/*`.
- Logging gehärtet: `src/routes/__root.tsx`, `src/start.ts`, `src/server.ts` loggen nur noch gekürzte Error-Messages (max. 200–256 Zeichen) statt voller Error-Objekte oder Response-Bodies.
- `/api/sync` mit Auth-Gate: In Production erforderlich `X-Sync-Token`-Header gegen Server-Secret `SYNC_TRIGGER_TOKEN`; ohne Secret hart deaktiviert (503). Dev-Modus bleibt offen (nur Mock).
- Zod-Längenlimits in `src/lib/json-schema.ts` (`SHORT_ID`/`SHORT_STR`/`LONG_STR`) gegen unbounded Import-Payloads.
- `src/components/ui/chart.tsx`: Security-Kommentar an `dangerouslySetInnerHTML` (niemals User-Input).
- CI: `bun run lint` ohne `|| true`, damit Lint-Fehler den Build wieder rot machen.

- CI-Workflow (`.github/workflows/ci.yml`) auf Bun umgestellt: `oven-sh/setup-bun@v2` + `bun install --frozen-lockfile`, `bun run lint`, `bun run build`. Behebt den Fehler „Dependencies lock file is not found" beim Setup-Node-Schritt (Projekt nutzt `bun.lock`, keine `package-lock.json`).

## 1.17.1 - 2026-06-23

- Systemstatus-Layout responsiv überarbeitet: Label/Wert als Grid (1 Spalte mobil, 2 Spalten ab `sm`), lange URLs/IDs brechen via `overflow-wrap: anywhere` um, kein horizontales Scrollen mehr.
- Maximieren-/Minimieren-Button im Dialog-Header: schaltet auf vollflächige Ansicht (100vw/100dvh) mit zweispaltigem Sektions-Layout ab `lg`; Reset beim Schließen.

## 1.17.0 - 2026-06-23

- Systemstatus repariert: Repository zeigt jetzt fest `bmarnau/sysingdashboard` mit Link auf https://github.com/bmarnau/sysingdashboard (statt "nicht verbunden" wegen fehlendem `git` in der Sandbox). Commit-SHA wird separat als optionales Feld geführt.
- Neue Sektion "Lovable-Deployment" im Systemstatus mit Published-URL (https://sysingdashboard.lovable.app), stabiler Preview-URL, Editor-Link und Projekt-ID.
- Laufzeit-Aktualitätscheck: `bootstrapSystemStatusCheck()` triggert beim Start einmalig `GET /api/status` (Timeout 3 s, flüchtig, kein Polling). Anzeige "Zuletzt geprüft" und "Jetzt prüfen"-Button im Dialog.
- Neue Single Source of Truth `src/lib/project-info.ts` für Repo- und Deploy-Pfade (per `VITE_PROJECT_GITHUB_URL` / `VITE_LOVABLE_PUBLISHED_URL` / `VITE_LOVABLE_PROJECT_ID` überschreibbar).

## 1.16.0 - 2026-06-22

- Backend-API jetzt auch im Lovable-/Cloudflare-Deployment erreichbar: TanStack-Server-Routes \`src/routes/api/sync.ts\` (POST) und \`src/routes/api/status.ts\` (GET) importieren dieselben framework-freien Services aus \`backend/services/\` wie der lokale Standalone-Server.
- Module auf ESM vereinheitlicht: \`config/env.mjs\`, \`config/secretManager.mjs\`, \`backend/services/_.mjs\`, \`backend/routes/_.mjs\`, \`backend/server.mjs\`. Lokal weiterhin via \`node backend/server.mjs\` startbar. Eine Quelle für Sync-/Status-Logik.

## 1.15.0 - 2026-06-22

- Backend-API-Gerüst unter \`/backend\` (Node-HTTP-Server, ohne Dependencies): \`POST /api/sync\` und \`GET /api/status\` mit Trennung Routes/Services. Im development-Mode liefert der Sync ausschließlich Mock-Daten, Azure-Zugriffe sind via \`config/env.mjs\` blockiert. Status meldet Modus, Secret-Verfügbarkeit (maskiert) und letzten Sync-Lauf.
- Hinweis: \`backend/server.mjs\` läuft nur lokal (\`node backend/server.mjs\`); für das Cloudflare-Deployment übernehmen die TanStack-Server-Routes dieselbe Aufgabe.

## 1.14.0 - 2026-06-20

- JSON-Import Stufe 2: vierstufiger Wizard (Datei → Vorschau → Mapping → Ausführung) mit Diff pro Bereich, drei Konflikt-Strategien (Merge/Überschreiben/Behalten), Pre-Snapshot der betroffenen Storage-Keys und automatischem Rollback bei Fehler.
- Benutzer-Mapping (engineerId → bestehender User / neu anlegen / überspringen); im Single-Engineer-Modus wird der Schritt übersprungen und eingehende IDs dem aktiven Benutzer zugeordnet.
- Kunden-Mapping mit automatischer Duplikat-Erkennung (Normalize-Schlüssel + Levenshtein ≤ 2) gegenüber bestehenden \`project.client\` / \`workPackage.client\`-Werten.
- Konfliktregel \`timeEntries\` > \`activities\`: Datum/Dauer/Stundensatz/Abrechnungsstatus/Beschreibung werden aus \`timeEntries\` übernommen; Abweichungen erscheinen als Warnung im Protokoll.
- Persistiertes Import-Protokoll (IndexedDB, Default 90 Tage) mit Zeitstempel, Counts, Warnungen, Konflikten, Mapping-Entscheidungen und Snapshot-ID; Rollback und Löschen direkt aus der Tabelle.
- ZIP-Backup bettet jetzt eine kanonische \`dashboard.json\` (Schema v1) ein — vorbereitend für einen schemavalidierten Restore-Pfad. Alte ZIPs bleiben uneingeschränkt lesbar.
- Sensible Felder werden beim Import VOR der Validierung entfernt (Defense in depth gegen manipulierte Dateien).
- Tests: `bun run test:examples` erweitert um Import-Round-Trip (jede Beispieldatei → buildPlan → applyPlan in einen In-Memory-Mock und zurück).
- Handbuch-Kapitel „Import / Export (JSON)" um Wizard, Mapping, Konfliktregeln, Protokoll und eingebettete dashboard.json ergänzt.

## 1.13.0 - 2026-06-19

- Downloadbereich: konfigurierbare Aufbewahrungsdauer (Default 30 Tage, 1–365 einstellbar), automatischer Status „Abgelaufen" beim Öffnen, endgültiges Löschen nach 7 Tagen Karenz, Aktion „Abgelaufene jetzt löschen" und neue Spalte „Ablauf" mit Restzeit.
- CSV-, JSON- und Azure-Table-Exporte werden jetzt tatsächlich erzeugt, automatisch heruntergeladen und im Downloadbereich registriert (vorher nur Konsole).
- Neue Text-Vorschau (`TextPreviewDialog`) für CSV/JSON/NDJSON-Exporte mit Kopier- und Download-Aktion (bis 256 KB Vorschau).
- Eindeutige Dateinamen: die Report-ID (`REP-YYYYMMDD-HHMMSS`) wird in alle Export-Dateinamen (PDF, CSV, JSON, NDJSON) eingebaut und verhindert Kollisionen bei gleichzeitigen Exporten.
- Persistenzschema (`ArchivedExport`) um `expiresAt` und `retentionDays` erweitert — Vorbereitung für eine spätere Cloud-Synchronisation (Tabelle `export_downloads` + Storage-Bucket), Implementierung folgt bei Bedarf.

## 1.12.0 - 2026-06-18

- Servicebereich: neuer Menüpunkt „Import / Export…" (nur Administrator/Teamleiter) mit Tabs JSON Export, JSON Import (Stufe 2), Beispieldateien, Import-Protokoll (Stufe 2), Backup und Schnittstellen-Dokumentation.
- Neues versioniertes JSON-Schema v1 (`json-schema.ts`, Zod): Voll- und Teil-Export, Brückenfelder `project.customerId` und `activity.engineerId`, synthetische Kunden aus `project.client`, Zeitbuchungen als Projektion aus Aktivitäten.
- Services: `JsonExportService` (Voll/Teil-Export, Download-Center-Integration), `JsonSchemaValidationService` (Zod + referenzielle Integritätsprüfung), `ExampleFileService` (sechs deterministische Beispiel-JSONs).
- Sicherheits-Denylist (Passwörter, Tokens, MFA-Secrets, API-Keys) wird vor jedem Export auf Storage-Keys und Feldnamen angewendet.
- Tests: `scripts/test-example-files.mjs` validiert jede Beispieldatei gegen Schema und Referenzen; per `bun run test:examples` ausführbar.
- Handbuch: neues Kapitel „Import / Export (JSON)" plus Erweiterungen in „Backup" und „Servicebereich".

## 1.11.0 - 2026-06-17

- Servicebereich: neuer Menüpunkt „Downloads…" zeigt alle erzeugten Exporte mit Dateiname, Format, Zeitraum, Erstellt am, Erstellt von, Dateigröße, Status und Aktionen (Herunterladen, Vorschau, Löschen).
- Nach jedem PDF-Export wird automatisch ein Download-Eintrag (Status „Fertig") angelegt; fehlgeschlagene Exporte erscheinen mit Status „Fehlgeschlagen" und Fehlermeldung.
- Neuer `ExportDownloadService` (getDownloads / addDownload / updateDownloadStatus / getDownloadUrl / deleteDownload) auf Basis der bestehenden IndexedDB-Ablage.
- Toast-System (sonner) im Root-Layout aktiviert für Erfolg- und Fehlermeldungen.

## 1.10.0 - 2026-06-16

- Servicebereich: neuer Menüpunkt „Systemstatus" zeigt GitHub-Repository, Branch, Commit-SHA, Build-Zeit, Dashboard-/Handbuch-Version und letztes Backup.
- Build-Info (Commit, Branch, Build-Zeit) wird zur Build-Zeit via `vite.config.ts` injiziert.
- GitHub Actions Workflow `ci.yml` (Lint, docs:check, Build) für jeden Push/PR.
- Doku in `docs/CONTRIBUTING.md` und `docs/GITHUB.md` (Branch- und Commit-Strategie, GitHub-Sync).

## 1.9.1 - 2026-06-16

- Änderungshistorie zentralisiert in `CHANGELOG.md`; Dashboard-Version wird automatisch aus der obersten Version übernommen.
- Doku-Sync-Skript `bun run docs:check` prüft Konsistenz zwischen `CHANGELOG.md`, Handbuch und Code.

## 1.9.0 - 2026-06-15

- Backup-Bereich: tägliches automatisches Daten-Backup, manueller Button, Download-Liste, ZIP-Validierung und Protokoll.

## 1.8.1 - 2026-06-15

- Mehrsprachigkeit (i18n) vorbereitet, Standardsprache Deutsch, HTML-lang auf de gesetzt.

## 1.8.0 - 2026-06-14

- Benutzerhandbuch im Servicebereich integriert (modal, suchbar, rollenabhängig, kontextbezogen).

## 1.7.0 - 2026-06-14

- Engineurprofil übernimmt Werte aus dem Arbeitszeitmodell; Zeit-/Stundenfelder gegen Eingabe gesperrt.
