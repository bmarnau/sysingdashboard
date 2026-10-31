# BSF-07 Golden-Gate Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the BSF-07 management cockpit as a secure, provider-neutral Golden-Gate increment: composed domain data, authorised server reads, an accessible UI, and auditable evidence.

**Architecture:** P1 composes pre-authorised domain data without performing authentication or loading providers. P2 becomes the only server boundary and preserves every source scope; it never creates a rights union. P3 consumes the P2 response only, with Lovable used as a visual/reference implementation under the same server-authorised contract.

**Tech Stack:** TypeScript, TanStack Start, Vitest, Supabase RLS/JWT, Playwright, Lovable (UI reference only).

**Spec:** `docs/BSF-07-MANAGEMENT-COCKPIT-DESIGN.md`; `docs/GOLDEN-GATE-DELIVERY-PLAN-2026-10-16.md`

## Global Constraints

- No React, Supabase, JWT, RLS, API, migration, or deployment code in P1.
- States are exactly `AVAILABLE`, `EMPTY`, `PARTIAL`, `UNKNOWN`, `UNAVAILABLE`, and `DENIED`; `DENIED` leaks no count, ID, title, name, or existence hint.
- Correlate only on `(systemhouseId, customerId, subjectType, subjectId)` or an equally explicit, authorised bridge; never on names, titles, labels, or fuzzy matching.
- Reuse existing AVKK, Project Controlling, My Customers, and WorkPackage/Responsibility source-of-truth contracts; add no second KPI or responsibility logic.
- Do not add person rankings, scores, client-side authorisation, external runtime dependencies, or Lovable-only business logic.
- Keep a fixed reference time in tests and use fully synthetic fixtures.

## Review Focus

- A denied source must reveal neither an empty-looking zero nor an identifier; verify in Task 1.
- Duplicate scoped bridges must become `AMBIGUOUS`, not select an arbitrary work package; verify in Task 1.
- P2 must not widen the caller scope when one source is broader; verify with cross-customer and cross-systemhouse negatives in Task 2.
- Every P3 drill-down must require its own server-side authorisation rather than trusting a list item; verify in Task 3.
- Lovable prototype state codes and client-side mock scope must never reach product runtime; verify contract fixtures in Task 3.

---

## File Structure

- `src/lib/management-cockpit/management-cockpit-service.ts` — pure P1 state and attention composition.
- `src/__tests__/lib/management-cockpit/management-cockpit-service.test.ts` — P1 contract cases MC01–MC12 and MC25–MC32.
- `src/lib/management-cockpit-runtime/management-cockpit.functions.ts` — P2 authenticated server-function boundary.
- `src/__tests__/backend/management-cockpit.functions.test.ts` — P2 authorisation, deny, and scope-isolation cases.
- `src/routes/.../management-cockpit.tsx` and `src/components/management-cockpit/*` — P3 product UI, consuming only P2 DTOs.
- `src/__tests__/components/management-cockpit*.test.tsx` and `e2e/specs/management-cockpit.spec.ts` — P3/P4 accessibility, route, and browser evidence.
- `docs/examples/golden-dataset/v1/expected/management-cockpit.json` — independent expected result, added only after P1 model stabilises.

### Task 1: Complete P1 Pure Domain Composer

**Files:**
- Create: `src/lib/management-cockpit/management-cockpit-service.ts`
- Create: `src/__tests__/lib/management-cockpit/management-cockpit-service.test.ts`

**Interfaces:**
- Consumes: `ProjectControllingResult`-derived rows, completeness, freshness, and pre-authorised bridge records.
- Produces: `composeManagementCockpit(input: ManagementCockpitInput): ManagementCockpit`.

- [ ] **Step 1: Add RED tests for all six source states and the no-leak `DENIED` shape.**
- [ ] **Step 2: Run `bun test src/__tests__/lib/management-cockpit/management-cockpit-service.test.ts`; confirm RED.**
- [ ] **Step 3: Implement only data-state preservation and fail-closed output.**
- [ ] **Step 4: Run the focused test; confirm GREEN.**
- [ ] **Step 5: Add RED tests for PARTIAL completeness, freshness pass-through, zero/one/multiple exact bridges, and forbidden name/title matching.**
- [ ] **Step 6: Run the focused test; confirm RED.**
- [ ] **Step 7: Implement exact scoped correlation and source-derived attention reasons; no combined score.**
- [ ] **Step 8: Run the focused test and `git diff --check`; confirm GREEN.**
- [ ] **Step 9: Commit `feat(bsf-07): compose management cockpit domain` after the normal test runner is available.**

### Task 2: P2 Authorised Server Read

**Files:**
- Create: `src/lib/management-cockpit-runtime/management-cockpit.functions.ts`
- Create: `src/__tests__/backend/management-cockpit.functions.test.ts`

**Interfaces:**
- Consumes: caller User-JWT/context and existing authorised repositories.
- Produces: an authenticated management-cockpit DTO that exactly matches `ManagementCockpit`.

- [ ] **Step 1: Write RED tests for anonymous, forbidden, cross-customer, cross-systemhouse, unavailable-source, and partial-source requests.**
- [ ] **Step 2: Run the backend test; confirm RED.**
- [ ] **Step 3: Implement a server function that loads each source in its own caller-authorised scope and passes only those results to `composeManagementCockpit`.**
- [ ] **Step 4: Run the backend tests; confirm GREEN and that DENIED contains no payload.**
- [ ] **Step 5: Run the existing security/RBAC tests that cover Project Controlling, customer visibility, and WorkPackage views.**
- [ ] **Step 6: Commit `feat(bsf-07): add authorised management cockpit read`.**

### Task 3: P3 Product UI and Lovable Reference Prompt

**Files:**
- Create: `src/components/management-cockpit/*`
- Modify: authorised route registration and route-specific help files identified during P2.
- Create: `src/__tests__/components/management-cockpit.test.tsx`
- Create: `e2e/specs/management-cockpit.spec.ts`
- Create: `docs/lovable/BSF-07-P3-MANAGEMENT-COCKPIT-PROMPT.md`

**Interfaces:**
- Consumes: P2 DTO only.
- Produces: an accessible list of authorised projects requiring attention, explicit state views, and authorised drill-down links.

- [ ] **Step 1: Write RED component tests for available, empty, partial, unknown, unavailable, and denied states.**
- [ ] **Step 2: Write the Lovable prompt: UI tokens and layout ideas are allowed; mock data, client-side scope filtering, KPI computation, and in-memory drill-down are prohibited.**
- [ ] **Step 3: Implement the smallest route/view: project, source-derived reason, state, provenance, and route link.**
- [ ] **Step 4: Run component tests; confirm GREEN.**
- [ ] **Step 5: Add browser tests for 1280/820/390, keyboard focus, Axe, console/hydration, 403, IDOR, cross-customer, and cross-systemhouse.**
- [ ] **Step 6: Run component and browser tests; record exact-head evidence.**
- [ ] **Step 7: Commit `feat(bsf-07): add authorised management cockpit UI`.**

### Task 4: P4/P5 Golden Evidence and Closure

**Files:**
- Create: `docs/examples/golden-dataset/v1/expected/management-cockpit.json`
- Modify: Golden dataset validator/tests, technical report, help, status, and changelog files identified by existing project conventions.

**Interfaces:**
- Consumes: stable P1/P2/P3 contract.
- Produces: independent Golden expected results and release-quality evidence.

- [ ] **Step 1: Write RED expected-result and negative-fixture tests for all six data states, unassigned/no-due-date, unavailable, denied, ambiguous, and cross-scope cases.**
- [ ] **Step 2: Run Golden validator/tests; confirm RED.**
- [ ] **Step 3: Add only synthetic, versioned expected results independent of production code.**
- [ ] **Step 4: Run Golden validator, unit/integration/E2E/security/a11y checks, production build, and CI/security gates.**
- [ ] **Step 5: Update technical report, route/role help, project status, and changelog with exact evidence; do not claim a published runtime.**
- [ ] **Step 6: Commit `docs(bsf-07): record management cockpit acceptance evidence`, open a signed draft PR, and await exact-head CI/Security.**

## Self-Review

- Spec coverage: P1 covers data-state, correlation, source/KPI boundaries; P2 covers authenticated scope; P3 covers Lovable-safe UI; P4/P5 cover Golden and acceptance evidence.
- Type consistency: P2 returns the P1 `ManagementCockpit` DTO; P3 consumes only that DTO.
- Scope: BSF-07 is a self-contained Golden-Gate increment. Kiosk, Customer PDF, Canonical Import Model, Reporting, and final Golden Gate remain subsequent delivery plans.
- Verification: every Review Focus condition has an owning task and explicit test step.
