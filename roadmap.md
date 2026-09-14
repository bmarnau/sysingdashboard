# Roadmap

## BSF-KIOSK-01 (#135) Info-Kiosk Demo-Pilot

- [x] Kiosk-first-Roadmap als verbindliche interne Reihenfolge übernommen
- [x] Providerneutraler `KioskDataProvider` und lokaler Demo-Provider
- [x] Großbild-Kioskansicht mit dauerhaftem Hinweis `DEMO-DATEN — KEINE LIVE-DATEN`
- [x] Zustände `default`, `empty`, `unknown`, `error`, `not_loaded` und Last-good-Verhalten
- [x] Technische Rolle `kiosk` + atomare Permission `kiosk.view`
- [x] Kiosk-Konto auf `/kiosk` beschränkt; keine normalen Dashboard-/Schreib-/Adminrechte
- [x] Idle-Logout-Ausnahme nur für exklusiven Kiosk-Betrieb; Auth-/Sperr-/Logout-Prüfungen bleiben aktiv
- [x] Versionierter lokaler Kiosk-Demodatensatz, idempotent ladbar und vollständig entfernbar
- [x] Demo-JSON-Vertrag `sysing.kiosk.demo.v1` mit 256-KiB-Limit und fail-closed Validierung
- [x] Versionierter Referenzdatensatz `docs/examples/kiosk-demo-dataset-v1.json`
- [x] JSON-Demoimport atomar in das bestehende lokale Kiosk-Demo-Repository; Last-good bleibt bei Fehler erhalten
- [x] Kiosk-Demo-Steuerung im bestehenden Service-/Demo-Dialog: laden, JSON importieren, entfernen
- [x] TDD-Nachweise für Parser, Repository, Service, Provider und UI-Wiring
- [ ] Exact-Head-Gates: Prettier, ESLint, TypeScript, RBAC, Unit/Components, Security, Build, E2E, A11y, Technical Debt, Quality Gate
- [ ] Dokumentation/Version 1.63.0 vollständig synchronisieren
- [ ] PR #141 Review-Status und Abschlussnachweis aktualisieren
- [ ] Merge/Deploy nur nach separater Freigabe

### Abgrenzung

KIOSK-01 enthält ausschließlich synthetische, lokale Demo-Daten. Der allgemeine providerneutrale Import mit realen/partiellen Quelldaten, Provenienz, Freshness und Customer-/Systemhouse-Scope bleibt BSF-05A vorbehalten.

### Nächster interner Schritt nach KIOSK-01

`BSF-03A (#106) → KIOSK-02 (#136)`

---

## BSF-03D (#103) Arbeitspaket-Kategorien — DONE

- [x] Basis gegen GitHub main b90f93c prüfen
- [x] Idempotente Repo-Migration für Reference-Data-Systemhouse-Scope (DB-Drift schließen)
- [x] Reference-Data-Vertrag: scopeType/systemhouseId, CATALOG_KEYS.workPackageCategory (TDD)
- [x] WorkPackage.categoryKey + Resolver-Modul (TDD)
- [x] JSON-Schema 1.2.0 / Import-Fail-Safe / Export (TDD)
- [x] Backup/Restore Kategorie-Referenz fail-safe (TDD)
- [x] WorkPackageDialog Kategorie-Select + A11y-Test
- [x] Kategorien-Verwaltungsdialog (referencedata.manage), Systemhaus-Scope
- [x] SQL-Testartefakt T01–T16 (Rollback, live 16/16 PASS) + Advisor (0 neue BSF-03D-Findings)
- [x] E2E AP-Kategorie + Viewer-DENY (UI-Gating per Route-Mock; echte RLS-Durchsetzung durch Live-SQL-Artefakt belegt)
- [x] Gates: typecheck, lint, prettier, vitest, a11y, security, debt, docs, build, e2e (Paket Q 2026-09-13, alle grün; E2E 77/77, Kategorie 4/4)
- [x] Doku: REFERENCE-DATA, DATA-SCHEMA, RBAC, Help, CHANGELOG 1.62.0, CURRENT-STATUS, Nachweis
- [x] Governance: finaler Cleanup des erneut eingespielten Preview-Auth-Brokers (Contract-Test 3/3)
- [x] GitHub: Branch + PR #134, Security/CI PASS und Merge auf `main`

## BSF-03D Review-Fix Runde 1 (HIGH-2, MEDIUM-1, MEDIUM-2, LOW-1)

- [x] Migration: strukturelle Alt-Unique-Ablösung, FK-Check tabellenqualifiziert, scope_type Zielvertrag idempotent
- [x] Cache: readCache normalisiert Legacy-Snapshots (scopeType/systemhouseId)
- [x] Statische Migrationsvertragstests + Cache-Tests (RED→GREEN)

## BSF-03D Review-Fix Runde 2 (MEDIUM-1, LOW-1 aus Re-Review)

- [x] Test härten: Unique-Erkennung im isolierten SQL-Block, exakter Spaltenmengen-Ausdruck
- [x] SQL-Kommentar: CHECK-Constraint fail-loud bei ungültigen Altwerten

## Governance-Fix: Preview-Auth-Broker entfernen (Wiederherstellung 425fbed)

- [x] Statischer Regressionstest (RED)
- [x] previewAuthStorage.ts entfernen, client.ts Import/storage zurücksetzen
- [x] Gates: targeted, Auth/Security-Tests, Typecheck, Lint/Prettier, Build

## BSF-03D Paket V — DB-Verifikation (read-only, kein Commit/Deploy)

- [x] Vorcheck Tabellen/Katalog/synthetische IDs
- [x] SQL-Testartefakt T01–T16 in einer Transaktion mit ROLLBACK ausführen
- [x] Live-Schema-Vertrag der Repo-Migration strukturell prüfen (keine DDL)
- [x] Offizieller Security Advisor, BSF-03D-Delta gegen SEC-01-Baseline

## BSF-03D Paket D — Dokumentation / Version / Nachweis

- [x] REFERENCE-DATA, DATA-SCHEMA, RBAC-MATRIX ergänzen
- [x] Help-Topic Arbeitspaket-Kategorien + Help-Tests
- [x] Version 1.62.0 + CHANGELOG-Eintrag
- [x] CURRENT-STATUS / PROJECT-STATUS.yaml
- [x] docs/BSF-03D-VERIFICATION-2026-09-13.md
- [x] Roadmap Ist-Stand, Gates (docs:check, prettier, eslint, typecheck, Help-Tests)
