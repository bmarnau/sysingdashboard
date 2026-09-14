# BSF-03D (#103) Status-Reconciliation — READ-ONLY

Geprüfter Stand: Workspace-HEAD `b23c50f` (= `0729911` + ein automatischer Plattform-Commit „Work in progress“, siehe Blocker F-1). Basis GitHub-main `b90f93c`. Keine Code-/DB-Änderung in diesem Turn.

## 0. Kritischer Vorbefund (Governance)

Der Plattform-Bot (`gpt-engineer-app[bot]`, 22:07:46 UTC) hat direkt nach `0729911` den Preview-Auth-Broker **erneut eingespielt**: `src/integrations/supabase/previewAuthStorage.ts` existiert wieder, `client.ts` Zeile 64 nutzt `brokeredPreviewStorage()`. Der Regressionstest `src/__tests__/security/supabase-client-contract.test.ts` ist aktuell **RED (3/3 failed)** — er tut genau das, wofür er gebaut wurde. Das ist kein Projektcode-Fehler, sondern das in der letzten Abnahme benannte Restrisiko; es ist eingetreten.

## 1. Roadmap-Tabelle

| Roadmappunkt | Status | Beleg | Restarbeit |
|---|---|---|---|
| Basis gegen main b90f93c prüfen | PRESENT | Diff b90f93c..HEAD nur additive BSF-03D-Dateien + Reviewfixes; `drizzle/schema.ts` +1 Kommentarzeile (auto-generated) | keine |
| Idempotente Repo-Migration Systemhouse-Scope | PRESENT (statisch) | `drizzle/migrations/0000_bsf03d_reference_data_systemhouse_scope.sql`; `src/__tests__/security/bsf03d-migration-contract.test.ts` (strukturelle Unique-Ablösung, conrelid-FK, scope_type-Zielvertrag, kein DROP TABLE/RESET) | Lauf gegen echte Postgres (alt + live) nicht belegt |
| Reference-Data-Vertrag scopeType/systemhouseId, CATALOG_KEYS | PRESENT | `src/lib/reference-data/*`, `cache.ts` Legacy-Normalisierung, `src/__tests__/lib/reference-data/cache.test.ts` | keine |
| WorkPackage.categoryKey + Resolver | PRESENT | `src/lib/dashboard-data.ts`, `src/lib/workpackage-category.ts`; Tests `workpackage-category.test.ts` (none/active/inactive/unknown, tags unabhängig, Gruppierung, stabile Keys) | keine |
| JSON-Schema 1.2.0 / Import fail-safe / Export | PRESENT | `json-schema.ts` (`JSON_SCHEMA_VERSION="1.2.0"`, `categoryKey` nullable optional), `json-import-service.ts` (`validateCategoryKeys`, `categoryReport`, Warnungen statt Umdeutung, `categoryKey ?? null`), `src/__tests__/io/workpackage-category-schema.test.ts` | Bestätigen, dass Import-Wizard das `categoryReport` dem Nutzer anzeigt (UI-Sichtbarkeit nicht separat getestet) |
| Backup/Restore Kategorie-Referenz fail-safe | PRESENT | `src/lib/backup/category-check.ts`, eingebunden in `src/lib/backup/restore.ts`; `src/__tests__/backup/workpackage-category-restore.test.ts` | keine |
| WorkPackageDialog Kategorie-Select + A11y-Test | PRESENT | `WorkPackageDialog.tsx` (`selectableCategoryValues`, `aria-describedby` Hinweis, `value || null`), `src/__tests__/components/WorkPackageDialog.category.test.tsx` mit axe | keine |
| Kategorien-Verwaltungsdialog (manage, Systemhaus-Scope) | PRESENT | `src/components/admin/WorkPackageCategoryDialog.tsx` (`usePermission("referencedata.manage")`, Systemhaus-Select, deaktivieren statt löschen, Reaktivieren), verlinkt in `routes/_authenticated/dashboard.tsx`; Test `WorkPackageCategoryDialog.test.tsx` mit axe | Key-Rename ist nur per DB-Trigger (T07) verhindert; UI bietet kein Rename — ok |
| SQL-Testartefakt D01–D08 + Advisor | PARTIAL | Datei heißt `supabase/tests/bsf03d-workpackage-category.sql`, Matrix **T01–T16** (nicht D01–D08): Katalog-Scope, AVKK global, Trigger, Unique je SH, Key-/SH-Immutabilität, anon DENY, Cross-SH Read/Insert/Update DENY, Viewer INSERT DENY, keine DELETE-Policy, History-Scope; alles in einer Transaktion mit ROLLBACK | Keine Ausführungsspur gegen Live-DB in den Docs; **kein Advisor-Nachweis für BSF-03D** (nur ältere Berichte BSF-03-P1/P5) |
| E2E AP-Kategorie + Viewer-DENY | PARTIAL | `e2e/specs/security/workpackage-category.spec.ts` 4 Tests (Default keine Kategorie, Mehrfach-Membership, Admin anlegen/deaktivieren, Viewer DENY) real gegen Preview lauffähig (4/4 in Paket-Bericht) — **aber** Fixture `workpackage-category-e2e.ts` überlagert die Data-API per `page.route`; Cross-SH/RLS wird dort gemockt, nicht vom Server erzwungen | Cross-SH-DENY ist nur im SQL-Artefakt echt; E2E belegt UI-Gating |
| Gates komplett | PARTIAL | Belegt: typecheck, eslint, prettier, vitest (760), build, security-unit-suite. Nicht belegt in diesem Stand: a11y-E2E-Lauf mit Kategorie-Dialogen, `technical-debt`, `docs:check`, Quality-Gate-Report, Security-Advisor; **supabase-client-contract-Test aktuell RED** | Vollständiger Gate-Lauf nach Broker-Entfernung |
| Doku: REFERENCE-DATA, DATA-SCHEMA, RBAC, Help, CHANGELOG 1.62.0, CURRENT-STATUS, Nachweis | MISSING | `docs/REFERENCE-DATA.md`, `docs/DATA-SCHEMA.md`, `docs/RBAC-MATRIX.md`: 0 Treffer für categoryKey/scope_type/systemhouse_id; `help-documentation.ts` ohne BSF-03D-Kapitel; CHANGELOG oberste Version **1.61.0** — 1.62.0 fehlt; kein `docs/BSF-03D-*.md` Nachweis | Komplettes Doku-Paket |

## 2. Abnahmeblock Issue #103

| Kriterium | Verdict | Beleg |
|---|---|---|
| Systemhausweit editierbarer Kategorienkatalog | PASS | WorkPackageCategoryDialog + RLS/Trigger T11–T15 |
| Alle Kunden desselben Systemhauses nutzen denselben aktiven Bestand | PASS | Scope `systemhouse` auf `reference_value.systemhouse_id`, kein kundenbezogenes Feld; `selectableCategoryValues` filtert nur nach Systemhaus/aktiv |
| Default keine Kategorie; optional/max. eine | PASS | `categoryKey?: string \| null`, Test `should_defaultToNoCategory_when_fieldMissingOrNull`, E2E-Test 1 |
| Stabile ID/Key statt Namensidentität | PASS | Key-Immutabilitätstrigger (T07), `toCategoryKey`, Gruppierung nach Key |
| Deaktivierte Kategorien bei Altbeständen nachvollziehbar | PASS | Resolver `inactive`, Select zeigt aktuelle inaktive Kategorie weiterhin (`plusCurrentInactiveOne`), keine stille Mutation (`should_reportUnknownAndInactive_withoutChangingValues`) |
| Keine billable/priority/status-Ableitung, Tags unabhängig | PASS | `workpackage-category.ts` enthält keine Ableitung; Test `should_keepTagsIndependent_when_categorySet` |
| Viewer Write DENY | PASS (DB statisch) / PARTIAL (Live) | T11 im SQL-Artefakt; E2E Viewer-DENY nur UI-Gating mit Mock |
| Cross-Systemhouse DENY | PASS (DB statisch) / PARTIAL (Live) | T10/T12/T15/T16; kein E2E gegen echte RLS |
| Import/Export/Backup rückwärtskompatibel | PASS | Schema 1.2.0 nullable/optional, Legacy-Cache-Normalisierung, `category-check.ts` in Restore |
| Security + CI/E2E/A11y/Tech-Debt/Quality-Gate ohne neue Regression | MISSING | Kein vollständiger Gate-Lauf; Advisor-Nachweis fehlt; Client-Contract-Test RED |
| Dokumentation/Version | MISSING | siehe Tabelle |

## 3. Nächste Ausführungsreihenfolge (max. 4 Pakete)

1. **Paket G — Governance-Wiederherstellung**: Broker erneut entfernen (`previewAuthStorage.ts` löschen, `client.ts` Zeile 64 auf `localStorage`-Vertrag), Contract-Test GREEN. Gates: targeted test, Security-Suite, typecheck, lint, build. Zusätzlich: CI-Job so einhängen, dass der Contract-Test ein harter Gate-Bestandteil ist (nur falls noch nicht in `quality-gate.mjs` — zu prüfen, nicht angenommen).
2. **Paket V — DB-Verifikation**: `supabase/tests/bsf03d-workpackage-category.sql` real gegen Live-DB ausführen (Rollback), Ergebnis T01–T16 protokollieren; offiziellen Security-Advisor-Lauf durchführen und Delta gegen SEC-01-Baseline dokumentieren; Migration-Wiederholungslauf (2. Lauf) nachweisen. Gates: SQL-Ausgabe, Advisor-Report als `docs/BSF-03D-DB-VERIFICATION-<Datum>.md`.
3. **Paket D — Dokumentation/Version**: `docs/REFERENCE-DATA.md` (Scope-Typen, Katalog `workpackage.category`), `docs/DATA-SCHEMA.md` (Spalten, Trigger, Indizes, Schema 1.2.0), `docs/RBAC-MATRIX.md` (Hinweis Kategoriepflege = `referencedata.manage`, Viewer unverändert), HelpTopic in `help-documentation.ts`, `CHANGELOG.md` 1.62.0, `docs/CURRENT-STATUS.md`, Entwicklungstagebuch. Gates: `docs:check`, DevDiary-Test, prettier.
4. **Paket Q — Vollständiger Gate-Lauf + Abnahmebericht**: typecheck, lint, prettier, vitest, a11y (unit + E2E), security, technical-debt, docs, build, E2E komplett (inkl. Kategorie-Spec 4/4); Abnahmebericht `docs/BSF-03D-CLOSURE-<Datum>.md` mit Ausgangs-SHA, Commit-SHA, Gates, Restrisiken. Danach PR gegen GitHub-main.

## 4. Blocker für FINAL PASS

- **F-1 (BLOCKER)**: Preview-Auth-Broker durch Plattform re-injiziert; Contract-Test RED. Ohne Paket G darf nichts als abgenommen gelten. Restrisiko bleibt: die Plattform kann die Datei erneut regenerieren — der Test muss in CI hart blockieren.
- **B-1 (BLOCKER)**: Kein offizieller Security-Advisor-Nachweis für BSF-03D und kein Live-Lauf des SQL-Artefakts dokumentiert.
- **B-2 (BLOCKER)**: Doku-Sync-Pflicht verletzt (Core-Regel): kein HelpTopic, kein CHANGELOG 1.62.0, REFERENCE-DATA/DATA-SCHEMA/RBAC ohne BSF-03D-Inhalt.
- **B-3 (HIGH)**: Vollständiger Gate-Lauf (a11y-E2E, technical-debt, docs:check, quality-gate) nicht belegt.
- **B-4 (MEDIUM, Restrisiko, kein Blocker)**: E2E belegt Cross-SH/Viewer nur über Mock-Fixture; echte Durchsetzung nur im SQL-Artefakt. Akzeptabel, wenn Paket V den Live-Lauf liefert.
- Historisch (bekannt, nicht neu): fehlender separater RED-Commit für Paket 1; globale AVKK-Werte für Manager mit `referencedata.manage` schreibbar (außerhalb #103-Scope, als Folge-Issue empfohlen).

## 5. Vorschlag korrigierte roadmap.md (nicht angewendet)

```text
## BSF-03D (#103) Arbeitspaket-Kategorien
- [x] Basis gegen GitHub main b90f93c prüfen
- [x] Idempotente Repo-Migration Reference-Data-Systemhouse-Scope (statisch getestet; Live-Lauf offen -> Paket V)
- [x] Reference-Data-Vertrag: scopeType/systemhouseId, CATALOG_KEYS.workPackageCategory (TDD)
- [x] WorkPackage.categoryKey + Resolver-Modul (TDD)
- [x] JSON-Schema 1.2.0 / Import-Fail-Safe / Export (TDD)
- [x] Backup/Restore Kategorie-Referenz fail-safe (TDD)
- [x] WorkPackageDialog Kategorie-Select + A11y-Test
- [x] Kategorien-Verwaltungsdialog (referencedata.manage), Systemhaus-Scope
- [ ] SQL-Testartefakt T01–T16 gegen Live-DB ausführen + Security-Advisor-Nachweis (Paket V)
- [x] E2E AP-Kategorie + Viewer-DENY (UI-Gating, Mock-Fixture; Cross-SH nur DB-Test)
- [ ] Gates vollständig: typecheck, lint, prettier, vitest, a11y, security, debt, docs, build, e2e (Paket Q)
- [ ] Doku: REFERENCE-DATA, DATA-SCHEMA, RBAC, Help, CHANGELOG 1.62.0, CURRENT-STATUS, Nachweis (Paket D)

## Governance-Fix: Preview-Auth-Broker entfernen (Wiederherstellung 425fbed)
- [x] Statischer Regressionstest
- [x] previewAuthStorage.ts entfernen, client.ts zurücksetzen (0729911)
- [ ] REGRESSION: Broker durch Plattform-Commit b23c50f erneut eingespielt — Test RED, erneut entfernen (Paket G)
```
