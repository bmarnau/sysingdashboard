# BSF-03A Project Controlling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task. Apply test-driven-development to every product change and verification-before-completion before any PASS/DONE claim.

**Goal:** Eine serverseitig abgesicherte, read-only Projektmanager-Leistungssicht mit Zeitraum-, Customer-, Projekt-, AP-, Kategorie- und Billable-Filter sowie reproduzierbaren Stundenaggregaten bereitstellen.

**Architecture:** Providerneutrale Controlling-Fachlogik konsumiert ein Repository. Der Supabase-Adapter läuft ausschließlich mit dem User-JWT hinter einer TanStack Server Function. Eine neue atomare Permission `project.controlling.view` begrenzt die Funktion. Die bestehende Shared Projection bleibt Datenbasis und wird nur um den BSF-03D-Kategorie-Key plus Legacy-Beobachtungsstatus erweitert.

**Tech Stack:** TypeScript, React, TanStack React Start/Router, Supabase/PostgreSQL, Zod, Vitest, Playwright, vitest-axe, Bun, GitHub Actions.

**Spec:** `docs/BSF-03A-DESIGN.md`, Issue #106.

## Global Constraints

- Implementierung beginnt erst von der dann aktuellen `main`-Baseline.
- Kein direkter Write auf `main`.
- Kein Service-Role-Normalpfad.
- `Project.lead` und Anzeigenamen sind niemals Sicherheitsidentität.
- Keine Project-Responsibility-Tabelle in BSF-03A.
- Kein Personenverzeichnis nur für diese Sicht.
- Keine Eurobeträge aus lokalen Stundensätzen ableiten.
- Keine still abgeschnittenen Summen.
- `billable` und `billingStatus` bleiben getrennte Fachfelder.
- Kategorieidentität ist `categoryKey`, nie das Label.
- DB-Änderungen nur gemäß `docs/DATABASE-CHANGE-GOVERNANCE.md`.
- Der bestehende BSF-02C-Publish-RPC bleibt `SECURITY INVOKER`.
- Bestehende BSF-02C-Security-/Atomicity-Verträge dürfen nicht gelockert werden.
- TDD vor Produktcode.
- Kein Merge und kein Deploy ohne separate Freigabe.

---

## Task 1: Permission-Vertrag `project.controlling.view`

**Files:**

- Modify: `src/lib/rbac/permissions.ts`
- Modify: `backend/services/rbac.mjs`
- Modify: `docs/RBAC-MATRIX.md`
- Create/modify: passende RBAC-Tests
- DB migration: `has_permission` spiegeln

- [ ] Roten RBAC-Test ergänzen: sysadmin/admin/teamlead/projectmanager = allow; engineer/viewer/customer = deny.
- [ ] `project.controlling.view` als atomare Permission in Frontend und Backend ergänzen.
- [ ] DB-`has_permission` in einer neuen Migration spiegeln; keine alte Migration editieren.
- [ ] RBAC-Matrix aktualisieren.
- [ ] `bun run rbac:check` und gezielte Security-Tests grün nachweisen.

**Commit-Ziel:** `feat(rbac): project controlling view permission ergänzen`

---

## Task 2: Kategorie durch den providerneutralen Shared-Projection-Vertrag führen

**Files:**

- Modify: `src/lib/customer-data/types.ts`
- Modify: `src/lib/customer-data/migration.ts`
- Modify: `src/lib/customer-data/shared-projection-runtime.ts`
- Modify: `src/integrations/supabase/shared-projection-adapter.ts`
- Modify: bestehende Shared-Projection Unit-Tests

- [ ] Roten Test schreiben: `WorkPackage.categoryKey` gelangt in `SharedWorkPackageProjection`.
- [ ] Roten Test schreiben: `SharedWorkPackageRecord` unterscheidet `categoryObserved=false`, `true + null`, `true + key`.
- [ ] `SharedWorkPackageProjection` um `categoryKey?: string | null` erweitern.
- [ ] Migration Plan übernimmt `workPackage.categoryKey ?? null`.
- [ ] Publish-Payload sendet `category_key` explizit, auch bei `null`.
- [ ] Source Hash nimmt `categoryKey` auf.
- [ ] Read-Record erhält `categoryKey` und `categoryObserved`.
- [ ] Unit-/Contract-Tests grün nachweisen.

**Commit-Ziel:** `feat(bsf03a): Kategorie in Shared Projection Vertrag aufnehmen`

---

## Task 3: Additive DB-Migration für Kategorie und Permission

**Files:**

- Create: neue `supabase/migrations/<timestamp>_bsf03a_project_controlling.sql`
- Create: `supabase/tests/bsf03a-project-controlling.sql`
- Modify: generated Supabase types nur nach real angewandtem Schema

**DDL-Ziel:**

```text
ALTER shared_work_package_projection
  ADD category_key text NULL
  ADD category_observed boolean NOT NULL DEFAULT false

INDEX auf systemhouse/customer/category für aktive Zeilen

CREATE OR REPLACE has_permission mit project.controlling.view

CREATE OR REPLACE bsf02c_publish_shared_projection_snapshot
  weiterhin SECURITY INVOKER
  category_key rückwärtskompatibel verarbeiten
```

- [ ] Vor Änderung Live-Katalog, Funktionsattribute, ACLs, Policies und Migrationshistorie read-only prüfen.
- [ ] SQL-Testartefakt zuerst mit erwarteten Vertragsprüfungen anlegen.
- [ ] Migration ausschließlich additiv schreiben.
- [ ] Alte Payload ohne `category_key`: Insert -> unobserved; Update -> bestehende Kategorie unverändert.
- [ ] Neue Payload mit `category_key:null`: observed=true und key=null.
- [ ] Neue Payload mit Key: observed=true und Key unverändert gespeichert.
- [ ] RPC bleibt `prosecdef=false` / SECURITY INVOKER.
- [ ] T01 ff. für Permission, Scope, Legacy, None, Key, Update, Atomic rollback und DENY-Fälle transaktional ausführen.
- [ ] Null-Residuen bestätigen.
- [ ] Bestehende BSF-02C-SQL-Regression vollständig erneut ausführen.
- [ ] Generated Types erst nach nachgewiesenem Live-Schema aktualisieren.

**Commit-Ziel:** `feat(bsf03a): Shared Projection für Kategorie und Controlling absichern`

---

## Task 4: Providerneutralen Controlling-Vertrag TDD definieren

**Files:**

- Create: `src/lib/project-controlling/project-controlling-contract.ts`
- Create: `src/lib/project-controlling/project-controlling.ts`
- Create: `src/__tests__/lib/project-controlling.test.ts`

**Vertrag:**

```text
ProjectControllingFilters
ProjectControllingScopeOption
ProjectControllingCategoryState
ProjectControllingRow
ProjectControllingSummary
ProjectControllingTrendPoint
ProjectControllingResult
ProjectControllingRepository
```

- [ ] Roten Test für inklusive Datumsgrenzen schreiben.
- [ ] Roten Test für `from > to` und Zeitraum > 366 Tage schreiben.
- [ ] Roten Test für billable/all/non-billable schreiben.
- [ ] Roten Test für Category `unobserved`, `none`, active/inactive/unknown schreiben.
- [ ] Roten Test für abhängige Scope-Identitäten schreiben.
- [ ] Roten Test für 5001 Zeilen -> expliziter Too-Many-Results-Fehler schreiben.
- [ ] Roten Test für reproduzierbare Summen aus denselben gefilterten Zeilen schreiben.
- [ ] Roten Test für tägliche Trendpunkte schreiben.
- [ ] Minimalen providerneutralen Service implementieren.
- [ ] Tests grün nachweisen.

**Commit-Ziel:** `feat(bsf03a): providerneutrales Controlling-Modell implementieren`

---

## Task 5: Supabase-Read-Adapter mit User-JWT

**Files:**

- Create: `src/integrations/supabase/project-controlling-adapter.ts`
- Create: `src/__tests__/integration/project-controlling-adapter.test.ts`

**Read-Pfade:**

- eigene aktive `customer_access`-Scopes,
- RLS-sichtbare `customer`-Daten,
- aktive Shared Projects,
- aktive Shared WorkPackages inklusive Kategorie,
- aktive Shared Activities im Zeitraum,
- systemhausbezogene `workpackage.category` Reference Data.

- [ ] Adapter-Test mit synthetischem Supabase-Client/Fakes rot schreiben.
- [ ] Nur User-JWT-Client akzeptieren; kein Admin-/Service-Client.
- [ ] Customer-Scope-Optionen aus eigener Access-Menge bilden.
- [ ] Activity-Abfrage serverseitig auf Datumsbereich und optionale IDs begrenzen.
- [ ] Maximal 5001 Activities laden; keine stille `.limit(5000)`-Trunkierung als reguläres Ergebnis.
- [ ] Parent-Maps nur aus RLS-sichtbaren Rows bilden.
- [ ] Kategorie-Labels aus `workpackage.category` auflösen; unbekannte/inaktive Keys bewahren.
- [ ] Integrationstest grün nachweisen.

**Commit-Ziel:** `feat(bsf03a): Supabase Controlling Read Adapter ergänzen`

---

## Task 6: Server Function und fail-closed Autorisierung

**Files:**

- Create: `src/lib/project-controlling-runtime/project-controlling.functions.ts`
- Create: `src/__tests__/backend/project-controlling.functions.test.ts`
- Create/extend: Security-Tests

**Server-Pfad:**

```text
Browser
  -> TanStack Server Function
      -> requireSupabaseAuth
      -> has_permission(user, project.controlling.view)
      -> ProjectControllingService
      -> Supabase User-JWT Adapter
      -> Grants + RLS
```

- [ ] Validator mit UUID-/ISO-Date-/abhängigen Filterregeln rot testen.
- [ ] Unauthenticated DENY testen.
- [ ] Engineer/Viewer/Customer DENY testen.
- [ ] Inaktives Konto DENY testen.
- [ ] Fremdes Systemhaus/Customer/Project/WP manipulieren und fail-closed testen.
- [ ] Generische Ablehnung ohne Existenzaussage verwenden.
- [ ] Server Function implementieren.
- [ ] Backend-/Security-Tests grün nachweisen.

**Commit-Ziel:** `feat(bsf03a): Controlling Server Function absichern`

---

## Task 7: Route und read-only UI TDD

**Files:**

- Create: `src/routes/_authenticated/projektcontrolling.tsx`
- Create: `src/components/project-controlling/ProjectControllingView.tsx`
- Create: `src/components/project-controlling/ProjectControllingFilters.tsx`
- Create: `src/components/project-controlling/ProjectControllingSummary.tsx`
- Create: `src/components/project-controlling/ProjectControllingDrilldown.tsx`
- Modify: `src/routes/_authenticated/dashboard.tsx`
- Create: Component-Tests

- [ ] Roten Permission-/Route-Test schreiben.
- [ ] Route unter `_authenticated` mit `project.controlling.view` UI-Gate anlegen.
- [ ] Dashboard-Link nur unter derselben Permission anzeigen.
- [ ] Default-Zeitraum „aktueller Monat bis heute“ setzen.
- [ ] Filterkaskade Systemhaus -> Kunde -> Projekt -> AP umsetzen.
- [ ] Kategorie erst im eindeutigen Systemhouse-Kontext auswählbar machen.
- [ ] Billable-Filter `Alle / Abrechenbar / Nicht abrechenbar` umsetzen.
- [ ] KPI-Summary und täglichen Stundenverlauf darstellen.
- [ ] Drill-down Kunde -> Projekt -> AP -> Tätigkeit darstellen.
- [ ] `Ohne Projekt`, `Ohne Arbeitspaket`, `Kategorie nicht publiziert`, `Keine Kategorie`, inactive/unknown explizit rendern.
- [ ] Keine Edit-/Finalisierungsaktion anbieten.
- [ ] Keine Engineer-ID oder interne DB-UUID im normalen UI anzeigen.
- [ ] Generated Route Tree nur über Projekttooling erzeugen.
- [ ] Component-/TypeScript-/Lint-Tests grün nachweisen.

**Commit-Ziel:** `feat(bsf03a): Projektcontrolling read-only UI bereitstellen`

---

## Task 8: Accessibility und E2E

**Files:**

- Create: `src/__tests__/a11y/project-controlling.test.tsx`
- Create: `e2e/specs/project-controlling/project-controlling.spec.ts`
- Create: `e2e/specs/security/project-controlling-scope.spec.ts`

- [ ] A11y für Filter, KPI, Trend, Drill-down und leere/unknown Zustände testen.
- [ ] E2E: berechtigter Projektmanager sieht Route und Filter.
- [ ] E2E: Viewer/Engineer/Customer sehen keine Controlling-Sicht.
- [ ] E2E: Zeitraum, Customer, Projekt, AP, Kategorie, Billable funktionieren.
- [ ] E2E: Summen ändern sich reproduzierbar mit denselben Daten.
- [ ] E2E: Unknown/Legacy-Kategorie bleibt sichtbar und wird nicht umgedeutet.
- [ ] Security-E2E: manipulierte fremde IDs liefern keine fremden Daten.
- [ ] Alle targeted Tests grün nachweisen.

**Commit-Ziel:** `test(bsf03a): Controlling E2E und Scope absichern`

---

## Task 9: Gezielter Lovable UI-Pass

**Files:**

- Nur visuelle Controlling-Komponenten, sofern nötig.
- Keine DB-/Auth-/Provideränderung in diesem Task.

- [ ] Prompt aus `docs/LOVABLE-PROMPT-PLAN-BSF-03A.md` verwenden.
- [ ] Lovable zuerst analysieren lassen.
- [ ] Filterdichte, Tabellenlesbarkeit, KPI-Hierarchie und Responsive-Verhalten prüfen.
- [ ] Keine Architektur-/RBAC-/DB-Änderung zulassen.
- [ ] `client.ts` und `previewAuthStorage.ts` auf Drift prüfen.
- [ ] Targeted Component/A11y/E2E erneut grün nachweisen.

**Commit-Ziel:** `style(bsf03a): Controlling UI gezielt verfeinern`

---

## Task 10: Dokumentation, Live-Advisor und vollständige Gates

**Files:**

- Create: `docs/BSF-03A-CLOSURE-2026-09-14.md`
- Modify: `docs/ENTWICKLUNGSTAGEBUCH.md`
- Modify: `docs/CURRENT-STATUS.md`
- Modify: `docs/PROJECT-STATUS.yaml`
- Modify: `docs/BSF-CURRENT-PRIORITIES.md`
- Modify: `docs/RBAC-MATRIX.md`
- Modify: technischer Prüfbericht
- Modify: `CHANGELOG.md`

- [ ] Offiziellen Supabase Security Advisor read-only ausführen.
- [ ] Neue BSF-03A ERROR/CRITICAL/WARN-Findings müssen erklärt beziehungsweise behoben sein.
- [ ] Bekannte SEC-01-Baseline getrennt dokumentieren.
- [ ] BSF-02C-Regressionssuite real ausführen.
- [ ] Vollständige Repository-Checks ausführen.

```bash
bunx prettier --check .
bun run lint
bun run typecheck
bun run test
bun run test:security
bun run test:a11y
bun run test:debt
bun run build
bun run test:e2e
bun run report:technical
bun run ci:gate
```

- [ ] Closure und Statusdateien erst nach echten Nachweisen auf DONE setzen.
- [ ] PR Exact-Head Security und vollständige CI verifizieren.
- [ ] Kein Merge/Deploy ohne separate Freigabe.

**Abschlussbericht:**

```text
BSF-03A STATUS
HEAD
PERMISSION
DB/RLS/GRANTS/FUNCTIONS geändert JA/NEIN + Liste
RPC SECURITY INVOKER bestätigt
Kategorie Legacy/None/Unknown Tests
Scope/IDOR/BOLA Tests
Unit/Integration/Backend
E2E/A11y
BSF-02C Regression
Security Advisor
CI/Technical Debt/Quality Gate
Dokumentation
MERGE = NEIN bis Freigabe
DEPLOY = NEIN
NÄCHSTER SPRINT = BSF-KIOSK-02 / #136
```
