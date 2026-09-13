# BSF-03D — Technischer Nachweis Arbeitspaket-Kategorien (Issue #103)

Stand: 2026-09-13
Version: 1.62.0
Status: **FINAL PASS — verifiziert** (Paket Q 2026-09-13, siehe Abschnitt 8)

## 1. Scope

BSF-03D liefert Arbeitspaket-Kategorien als editierbare, systemhausweite
Referenzdaten:

- Katalog `workpackage.category` mit Scope `systemhouse`, ohne Seed-Werte,
  Key unveränderlich, deaktivieren statt Hard Delete.
- `WorkPackage.categoryKey?: string | null`; fehlend/null = keine Kategorie;
  maximal eine primäre Kategorie; Tags unabhängig; keine Ableitung von
  `billable`/`priority`/`status`.
- Reference Data um `reference_catalog.scope_type`,
  `reference_value.systemhouse_id`, partielle Unique-Indizes, Scope-Trigger
  und `reference_value_history.systemhouse_id` erweitert; AVKK-Kataloge
  bleiben global.
- Auswahl durch AP-berechtigte Nutzer, Verwaltung nur `referencedata.manage`
  plus aktive Systemhaus-Membership; Viewer Write DENY; Cross-Systemhouse DENY;
  UI-Gating ist keine Sicherheitsgrenze.
- JSON-Schema 1.2.0, Import/Export/Backup/Restore rückwärtskompatibel und
  fail-safe bei unbekannter/deaktivierter Kategorie.

Nicht Teil dieses Nachweises: Auth-/Preview-Änderungen, Shared Projection,
BSF-02C-RPC, BSF-03 P5.

## 2. Basis und Commits (Workspace-Sicht)

| Bezug                                    | SHA                   |
| ---------------------------------------- | --------------------- |
| Abgenommener GitHub-`main` (Basis)       | `b90f93c`             |
| BSF-03D Paket 1 / Fachimplementierung    | `6484555`             |
| Review-Fix Runde 1 (Migration, Cache)    | `f422a01`             |
| Review-Fix Runde 2 (Test-Hardening)      | `5e67fd0`             |
| Preview-Auth-Broker entfernt             | `b619596` / `0729911` |
| Plattform-Commit mit Broker-Re-Injection | `b23c50f`             |

Die Integration erfolgt ausschließlich über GitHub-Branch + Pull Request nach
separatem Security-Workflow und vollständiger CI.

## 3. TDD-Hinweis

- Review-Fix-Runden 1 und 2 wurden test-first mit dokumentiertem RED/GREEN
  ausgeführt (`src/__tests__/security/bsf03d-migration-contract.test.ts`,
  `src/__tests__/lib/reference-data/cache.test.ts`; Runde 2 als
  `TEST-HARDENING: immediate GREEN against already-correct implementation`).
- Für das frühe Paket 1 existiert **kein separater historischer RED-Commit**;
  der RED-Nachweis wurde im Turn dokumentiert, ist aber in der Git-Historie
  nicht als eigener Commit belegbar. Dies bleibt als bekannter Restpunkt
  stehen.

## 4. Paket V — DB-Verifikation (2026-09-13)

Ausgeführt gegen die mit diesem Projekt verbundene Datenbank (Projekt/DB
korrekt identifiziert: JA; keine Secrets in diesem Dokument).

### 4.1 Vorcheck (read-only)

- Tabellen `systemhouse`, `reference_catalog`, `reference_value`,
  `reference_value_history`, `systemhouse_membership`: vorhanden.
- Katalog `workpackage.category` mit `scope_type = 'systemhouse'`: vorhanden.
- AVKK-Kataloge: `scope_type = 'global'`, unverändert.
- Synthetische Test-IDs (`aaaaaaa1-*`, `bbbbbbb1-*`, `ccccccc1-*`) vor dem
  Lauf: 0.

### 4.2 SQL-Artefakt

- Artefakt: `supabase/tests/bsf03d-workpackage-category.sql`, unverändert bis
  auf das Entfernen der Tool-inkompatiblen Metazeile `\set ON_ERROR_STOP on`.
- Ausführung in genau **einer Transaktion `BEGIN … ROLLBACK`**, fail-fast.
- Ergebnis: **T01–T16: 16/16 PASS**.
- Nachlauf (read-only): synthetische IDs/Daten = 0.
- **DB dauerhaft geändert: NEIN.**

### 4.3 Live-Schema-Vertrag — PASS

- `reference_catalog.scope_type`: DEFAULT `'global'`, NOT NULL, CHECK.
- `reference_value.systemhouse_id` mit FK `ON DELETE RESTRICT`.
- Partielle Unique-Indizes global (`catalog_id, key`) und systemhouse
  (`catalog_id, systemhouse_id, key`).
- Indizes auf `systemhouse_id` (Wert und History).
- Scope-Trigger `reference_value_validate_scope` aktiv.
- RLS auf `reference_value` und `reference_value_history` aktiv; **keine
  DELETE-Policy**.
- `reference_value_history.systemhouse_id` vorhanden.
- Die Repo-Migration wurde **nicht** erneut live angewendet (kein DDL);
  Idempotenz strukturell gegen das Live-Schema und durch statische
  Vertragstests belegt.

### 4.4 Offizieller Security Advisor

- ERROR: 0 · CRITICAL: 0 · WARN: 2 (Typ 0029).
- Betroffen ausschließlich bekannte SEC-01-Baseline: `avkk_can_write`,
  `avkk_people_directory` — **nicht BSF-03D**.
- Neue BSF-03D-Findings (`reference_value_validate_scope`,
  `reference_value_track_change`, `workpackage.category`, neue Policies/Indizes):
  **NEIN**.

## 5. E2E-Realität

- `e2e/specs/*/workpackage-category.spec.ts` prüft das UI-Gating
  (Auswahl, Default keine Kategorie, Verwaltung nur für Berechtigte) mit
  **Data-API-Route-Mocking**.
- Die tatsächliche Durchsetzung von Viewer Write DENY und Cross-Systemhouse
  DENY ist **nicht** durch E2E, sondern durch das Live-SQL-Artefakt
  (T01–T16) nachgewiesen.

## 6. Restpunkte nach Paket Q

1. **Preview-Auth-Broker Re-Injection** (Plattform-Commit `b23c50f`): in
   Paket Q final entfernt — `previewAuthStorage.ts` gelöscht, `client.ts`
   bytegleich zum abgenommenen Vertrag `425fbed`;
   `supabase-client-contract.test.ts` 3/3 PASS. Restrisiko: Die Plattform
   kann die Datei bei künftigen Lovable-Turns erneut erzeugen; der
   Regressionstest macht dies in CI sichtbar.
2. **Historisch kein separater RED-Commit** für das frühe Paket 1 (siehe 3);
   spätere Pakete (Review-Fix 1/2, Governance-Fix, Help-Tests) haben
   dokumentierte RED→GREEN-Läufe.
3. Technical Debt: 2 High / 6 Medium bestehend (kein Blocker, Trendmetrik);
   neu in diesem Branch nur Low/Info (`ProjectDetailView.tsx` 423 Zeilen,
   heuristischer Orphan-Hinweis `shared-projection.functions.ts`,
   dokumentierte Konsolen-Ausnahme).

## 7. Zusammenfassung

| Punkt                          | Ergebnis                         |
| ------------------------------ | -------------------------------- |
| Fachvertrag #103 implementiert | JA                               |
| SQL-Artefakt T01–T16           | 16/16 PASS, Rollback             |
| Live-Schema-Vertrag            | PASS                             |
| Security Advisor Delta BSF-03D | sauber (0 neue Findings)         |
| DB dauerhaft geändert          | NEIN                             |
| Vollständige Quality Gates     | PASS (Paket Q, Abschnitt 8)      |
| Governance-Cleanup Broker      | PASS (Contract-Test 3/3)         |
| Gesamtstatus                   | FINAL PASS                       |

## 8. Paket Q — Gate-Matrix (2026-09-13, Workspace)

Governance-Cleanup wurde **vor** dem Gate-Lauf ausgeführt; der allerletzte
Check nach allen Builds/Tests/Doku-Schritten bestätigte den Zustand erneut.

| #   | Gate                       | Kommando                                                    | Ergebnis                                      |
| --- | -------------------------- | ----------------------------------------------------------- | --------------------------------------------- |
| 0   | Auth-Client-Vertrag        | `vitest run src/__tests__/security/supabase-client-contract.test.ts` | 3/3 PASS                             |
| 1   | Typecheck                  | `tsgo --noEmit`                                             | PASS                                          |
| 2   | Lint                       | `bun run lint`                                              | PASS                                          |
| 3   | Format                     | `prettier --check .`                                        | PASS                                          |
| 4   | No-Console                 | `bun run lint:no-console`                                   | PASS                                          |
| 5   | Vitest gesamt              | `bun run test`                                              | 101 Dateien / 765 PASS, 4 todo                |
| 6   | A11y (Unit/axe)            | `bun run test:a11y`                                         | 2 Dateien / 4 PASS                            |
| 7   | Security                   | `bun run test:security` (+ rbac:check, security:check)      | 15 Dateien / 112 PASS; CRIT 0 HIGH 0 MED 0     |
| 8   | Technical Debt             | `bun run test:debt`                                         | PASS (Critical 0; 3 neu, nur Low/Info)         |
| 9   | Docs                       | `bun run docs:check`                                        | PASS                                          |
| 10  | Projektstatus              | `bun run project-status:check`                              | PASS                                          |
| 11  | Bundle/Perf                | `bun run test:perf`                                         | PASS                                          |
| 12  | CI-Gate-Tests              | `bun run test:ci-gate`                                      | 12/12 PASS                                    |
| 13  | Production Build           | `bun run build`                                             | PASS                                          |
| 14  | E2E Kategorie              | `playwright test e2e/specs/security/workpackage-category.spec.ts` | 4/4 PASS                                |
| 15  | E2E gesamt (chromium)      | `playwright test --project=chromium`                        | 77/77 PASS (inkl. A11y-/Security-Specs)       |
| 16  | Beispieldateien            | `bun run test:examples`                                     | PASS                                          |
| 17  | API-Discovery-Gate         | `bun run api:gate`                                          | PASS                                          |
| 18  | Security-Report-Gate       | `bun run security:gate`                                     | PASS                                          |
| 19  | Technischer Prüfbericht    | `bun run report:technical`                                  | v15, passed-with-findings, 0 Blocker          |
| 20  | Quality Gate               | `bun run ci:gate`                                           | OK — 0 Blocker                                |

E2E lief mit `E2E_CHROMIUM_PATH` (repo-seitig vorgesehener Override), da die
Sandbox keine Playwright-Chromium-Binärdatei der Projektversion enthält.

Finaler Auth-Broker-Status: `src/integrations/supabase/previewAuthStorage.ts`
existiert nicht; `client.ts` ohne `previewAuthStorage`/`brokeredPreviewStorage`,
Storage-Zeile `typeof window !== "undefined" ? localStorage : undefined`.
