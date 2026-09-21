# BSF-03B Performance Statement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use test-driven-development before product code and verification-before-completion before any PASS/DONE claim.

**Goal:** Einen Teamlead-only Leistungsnachweisprozess mit revisionsgebundenem Billable-Review, atomarer Finalisierung, unveränderbarem Snapshot, Doppelverwendungs-Schutz, Ersatzworkflow und kundenminimiertem PDF/CSV/JSON-Export implementieren.

**Architecture:** Operative Shared Activities bleiben publisher-owned. Teamlead-Änderungen der Abrechenbarkeit werden in einem separaten, revisionsgebundenen Review-Overlay gespeichert. Finalisierung erfolgt über eine schmale Request-Tabelle und eine nicht direkt ausführbare interne Triggerfunktion, die Statement, Items und Claims atomar erzeugt; Exporte werden ausschließlich aus dem finalisierten Snapshot gebaut.

**Tech Stack:** TypeScript, React 19, TanStack React Start/Router, Supabase/PostgreSQL, Zod, SHA-256, bestehende ReportDefinition/Renderer aus ADR-0028, Vitest, Playwright, vitest-axe, Bun, GitHub Actions.

**Spec:** `docs/BSF-03B-DESIGN.md`, Issue #107.


## Execution Status — 2026-09-21

- Task 1 RBAC-Vertrag: **GREEN**
- Task 2 providerneutraler Review-/Snapshot-Vertrag: **GREEN**
- Task 3 Review-Fingerprint / TOCTOU-Schutz: **GREEN**
- Task 4 Datenbankvertrag, Live-Migration, T01–T30, Drift-Guard und offizieller Security Advisor: **GREEN / BASELINE_ONLY**
- Task 5 Supabase Review-/Snapshot-Adapter: **ACTIVE**
- PR #149 bleibt **DRAFT**; kein Merge/Deploy vor vollständiger BSF-03B-Abnahme.

Task-4-Evidenz: Migration `20260921095742_bsf03b_performance_statement` kontrolliert über Lovable angewandt; Live-T01–T30 PASS; keine synthetischen Residuen; `DATABASE_SCHEMA_DRIFT: NONE`; `DATABASE_TYPES_DRIFT: NONE`; Security #1148 PASS; CI #1153 PASS; keine neuen BSF-03B-Security-Advisor-Findings.


## Global Constraints

- Umsetzung erst nach BSF-KIOSK-02-Abnahme und auf dann aktuellem `main`.
- Kein direkter Write auf `main`.
- Keine Rechnung, keine Preise, keine Stundensätze, keine Umsatzsteuer.
- Teamlead überschreibt keine fremde `shared_activity_projection`.
- `billingStatus` der Source wird durch Finalisierung nicht auf `abgerechnet` gesetzt.
- Neue fachliche Permission ist `performance.statement.manage`.
- Fachlicher Regelbetrieb Teamlead; Sysadmin nur bestehender technischer All-Permissions-Break-glass.
- Kein Service-Role-Normalpfad.
- Keine für authenticated direkt ausführbare neue SECURITY-DEFINER-RPC.
- Interne Triggerfunktion bei SECURITY DEFINER: `search_path=''`, voll qualifiziert, Execute für PUBLIC/anon/authenticated widerrufen.
- Kundenfassung enthält keinen Leistungserbringername/Engineer-ID.
- Keine stille Ergebnis- oder Claim-Trunkierung.
- Keine automatische Finalisierung.
- Finalisierte Snapshot-Inhalte niemals entsperren oder überschreiben.
- TDD vor Produktcode.
- Kein Merge/Deploy ohne separate Freigabe.

---

## File Map

**Providerneutral:**

- Create: `src/lib/performance-statement/performance-statement-contract.ts`
- Create: `src/lib/performance-statement/performance-statement.ts`
- Create: `src/lib/performance-statement/review-fingerprint.ts`

**Runtime/Adapter:**

- Create: `src/lib/performance-statement-runtime/performance-statement.functions.ts`
- Create: `src/integrations/supabase/performance-statement-adapter.ts`

**UI:**

- Create: `src/components/performance-statement/PerformanceStatementView.tsx`
- Create: `src/components/performance-statement/PerformanceStatementFilters.tsx`
- Create: `src/components/performance-statement/PerformanceStatementReviewTable.tsx`
- Create: `src/components/performance-statement/PerformanceStatementHistory.tsx`
- Create: `src/routes/_authenticated/leistungsnachweis.tsx`

**Reporting:**

- Create: `src/lib/report/definitions/performance-statement.ts`
- Modify: `src/lib/report/registry.ts`
- Modify: `src/lib/report/index.ts`

**DB:**

- Create: neue Migration `supabase/migrations/<timestamp>_bsf03b_performance_statement.sql`
- Create: `supabase/tests/bsf03b-performance-statement.sql`

**Tests:**

- Create: `src/__tests__/lib/performance-statement.test.ts`
- Create: `src/__tests__/lib/review-fingerprint.test.ts`
- Create: `src/__tests__/backend/performance-statement.functions.test.ts`
- Create: `src/__tests__/integration/performance-statement-adapter.test.ts`
- Create: `src/__tests__/components/PerformanceStatementView.test.tsx`
- Create: `src/__tests__/a11y/performance-statement.test.tsx`
- Create: `e2e/specs/performance-statement/performance-statement.spec.ts`
- Create: `e2e/specs/security/performance-statement-scope.spec.ts`

---

### Task 1: RBAC-Vertrag `performance.statement.manage` — GREEN

**Files:**

- Modify: `src/lib/rbac/permissions.ts`
- Modify: `backend/services/rbac.mjs`
- Modify: `docs/RBAC-MATRIX.md`
- Test: bestehende RBAC-Tests
- DB: neue Migration aus Task 4 spiegelt `has_permission`

**Interfaces:**

- Produces: Permission `performance.statement.manage`.
- Allowed: `teamlead`, plus `systemadministrator` durch bestehendes All-Permissions-Modell.
- Denied: `administrator`, `projectmanager`, `engineer`, `viewer`, `customer`.

- [x] **Step 1: Roten RBAC-Test schreiben**

```ts
expect(hasPermission(teamlead, "performance.statement.manage")).toBe(true);
expect(hasPermission(administrator, "performance.statement.manage")).toBe(false);
expect(hasPermission(projectmanager, "performance.statement.manage")).toBe(false);
expect(hasPermission(engineer, "performance.statement.manage")).toBe(false);
expect(hasPermission(viewer, "performance.statement.manage")).toBe(false);
expect(hasPermission(customer, "performance.statement.manage")).toBe(false);
```

- [x] **Step 2: Test RED ausführen**

```bash
bun run rbac:check
bunx vitest run src/__tests__/security --reporter=default
```

Expected: FAIL, Permission unbekannt beziehungsweise Matrix nicht synchron.

- [x] **Step 3: Frontend-/Backend-Permission minimal ergänzen**

`teamlead` erhält die Permission. `administrator` und `projectmanager` erhalten sie ausdrücklich nicht. `systemadministrator` bleibt über `allPermissions` technisch berechtigt.

- [x] **Step 4: RBAC-Dokumentation aktualisieren**

Fachregel dokumentieren: Teamlead normal, Sysadmin Break-glass.

- [x] **Step 5: Targeted Checks GREEN**

```bash
bun run rbac:check
bunx vitest run src/__tests__/security --reporter=default
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add src/lib/rbac/permissions.ts backend/services/rbac.mjs docs/RBAC-MATRIX.md src/__tests__
git commit -m "feat(rbac): Leistungsnachweis-Teamlead-Permission ergänzen"
```

---

### Task 2: Providerneutraler Review-/Snapshot-Vertrag TDD — GREEN

**Files:**

- Create: `src/lib/performance-statement/performance-statement-contract.ts`
- Create: `src/lib/performance-statement/performance-statement.ts`
- Create: `src/__tests__/lib/performance-statement.test.ts`

**Interfaces:**

Produces at least:

```ts
export type PerformanceReviewState = "reviewable" | "legacy_finalized" | "claimed_by_statement";

export interface PerformanceStatementReviewRow {
  activitySourceId: string;
  sourceRevision: number;
  sourceHash: string;
  sourcePublishedAt: string;
  date: string;
  title: string;
  durationHours: number;
  sourceBillable: boolean;
  effectiveBillable: boolean;
  billingStatus: string;
  reviewState: PerformanceReviewState;
  hasStaleOverride: boolean;
  project: { sourceId: string | null; name: string | null };
  workPackage: { sourceId: string | null; title: string | null };
  category: { key: string | null; label: string | null; state: string };
}

export interface PerformanceStatementReview {
  systemhouseId: string;
  customerId: string;
  customerName: string;
  periodStart: string;
  periodEnd: string;
  rows: PerformanceStatementReviewRow[];
  reviewFingerprint: string;
  freshness: { oldestPublishedAt: string | null; latestPublishedAt: string | null };
  summary: { billableHours: number; nonBillableHours: number; reviewableCount: number };
}
```

- [x] **Step 1: Roten Test für Periodenregeln schreiben**

```ts
expect(() => validatePerformancePeriod("2026-09-01", "2026-09-30")).not.toThrow();
expect(() => validatePerformancePeriod("2026-10-01", "2026-09-01")).toThrow();
```

Zusätzlich Zeitraum > 366 Tage => Fehler.

- [x] **Step 2: Roten Test für Review-Status schreiben**

```ts
expect(classifyRow({ billingStatus: "abgerechnet", claimed: false })).toBe("legacy_finalized");
expect(classifyRow({ billingStatus: "offen", claimed: true })).toBe("claimed_by_statement");
expect(classifyRow({ billingStatus: "offen", claimed: false })).toBe("reviewable");
```

- [x] **Step 3: Roten Test für Summen schreiben**

Non-billable bleibt enthalten, aber getrennt summiert.

- [x] **Step 4: Tests RED ausführen**

```bash
bunx vitest run src/__tests__/lib/performance-statement.test.ts
```

Expected: FAIL, Module fehlen.

- [x] **Step 5: Minimalen Domain-Service implementieren**

Keine Supabase-/React-Importe.

- [x] **Step 6: Tests GREEN**

```bash
bunx vitest run src/__tests__/lib/performance-statement.test.ts
```

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add src/lib/performance-statement src/__tests__/lib/performance-statement.test.ts
git commit -m "feat(bsf03b): providerneutralen Leistungsnachweis-Vertrag definieren"
```

---

### Task 3: Review-Fingerprint TDD — GREEN

**Files:**

- Create: `src/lib/performance-statement/review-fingerprint.ts`
- Create: `src/__tests__/lib/review-fingerprint.test.ts`

**Interfaces:**

```ts
export function canonicalizePerformanceReviewRows(rows: PerformanceStatementReviewRow[]): string;
export async function createPerformanceReviewFingerprint(
  rows: PerformanceStatementReviewRow[],
): Promise<string>;
```

Kanonische Zeile:

```text
activitySourceId|sourceRevision|sourceHash|date|durationHours(2 decimals)|billingStatus|effectiveBillable
```

Sortierung: `activitySourceId` aufsteigend. Separator zwischen Zeilen: `\n`.

- [x] **Step 1: Roten Determinismus-Test schreiben**

```ts
expect(await createPerformanceReviewFingerprint([rowB, rowA])).toBe(
  await createPerformanceReviewFingerprint([rowA, rowB]),
);
```

- [x] **Step 2: Roten Änderungs-Test schreiben**

Revision, Hash, Dauer oder `effectiveBillable` ändern => anderer Fingerprint.

- [x] **Step 3: RED ausführen**

```bash
bunx vitest run src/__tests__/lib/review-fingerprint.test.ts
```

- [x] **Step 4: Kanonisierung + SHA-256 minimal implementieren**

Nutze Web Crypto/Node-kompatiblen SHA-256 ohne neue Dependency.

- [x] **Step 5: GREEN ausführen**

```bash
bunx vitest run src/__tests__/lib/review-fingerprint.test.ts
```

- [x] **Step 6: Commit**

```bash
git add src/lib/performance-statement/review-fingerprint.ts src/__tests__/lib/review-fingerprint.test.ts
git commit -m "feat(bsf03b): Review-Fingerprint gegen Datenänderungen ergänzen"
```

---

### Task 4: Datenbankvertrag, Audit und atomarer Request-Trigger — GREEN

**Files:**

- Create: `supabase/migrations/<timestamp>_bsf03b_performance_statement.sql`
- Create: `supabase/tests/bsf03b-performance-statement.sql`
- Modify: generated Supabase types erst nach real bestätigtem Schema

**Tables:**

```text
customer_activity_billable_override
customer_performance_statement_request
customer_performance_statement
customer_performance_statement_item
customer_performance_activity_claim
```

- [x] **Step 1: Live-Precheck read-only**

Prüfen:

```text
Migrationshistorie
bestehende Grants/RLS
has_permission
shared_activity_projection Ownership/RLS
shared Project/WP category columns aus BSF-03A
public.audit_log Vertrag
bestehende Security-Definer Advisor Baseline
```

Bei Drift: BLOCKED dokumentieren, keine alte Migration editieren.

- [x] **Step 2: SQL-Testartefakt zuerst anlegen**

Mindestens T01–T30 vorsehen:

```text
T01 Tabellen vorhanden
T02 RLS überall aktiv
T03 anon/PUBLIC keine DML-Rechte
T04 manage Permission Teamlead ALLOW
T05 Administrator DENY
T06 PM DENY
T07 Engineer DENY
T08 Viewer DENY
T09 Customer DENY
T10 Override same-scope INSERT PASS
T11 Override cross-systemhouse DENY
T12 Override fremder Customer DENY
T13 Override Audit vorhanden
T14 Override alte Revision wird nicht für neue Revision angewendet
T15 direct INSERT statement DENY
T16 direct INSERT item DENY
T17 direct INSERT claim DENY
T18 direct UPDATE final statement content DENY
T19 internal trigger function authenticated EXECUTE DENY
T20 Finalize Request same-scope PASS
T21 stale fingerprint ROLLBACK
T22 duplicate claim ROLLBACK
T23 non-billable Item wird gesnapshottet
T24 billable Summe korrekt
T25 Snapshot Hash vorhanden
T26 Idempotency-Key erzeugt keinen zweiten Snapshot
T27 Replacement same scope/period PASS
T28 Replacement cross-customer DENY
T29 alter Snapshot unverändert + superseded
T30 Null-Residuen nach Rollback/Testcleanup
```

- [x] **Step 3: Schema minimal implementieren**

Statement-/Item-/Claim-Tabellen erhalten keine authenticated Write-Grants.

Override-/Request-Tabellen erhalten nur die im Design beschriebenen DML-Rechte + RLS.

- [x] **Step 4: Audit-Trigger für Overrides implementieren**

Audit-Actions exakt:

```text
performance_statement.billable_override.insert
performance_statement.billable_override.update
```

- [x] **Step 5: interne Request-Triggerfunktion implementieren**

Wenn `SECURITY DEFINER`:

```sql
SECURITY DEFINER
SET search_path = ''
```

Alle Tabellen-/Funktionen voll schemaqualifizieren.

Danach explizit:

```sql
REVOKE ALL ON FUNCTION public.<internal_trigger_function>(...) FROM PUBLIC, anon, authenticated;
```

Die Funktion wird ausschließlich per Trigger gebunden.

- [x] **Step 6: Finalize-/Replace-Algorithmus und Fingerprint DB-seitig implementieren**

Kanonische Stringbildung muss exakt Task 3 entsprechen.

- [x] **Step 7: SQL-Test vollständig real/fail-fast ausführen**

BEGIN/ROLLBACK für synthetische Fixtures, keine echten Kundendaten.

- [x] **Step 8: BSF-02C/03A Regression ausführen**

Shared-Projection-RLS und Publisher-Ownership dürfen nicht gelockert werden.

- [x] **Step 9: Security Advisor read-only ausführen**

Keine neue unerklärte `authenticated_security_definer_function_executable`-Warnung akzeptieren.

- [x] **Step 10: Generated Types aktualisieren, falls Schema real bestätigt**

- [x] **Step 11: Commit**

```bash
git add supabase/migrations supabase/tests src/integrations/supabase/types.ts
git commit -m "feat(bsf03b): Leistungsnachweis-Snapshot und atomare Finalisierung persistieren"
```

---

### Task 5: Supabase Review-/Snapshot-Adapter TDD — ACTIVE

**Files:**

- Create: `src/integrations/supabase/performance-statement-adapter.ts`
- Create: `src/__tests__/integration/performance-statement-adapter.test.ts`

**Interfaces:**

```ts
export interface PerformanceStatementRepository {
  getReview(input: ReviewInput): Promise<PerformanceStatementReview>;
  setBillableOverride(input: BillableOverrideInput): Promise<void>;
  finalize(input: FinalizeInput): Promise<{ statementId: string }>;
  replace(input: ReplaceInput): Promise<{ statementId: string }>;
  getStatement(statementId: string): Promise<PerformanceStatementSnapshot>;
  listStatements(scope: StatementScope): Promise<PerformanceStatementSnapshot[]>;
}
```

- [ ] **Step 1: Roten Adapter-Test schreiben**

Review lädt:

```text
Shared Activities
Projects/WPs/Category aus BSF-03A
aktuelle Overrides exakt zur Source Revision
aktive Claims
finale Statement-Metadaten
```

- [ ] **Step 2: Source billable vs effective billable testen**

Aktuelles Override gewinnt nur bei passender Revision/Hash.

- [ ] **Step 3: stale Override testen**

Alte Revision => `hasStaleOverride=true`, Source billable bleibt effective.

- [ ] **Step 4: Finalize Request testen**

Adapter schreibt nur `customer_performance_statement_request` und liest `result_statement_id`. Keine direkte Statement-/Item-/Claim-DML.

- [ ] **Step 5: Provider mit User-JWT minimal implementieren**

Kein Admin-/Service-Client.

- [ ] **Step 6: Integrationstests GREEN**

```bash
bunx vitest run src/__tests__/integration/performance-statement-adapter.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/integrations/supabase/performance-statement-adapter.ts src/__tests__/integration/performance-statement-adapter.test.ts
git commit -m "feat(bsf03b): Leistungsnachweis-Repository an Supabase anbinden"
```

---

### Task 6: Server Functions für Review, Override, Finalize, Replace

**Files:**

- Create: `src/lib/performance-statement-runtime/performance-statement.functions.ts`
- Create: `src/__tests__/backend/performance-statement.functions.test.ts`
- Extend: Security tests

**Functions:**

```text
getPerformanceStatementReviewFn
setPerformanceBillableOverrideFn
finalizePerformanceStatementFn
replacePerformanceStatementFn
getPerformanceStatementFn
listPerformanceStatementsFn
```

- [ ] **Step 1: Input-Zod-Schemas rot testen**

UUIDs, ISO dates, max 366 days, effectiveBillable boolean, expected fingerprint lowercase hex SHA-256.

- [ ] **Step 2: Permission-Negativtests rot schreiben**

Administrator/PM/Engineer/Viewer/Customer DENY.

- [ ] **Step 3: Scope-Negativtests rot schreiben**

Cross-systemhouse, cross-customer, foreign statement ID, foreign activity source ID.

- [ ] **Step 4: Server Functions implementieren**

Jede mutierende Funktion:

```text
requireSupabaseAuth
-> active account
-> performance.statement.manage
-> same user JWT adapter
-> RLS/DB contract
```

- [ ] **Step 5: Keine Existenzleaks**

Fremde Statement-/Customer-IDs liefern generische Ablehnung/leer, keine BOLA-Existenzinformation.

- [ ] **Step 6: Backend-/Security-Tests GREEN**

- [ ] **Step 7: Commit**

```bash
git add src/lib/performance-statement-runtime src/__tests__/backend src/__tests__/security
git commit -m "feat(bsf03b): Leistungsnachweis Server Functions absichern"
```

---

### Task 7: ReportDefinition SYSING-104 aus finalem Snapshot

**Files:**

- Create: `src/lib/report/definitions/performance-statement.ts`
- Modify: `src/lib/report/registry.ts`
- Modify: `src/lib/report/index.ts`
- Create: `src/__tests__/lib/report/performance-statement-report.test.ts`

**Definition:**

```ts
reportId: "performance-statement";
title: "Leistungsnachweis";
version: "1.0.0";
dataSource: "customer_performance_statement.snapshot";
permission: "performance.statement.manage";
formats: ["pdf", "csv", "json"];
documentId: "SYSING-104";
fileNamePattern: "{docId}_{slug}_{period}_{version}_{timestamp}";
```

- [ ] **Step 1: Roten Report-Test schreiben**

Kundendokument enthält billable Item, aber nicht non-billable Item.

- [ ] **Step 2: Redaction-Test schreiben**

```ts
expect(serializedDocument).not.toContain(engineerName);
expect(serializedDocument).not.toContain(engineerId);
expect(serializedDocument).not.toContain(sourceHash);
expect(serializedDocument).not.toMatch(/€|Stundensatz|Umsatzsteuer/);
```

- [ ] **Step 3: PDF/CSV/JSON Summengleichheit testen**

Alle Formate verwenden dasselbe `ReportDocument`/Snapshot-Input.

- [ ] **Step 4: ReportDefinition minimal implementieren und registrieren**

Keine Live-Datenabfrage in der Reportdefinition.

- [ ] **Step 5: Report-/Renderer-Tests GREEN**

- [ ] **Step 6: Commit**

```bash
git add src/lib/report src/__tests__/lib/report
git commit -m "feat(report): finalen Kunden-Leistungsnachweis SYSING-104 ergänzen"
```

---

### Task 8: Teamlead-UI TDD

**Files:**

- Create: `src/routes/_authenticated/leistungsnachweis.tsx`
- Create: `src/components/performance-statement/PerformanceStatementView.tsx`
- Create: `src/components/performance-statement/PerformanceStatementFilters.tsx`
- Create: `src/components/performance-statement/PerformanceStatementReviewTable.tsx`
- Create: `src/components/performance-statement/PerformanceStatementHistory.tsx`
- Create: `src/__tests__/components/PerformanceStatementView.test.tsx`
- Modify: geeigneter Dashboard-/Navigationseinstieg

- [ ] **Step 1: Roten Permission-/Rendering-Test schreiben**

Route/Link nur `performance.statement.manage`.

- [ ] **Step 2: Review-Zustände testen**

`reviewable`, `legacy_finalized`, `claimed_by_statement`, stale override.

- [ ] **Step 3: Billable-Toggle testen**

Nur `reviewable` kann umgeschaltet werden. UI mutiert keine Activity direkt.

- [ ] **Step 4: Finalisierungsdialog testen**

Pflichtanzeige:

```text
Kunde
Zeitraum
Datenstand
Anzahl prüfbarer Tätigkeiten
billable Stunden
non-billable Stunden
Hinweis „Leistungsnachweis, keine Rechnung“
Bestätigung des geprüften Datenstands
```

- [ ] **Step 5: History-/Replacement-UI testen**

Finalized/superseded Versionen sichtbar, Ersatz nur auf aktiver finaler Version.

- [ ] **Step 6: Komponenten minimal implementieren**

Keine allgemeine Activity-Edit-Funktion.

- [ ] **Step 7: TypeScript/Lint/Component Tests GREEN**

- [ ] **Step 8: Commit**

```bash
git add src/routes/_authenticated/leistungsnachweis.tsx src/components/performance-statement src/__tests__/components/PerformanceStatementView.test.tsx
git commit -m "feat(bsf03b): Teamlead-Prüf- und Finalisierungssicht ergänzen"
```

---

### Task 9: Backup/Restore und JSON-Gesamtdatenvertrag

**Files:**

- Modify: bestehende Backup-/Restore-Contracts und Tests
- Modify: bestehende JSON-Export/Import-Contracts, soweit zentrale BSF-Daten enthalten werden
- Modify: `docs/DATA-SCHEMA.md`

- [ ] **Step 1: Roten Backup-Test mit Statement-Serie schreiben**

Fixture: v1 superseded -> v2 finalized, Overrides, Items, Claims.

- [ ] **Step 2: Restore-Beziehungen testen**

Nach Restore:

```text
series/version chain korrekt
replaces/superseded_by korrekt
items unverändert
aktiver Claim zeigt auf v2
snapshot hash unverändert
```

- [ ] **Step 3: Maschinenlesbaren Exportvertrag ergänzen**

Keine Secrets; interne Snapshotdaten dürfen im administrativen Gesamtexport enthalten sein, Kundenausgabe bleibt separat redigiert.

- [ ] **Step 4: Backup/IO Tests GREEN**

```bash
bun run test:backup:integrity
bun run test:io
```

- [ ] **Step 5: Commit**

```bash
git add src docs/DATA-SCHEMA.md
git commit -m "feat(bsf03b): Leistungsnachweis in Backup und Datenvertrag integrieren"
```

---

### Task 10: A11y / E2E / Security E2E

**Files:**

- Create: `src/__tests__/a11y/performance-statement.test.tsx`
- Create: `e2e/specs/performance-statement/performance-statement.spec.ts`
- Create: `e2e/specs/security/performance-statement-scope.spec.ts`

- [ ] **Step 1: A11y Tests schreiben**

Filter, Review-Tabelle, Toggle, Finalisierungsdialog, History, Exportaktionen.

- [ ] **Step 2: Positiv-E2E**

Teamlead:

```text
Kunde/Zeitraum wählen
billable/non-billable gemeinsam sehen
Override setzen
Summen ändern sich
finalisieren
Snapshot read-only
PDF/CSV/JSON erzeugen
Kundenausgabe ohne Leistungserbringer
```

- [ ] **Step 3: Replacement-E2E**

Source ändern/neu publizieren -> alter Snapshot unverändert -> Ersatzreview -> v2 -> v1 superseded.

- [ ] **Step 4: Security-E2E**

Administrator/PM/Engineer/Viewer/Customer DENY; Cross-Systemhouse/Customer/Statement DENY; direkte Table-DML auf Snapshot/Claims DENY.

- [ ] **Step 5: Race-/Fingerprint-Vertrag testen**

Review laden -> Source Revision ändern -> Finalize => erwarteter Abbruch ohne Snapshot.

- [ ] **Step 6: Tests GREEN**

```bash
bun run test:a11y
bunx playwright test e2e/specs/performance-statement e2e/specs/security/performance-statement-scope.spec.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/__tests__/a11y e2e/specs/performance-statement e2e/specs/security/performance-statement-scope.spec.ts
git commit -m "test(bsf03b): Leistungsnachweis End-to-End und Scope absichern"
```

---

### Task 11: Gezielter Lovable UI-/Preview-Pass

**Files:**

- Nur UI-/Preview-Dateien aus dem Performance-Statement-Scope.

- [ ] **Step 1: Prompt aus `docs/LOVABLE-PROMPT-PLAN-BSF-03B.md` verwenden**
- [ ] **Step 2: Teamlead Review/Finalisierung visuell prüfen**
- [ ] **Step 3: Finalized/Superseded-Historie prüfen**
- [ ] **Step 4: keine DB/Auth/Providerdrift zulassen**
- [ ] **Step 5: `client.ts`/`previewAuthStorage.ts` prüfen**
- [ ] **Step 6: Component/A11y/E2E erneut ausführen**

**Commit-Ziel:** `style(bsf03b): Leistungsnachweis UI gezielt verfeinern`

---

### Task 12: Dokumentation, Advisor, vollständige Gates

**Files:**

- Create: `docs/BSF-03B-CLOSURE-2026-09-14.md`
- Modify: `docs/ENTWICKLUNGSTAGEBUCH.md`
- Modify: `docs/CURRENT-STATUS.md`
- Modify: `docs/PROJECT-STATUS.yaml`
- Modify: `docs/BSF-CURRENT-PRIORITIES.md`
- Modify: `docs/DATA-SCHEMA.md`
- Modify: technischer Prüfbericht
- Modify: `CHANGELOG.md`
- Review/annotate: `docs/BSF-KUNDENABRECHNUNG.md` als historische, in Teilen überholte V1-Planung

- [ ] **Step 1: Offiziellen Security Advisor read-only ausführen**

Neue Trigger-Definer-Funktion darf nicht als direkt authenticated-executable Warning erscheinen.

- [ ] **Step 2: DB-/SQL-Regression vollständig ausführen**

BSF-02C, BSF-03A, BSF-03B.

- [ ] **Step 3: Vollständige Repository-Checks**

```bash
bunx prettier --check .
bun run lint
bun run typecheck
bun run test
bun run test:security
bun run test:a11y
bun run test:debt
bun run test:io
bun run test:backup:integrity
bun run build
bun run test:e2e
bun run report:technical
bun run ci:gate
```

- [ ] **Step 4: Customer Export manuell prüfen**

PDF/CSV/JSON:

```text
kein Leistungserbringername
keine Engineer-ID
keine Source Hashes
keine Eurobeträge
billable Stunden identisch
Zeitraum/Kunde/Version korrekt
```

- [ ] **Step 5: Statusdateien erst nach vollständigem Nachweis auf DONE setzen**

- [ ] **Step 6: Exact-Head Security und CI verifizieren**

- [ ] **Step 7: Kein Merge/Deploy ohne separate Freigabe**

**Abschlussbericht:**

```text
BSF-03B STATUS
HEAD
PERMISSION
OVERRIDE-VERTRAG
REVIEW-FINGERPRINT
FINALIZATION REQUEST/TRIGGER
SECURITY DEFINER DIRECT EXECUTE = DENY
SNAPSHOT IMMUTABILITY
CLAIM/DOPPELVERWENDUNG
REPLACEMENT FLOW
CUSTOMER REDACTION
PDF/CSV/JSON
BACKUP/RESTORE
IDOR/BOLA
SQL REGRESSION
SECURITY ADVISOR
A11y/E2E
CI/Technical Debt/Quality Gate
Dokumentation
MERGE = NEIN bis Freigabe
DEPLOY = NEIN
NÄCHSTER SPRINT = BSF-03E / #63
```
