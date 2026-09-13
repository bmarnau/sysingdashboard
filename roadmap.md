# Roadmap

## BSF-03D (#103) Arbeitspaket-Kategorien
- [ ] Basis gegen GitHub main b90f93c prüfen
- [ ] Idempotente Repo-Migration für Reference-Data-Systemhouse-Scope (DB-Drift schließen)
- [ ] Reference-Data-Vertrag: scopeType/systemhouseId, CATALOG_KEYS.workPackageCategory (TDD)
- [ ] WorkPackage.categoryKey + Resolver-Modul (TDD)
- [ ] JSON-Schema 1.2.0 / Import-Fail-Safe / Export (TDD)
- [ ] Backup/Restore Kategorie-Referenz fail-safe (TDD)
- [ ] WorkPackageDialog Kategorie-Select + A11y-Test
- [ ] Kategorien-Verwaltungsdialog (referencedata.manage), Systemhaus-Scope
- [ ] SQL-Testartefakt D01–D08 (Rollback) + Advisor
- [ ] E2E AP-Kategorie + Viewer-DENY
- [ ] Gates: typecheck, lint, prettier, vitest, a11y, security, debt, docs, build, e2e
- [ ] Doku: REFERENCE-DATA, DATA-SCHEMA, RBAC, Help, CHANGELOG 1.62.0, CURRENT-STATUS, Nachweis

## BSF-03D Review-Fix Runde 1 (HIGH-2, MEDIUM-1, MEDIUM-2, LOW-1)
- [x] Migration: strukturelle Alt-Unique-Ablösung, FK-Check tabellenqualifiziert, scope_type Zielvertrag idempotent
- [x] Cache: readCache normalisiert Legacy-Snapshots (scopeType/systemhouseId)
- [x] Statische Migrationsvertragstests + Cache-Tests (RED→GREEN)

## BSF-03D Review-Fix Runde 2 (MEDIUM-1, LOW-1 aus Re-Review)
- [x] Test härten: Unique-Erkennung im isolierten SQL-Block, exakter Spaltenmengen-Ausdruck
- [x] SQL-Kommentar: CHECK-Constraint fail-loud bei ungültigen Altwerten

## Governance-Fix: Preview-Auth-Broker entfernen (Wiederherstellung 425fbed)
- [ ] Statischer Regressionstest (RED)
- [ ] previewAuthStorage.ts entfernen, client.ts Import/storage zurücksetzen
- [ ] Gates: targeted, Auth/Security-Tests, Typecheck, Lint/Prettier, Build
