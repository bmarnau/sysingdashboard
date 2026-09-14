# BSF-03D — Technischer Nachweis Arbeitspaket-Kategorien (Issue #103)

Stand: 2026-09-14
Version: 1.62.0
Status: **ARCHITEKTURKORREKTUR UMGESETZT — GITHUB-CI AUSSTEHEND**

Der frühere Paket-Q-Status „FINAL PASS“ wurde am 14.09.2026 durch den
Whole-Branch-Review wieder geöffnet: BSF-03D hatte unbeabsichtigt Drizzle als
zweites Migrationssystem eingeführt. Das widerspricht der verbindlichen
Projektarchitektur, nach der Supabase/Postgres führend ist und Repo-Migrationen
unter `supabase/migrations/` liegen. ARCH-DRIZZLE-01 korrigiert diesen Drift;
ein erneuter FINAL PASS wird erst nach den GitHub-Gates vergeben.

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

Nicht Teil des Fachscopes: Shared Projection, BSF-02C-RPC und BSF-03 P5.
Auth-/Preview-Änderungen sind ausdrücklich nicht Teil von BSF-03D.

## 2. Nachvollziehbare Basis und zentrale Commits

| Bezug                                                          | SHA                                        |
| -------------------------------------------------------------- | ------------------------------------------ |
| GitHub-`main`-Basis des BSF-03D-Whole-Branch-Reviews           | `b90f93c41dd42f0cd58f68bbef39b103419d4df6` |
| Vor ARCH-DRIZZLE-01 geprüfter Arbeitsstand                     | `833f61f5ec3e22c84617e3c0bc4698bab12eb2e0` |
| Drizzle-Einführung                                             | `8a75038b9025c5abc47a7221e320b1e8744d021b` |
| Unmittelbarer Vor-Drizzle-Paketgraph                           | `9135a672346a4e310abaaf1e90a488dd89127d8c` |
| ARCH-DRIZZLE-01 RED-Vertragstest                               | `c95fe9ae4cbee1623b69295bb15a70272c1a962c` |
| ARCH-DRIZZLE-01 Architekturfix                                 | `1090897aa8edd024829e9ff904ea7175aae41f34` |
| Erster nachvollziehbarer Preview-Broker-Cleanup dieser Session | `072991129822835f6f5551db766132413523f67d` |
| Historisch abgenommener Auth-Client-Vertrag                    | `425fbed6cecbf5900a0eda17c735f90221d31d8d` |

`b619596` wird nicht als definitive erste Broker-Entfernung verwendet; der
nachvollziehbare Cleanup dieser Session ist `0729911…`.

## 3. ARCH-DRIZZLE-01 — Architekturkorrektur

### Befund

Der Whole-Branch-Review fand im BSF-03D-Zweig:

- `drizzle.config.ts` mit `LOVABLE_DB_MIGRATION_URL`,
- `drizzle/schema.ts`,
- `drizzle/migrations/*`,
- `drizzle-kit` und `drizzle-orm` im Paketgraph.

Das war ein Architekturdrift und kein beabsichtigter Technologieentscheid.

### Korrektur

- Kanonische Repo-Migration:
  `supabase/migrations/20260913213000_bsf03d_workpackage_category_reference_data.sql`.
- Der SQL-Inhalt wurde beim Verschieben **nicht verändert**: alter und neuer
  Pfad besitzen denselben Git-Blob `c5dad976ee5cd9e94b29f2eb94c1026fdf3c3693`.
- `drizzle.config.ts` und das komplette `drizzle/` wurden entfernt.
- `drizzle-kit` und `drizzle-orm` wurden entfernt.
- `package.json` und `bun.lock` wurden exakt auf die geprüften Blobs des
  unmittelbaren Vor-Drizzle-Stands zurückgesetzt:
  - `package.json`: `47f90eb3affd4742515edb7cfd3474842e6000b1`
  - `bun.lock`: `633927ca78cbf1c4b6f3e95ad1c9033fad2035a0`
- Es wurde kein alternatives zweites Migrationsframework eingeführt.
- Die Live-Datenbank wurde durch ARCH-DRIZZLE-01 **nicht** verändert.

### TDD-Nachweis

Der Architekturvertrag liegt separat in
`src/__tests__/security/bsf03d-migration-location-contract.test.ts` und wurde
vor dem Fix in Commit `c95fe9a…` eingecheckt. Gegen diesen Ausgangsstand sind
seine Voraussetzungen nachweislich verletzt (Drizzle-Dateien und -Pakete
vorhanden, kanonische Supabase-Migration noch nicht vorhanden). Der echte
Runtime-GREEN-Nachweis folgt über die GitHub-CI des Pull Requests.

## 4. Paket V — Live-DB-Verifikation vom 13.09.2026

Ausgeführt gegen die mit dem Lovable-Projekt verbundene Supabase-Datenbank,
ohne Secrets im Nachweis:

- `supabase/tests/bsf03d-workpackage-category.sql`
- genau eine Transaktion `BEGIN … ROLLBACK`, fail-fast
- **T01–T16: 16/16 PASS**
- synthetische Testdaten vor und nach dem Lauf: 0
- **DB dauerhaft geändert: NEIN**

Live-Schema-Vertrag: PASS für `scope_type`, `systemhouse_id` + FK
`ON DELETE RESTRICT`, partielle Unique-Indizes, Scope-Trigger, History-Scope,
RLS und fehlende DELETE-Policy.

Offizieller Supabase Security Advisor:

- ERROR 0
- CRITICAL 0
- WARN 2, ausschließlich bekannte SEC-01-Baseline
  (`avkk_can_write`, `avkk_people_directory`)
- neue BSF-03D-Findings: **0**

Die Repo-Migration wurde bei dieser Verifikation nicht erneut live angewendet.

## 5. E2E-Realität

`e2e/specs/security/workpackage-category.spec.ts` prüft UI-Gating und
Kategorienutzung mit Data-API-Route-Mocking. Die echte Durchsetzung von Viewer
Write DENY und Cross-Systemhouse DENY ist durch das Live-SQL-Artefakt T01–T16
nachgewiesen. UI-Gating ist keine Sicherheitsgrenze.

## 6. Paket Q — bereits bestandene Workspace-Gates vor ARCH-DRIZZLE-01

Vor dem Whole-Branch-Architekturreview waren u. a. bestanden:

- Auth-Client-Contract 3/3
- Typecheck, Lint, No-Console, Format
- Vitest: 101 Dateien / 765 PASS / 4 todo
- A11y: 4/4
- Security: 112/112; CRITICAL/HIGH/MEDIUM 0
- Technical Debt Gate, docs:check, project-status:check, Bundle/Perf
- CI-Gate-Tests 12/12
- Production Build
- Kategorie-E2E 4/4
- Chromium-E2E 77/77
- Beispiele, API-Gate, Security-Gate
- Technischer Prüfbericht v15, 0 Blocker
- `ci:gate`: OK

Diese Ergebnisse bleiben als Vorbefund dokumentiert, ersetzen nach Änderung
von Paketgraph und Migrationspfad aber **nicht** den erneuten GitHub-CI-Lauf.

## 7. Governance Auth-Broker

Der finale Zielvertrag bleibt:

- `src/integrations/supabase/previewAuthStorage.ts` existiert nicht,
- `client.ts` enthält weder `previewAuthStorage` noch
  `brokeredPreviewStorage`,
- Auth-Storage:
  `typeof window !== "undefined" ? localStorage : undefined`,
- Regressionstest `supabase-client-contract.test.ts` muss 3/3 PASS liefern.

Lovable hatte den Broker in dieser Session mehrfach unbeauftragt reinjiziert;
deshalb ist dieser Contract ein verpflichtendes Release-Gate.

## 8. Aktueller Abnahmestatus

| Punkt                               | Status                        |
| ----------------------------------- | ----------------------------- |
| Fachvertrag #103 implementiert      | PASS                          |
| Live-SQL T01–T16                    | 16/16 PASS, ROLLBACK          |
| Live-Schema                         | PASS                          |
| Security-Advisor-Delta              | PASS, 0 neue BSF-03D-Findings |
| ARCH-DRIZZLE-01 Codekorrektur       | PASS, statisch verifiziert    |
| Kanonischer Supabase-Migrationspfad | PASS                          |
| Drizzle-Artefakte/Pakete            | 0 im korrigierten Branch      |
| GitHub-CI nach Architekturkorrektur | **AUSSTEHEND**                |
| Merge / Deploy                      | NEIN                          |
| Gesamtstatus                        | **PARTIAL — CI-AUSSTEHEND**   |

FINAL PASS wird erst nach erfolgreichem PR-CI-/Security-Lauf auf dem exakten
Head-SHA wieder vergeben.
