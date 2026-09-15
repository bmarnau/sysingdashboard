# Database Schema Source of Truth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the application-owned Supabase schema fully reconstructable, reviewable and drift-protected from Git before BSF-03A performs any new database change.

**Architecture:** `supabase/migrations/` remains the canonical change history. A generated `supabase/schema/public-schema.sql`, generated `src/integrations/supabase/types.ts`, DB contract tests, and a CI drift guard form the current-state proof. Remote schema writes continue through Lovable -> Supabase; local Supabase is used only to reconstruct and verify the Git contract.

**Tech Stack:** Supabase CLI 2.117.0, PostgreSQL/Supabase local stack, Bun/Node.js, GitHub Actions, existing SQL contract tests.

**Spec:** `docs/DATABASE-SCHEMA-SOURCE-OF-TRUTH.md`

## Global Constraints

- GitHub is the Source of Truth for application-owned schema artifacts.
- Expected Sysingdashboard Supabase project ref: `zffimqwnrsuzuozsgnlc`.
- Production/target schema writes occur only through the approved Lovable -> Supabase path.
- No production data, passwords, API keys, access tokens or service-role keys may be committed.
- No direct parallel production schema mutation outside the approved path.
- No RLS/RBAC/GRANT weakening to satisfy tests.
- No merge or deploy without separate approval.
- Snapshot scope initially covers application-owned objects in `public`; project-owned customizations in Supabase-managed schemas are versioned separately when they exist.
- KIOSK-01 is not retroactively expanded; DB-SOT-01 becomes a mandatory gate before any new BSF-03A schema change.

---

### Task 1: Pin the Supabase CLI and add deterministic schema commands

**Files:**

- Modify: `package.json`
- Modify: `bun.lock`
- Create: `scripts/database-schema/normalize-schema.mjs`
- Create: `scripts/database-schema/check-drift.mjs`
- Test: `src/__tests__/ci/database-schema-drift.test.ts`

**Interfaces:**

- Consumes: existing `supabase/config.toml`, `supabase/migrations/`.
- Produces: `bun run db:schema:rebuild`, `bun run db:schema:snapshot`, `bun run db:types:generate`, `bun run db:schema:check`.

- [ ] **Step 1: Add the failing package-script contract test**

Create `src/__tests__/ci/database-schema-drift.test.ts` asserting that `package.json` contains exactly these scripts:

```ts
import { describe, expect, it } from "vitest";
import pkg from "../../../package.json";

describe("database schema source-of-truth scripts", () => {
  it("exposes deterministic schema rebuild and drift commands", () => {
    expect(pkg.scripts["db:schema:rebuild"]).toBe("supabase db reset --local --no-seed");
    expect(pkg.scripts["db:schema:snapshot"]).toBe(
      "supabase db dump --local --schema public -f supabase/schema/public-schema.generated.sql",
    );
    expect(pkg.scripts["db:types:generate"]).toBe(
      "supabase gen types --lang typescript --local --schema public > src/integrations/supabase/types.generated.ts",
    );
    expect(pkg.scripts["db:schema:check"]).toBe("node scripts/database-schema/check-drift.mjs");
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
bunx vitest run src/__tests__/ci/database-schema-drift.test.ts
```

Expected: FAIL because the four scripts do not yet exist.

- [ ] **Step 3: Pin Supabase CLI 2.117.0**

Run:

```bash
bun add -D supabase@2.117.0
```

Verify:

```bash
bunx supabase --version
```

Expected: `2.117.0`.

- [ ] **Step 4: Add the package scripts**

Add to `package.json`:

```json
{
  "db:schema:rebuild": "supabase db reset --local --no-seed",
  "db:schema:snapshot": "supabase db dump --local --schema public -f supabase/schema/public-schema.generated.sql",
  "db:types:generate": "supabase gen types --lang typescript --local --schema public > src/integrations/supabase/types.generated.ts",
  "db:schema:check": "node scripts/database-schema/check-drift.mjs"
}
```

- [ ] **Step 5: Implement schema normalization**

Create `scripts/database-schema/normalize-schema.mjs` with one responsibility: normalize generated text before comparison by converting CRLF to LF, removing trailing whitespace, removing blank lines at EOF, and ensuring exactly one final newline. Do not remove SQL statements, policies, grants, comments that encode project intent, or object ordering.

Expose:

```js
export function normalizeGeneratedText(input) {
  return `${input
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n+$/g, "")}\n`;
}
```

- [ ] **Step 6: Implement the drift checker**

Create `scripts/database-schema/check-drift.mjs` that:

1. requires these files to exist:
   - `supabase/schema/public-schema.sql`
   - `supabase/schema/public-schema.generated.sql`
   - `src/integrations/supabase/types.ts`
   - `src/integrations/supabase/types.generated.ts`
2. normalizes both schema files with `normalizeGeneratedText`,
3. normalizes both type files with the same function,
4. exits `0` only when both pairs are equal,
5. prints `DATABASE_SCHEMA_DRIFT: public-schema.sql` for schema mismatch,
6. prints `DATABASE_SCHEMA_DRIFT: types.ts` for type mismatch,
7. exits non-zero on any mismatch,
8. never overwrites committed expected files.

- [ ] **Step 7: Run the focused test and verify GREEN**

Run:

```bash
bunx vitest run src/__tests__/ci/database-schema-drift.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit Task 1**

```bash
git add package.json bun.lock scripts/database-schema src/__tests__/ci/database-schema-drift.test.ts
git commit -m "build(db): add schema source-of-truth tooling"
```

---

### Task 2: Establish the first canonical schema snapshot from migrations

**Files:**

- Create: `supabase/schema/public-schema.sql`
- Create: `supabase/schema/README.md`
- Modify: `src/integrations/supabase/types.ts`
- Test: `supabase/tests/bsf-kiosk-01-role-contract.sql`

**Interfaces:**

- Consumes: complete migration chain including KIOSK-01 migrations on the feature branch.
- Produces: canonical schema snapshot and generated client types for the same reconstructed state.

- [ ] **Step 1: Start the local Supabase stack**

Run:

```bash
bunx supabase start
```

Expected: local stack starts successfully.

- [ ] **Step 2: Rebuild from all migrations without seed data**

Run:

```bash
bun run db:schema:rebuild
```

Expected: PASS; every migration applies from an empty local database.

If any existing migration fails from clean state, stop and classify it as `MIGRATION_REBUILD_FAILURE`; do not generate a snapshot from a partially repaired database.

- [ ] **Step 3: Execute the KIOSK DB contract locally**

Run the existing SQL contract using the repository's established Supabase SQL-test mechanism. The test must prove at least:

- enum `app_role` contains `kiosk`,
- role `kiosk` has exactly `kiosk.view`,
- kiosk role exclusivity is enforced,
- kiosk cannot gain write permissions through normal role assignment.

Expected: PASS with transaction rollback where the existing contract defines rollback behavior.

- [ ] **Step 4: Generate the candidate snapshot**

Run:

```bash
mkdir -p supabase/schema
bun run db:schema:snapshot
```

Expected: `supabase/schema/public-schema.generated.sql` exists and contains only schema DDL, not application data.

- [ ] **Step 5: Promote the verified snapshot**

After reviewing that the generated SQL contains no secrets or data rows:

```bash
cp supabase/schema/public-schema.generated.sql supabase/schema/public-schema.sql
```

- [ ] **Step 6: Regenerate the client types from the same local schema**

Run:

```bash
bun run db:types:generate
cp src/integrations/supabase/types.generated.ts src/integrations/supabase/types.ts
```

- [ ] **Step 7: Add schema README**

Create `supabase/schema/README.md` documenting:

- snapshot is generated from a clean local rebuild of all migrations,
- `public-schema.sql` is application schema only,
- no data/secrets are permitted,
- never edit snapshot to hide a migration mismatch,
- generation commands,
- Lovable remains the remote application path.

- [ ] **Step 8: Verify zero local drift**

Run:

```bash
bun run db:schema:snapshot
bun run db:types:generate
bun run db:schema:check
```

Expected:

```text
DATABASE_SCHEMA_DRIFT: NONE
```

- [ ] **Step 9: Run baseline repo checks**

Run:

```bash
bunx prettier --check .
bun run lint
bun run typecheck
bun run test:security
bun run test:backend
bun run test:api
```

Expected: PASS.

- [ ] **Step 10: Commit Task 2**

```bash
git add supabase/schema src/integrations/supabase/types.ts supabase/tests/bsf-kiosk-01-role-contract.sql
git commit -m "docs(db): establish canonical schema snapshot"
```

---

### Task 3: Add the database schema drift CI gate

**Files:**

- Modify: `.github/workflows/ci.yml`
- Modify: `package.json`
- Test: `src/__tests__/ci/database-schema-drift.test.ts`

**Interfaces:**

- Consumes: Task 1 scripts and Task 2 snapshot/types.
- Produces: required CI evidence `Database Schema Drift`.

- [ ] **Step 1: Extend the CI contract test**

Add assertions that `.github/workflows/ci.yml` contains a job named `Database Schema Drift` and runs:

```text
bunx supabase start
bun run db:schema:rebuild
bun run db:schema:snapshot
bun run db:types:generate
bun run db:schema:check
```

- [ ] **Step 2: Run the focused test and verify RED**

```bash
bunx vitest run src/__tests__/ci/database-schema-drift.test.ts
```

Expected: FAIL because the CI job does not yet exist.

- [ ] **Step 3: Add the CI job**

Add a Linux job after setup/static and before the final Technical Report & Quality Gate. It must:

1. checkout the exact PR SHA,
2. install dependencies with frozen lockfile,
3. start local Supabase,
4. reset from all migrations without seed data,
5. generate temporary schema and types,
6. execute `bun run db:schema:check`,
7. stop local Supabase in an always-run cleanup step.

The job must not connect to the production Sysingdashboard project and must not require a production database password or service-role key.

- [ ] **Step 4: Make the final quality gate depend on schema drift PASS**

Update the existing final gate dependencies so `14 · Technical Report & Quality Gate` cannot succeed if `Database Schema Drift` fails.

- [ ] **Step 5: Run the focused CI contract test and verify GREEN**

```bash
bunx vitest run src/__tests__/ci/database-schema-drift.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add .github/workflows/ci.yml package.json src/__tests__/ci/database-schema-drift.test.ts
git commit -m "ci(db): gate database schema drift"
```

---

### Task 4: Integrate the standard into KIOSK-01 final acceptance and BSF-03A

**Files:**

- Modify: `docs/BSF-CURRENT-PRIORITIES.md`
- Modify: `docs/LOVABLE-PROMPT-PLAN-BSF-03A.md`
- Modify: `docs/BSF-KIOSK-01-CLOSURE-2026-09-14.md`
- Modify: `docs/technical-report-2.md`
- Modify: `docs/CURRENT-STATUS.md`
- Modify: `docs/ENTWICKLUNGSTAGEBUCH.md`

**Interfaces:**

- Consumes: binding DB-SOT-01 and Lovable DB-change standard.
- Produces: planning and audit trail that make the new gate visible in daily work.

- [ ] **Step 1: Add DB-SOT-01 to operative priorities**

State explicitly:

```text
KIOSK-01 FINAL DB ACCEPTANCE
  -> DB-SOT-01 baseline snapshot + drift guard
  -> KIOSK-01 FINAL PASS
  -> BSF-03A may perform new DB changes
```

DB-SOT-01 remains a cross-cutting gate, not a new feature sprint.

- [ ] **Step 2: Add the Lovable standard to BSF-03A L1**

Require before any BSF-03A DB write:

```text
TARGET_PROJECT = zffimqwnrsuzuozsgnlc
MIGRATION_VERSIONED = PASS
SCHEMA_BASELINE = PASS
DB_SCHEMA_DRIFT = NONE
```

Otherwise return `BLOCKED` and do not write.

- [ ] **Step 3: Extend KIOSK-01 closure evidence**

After the real Kiosk migrations are applied through Lovable and the post-migration advisor passes, record:

- applied migration filenames,
- canonical snapshot commit SHA,
- types commit SHA/head,
- Kiosk DB contract result,
- Advisor result,
- drift result.

Do not mark KIOSK-01 DONE before these are recorded once DB-SOT-01 implementation is active.

- [ ] **Step 4: Extend the technical report**

Add a database portability/evidence subsection with:

```text
Migration chain: PASS|FAIL
Schema snapshot: CURRENT|DRIFT
Generated types: CURRENT|DRIFT
DB contract tests: PASS|FAIL
Remote target project: VERIFIED|BLOCKED
Security Advisor: PASS|BASELINE_ONLY|FAIL
```

- [ ] **Step 5: Run docs/project checks**

```bash
bun run docs:check
bun run project-status:check
bunx prettier --check .
```

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

```bash
git add docs/
git commit -m "docs(db): enforce schema source-of-truth gate"
```

---

### Task 5: Perform the first controlled remote parity proof through Lovable

**Files:**

- Modify: `docs/BSF-KIOSK-01-CLOSURE-2026-09-14.md`
- Modify: `docs/technical-report-2.md`
- Modify: `docs/CURRENT-STATUS.md`
- Modify: `docs/ENTWICKLUNGSTAGEBUCH.md`

**Interfaces:**

- Consumes: approved KIOSK-01 migrations, canonical schema snapshot, Lovable DB-change standard.
- Produces: first evidence that the real Sysingdashboard Supabase instance is an instance of the Git contract.

- [ ] **Step 1: Verify the Lovable-connected project before writes**

Lovable must report exactly:

```text
TARGET_PROJECT = zffimqwnrsuzuozsgnlc
CONTEXT_VERIFIED = YES
```

Any other value => `BLOCKED_WRONG_SUPABASE_CONTEXT`, no DB write.

- [ ] **Step 2: Apply only the already-versioned KIOSK migrations**

Apply, in order:

```text
supabase/migrations/20260914062000_bsf_kiosk_01_add_role.sql
supabase/migrations/20260914062100_bsf_kiosk_01_permission_and_exclusivity.sql
```

No unrelated SQL changes are allowed in this step.

- [ ] **Step 3: Execute the KIOSK contract and Security Advisor**

Expected:

```text
KIOSK_DB_CONTRACT = PASS
SECURITY_ADVISOR = PASS or documented known baseline only
NEW_HIGH_FINDINGS = 0
NEW_ERROR_FINDINGS = 0
NEW_CRITICAL_FINDINGS = 0
```

- [ ] **Step 4: Verify live parity read-only**

Using Lovable's connected Supabase access, inspect the live catalog for the objects touched by the Kiosk migrations and compare them to the committed migration/snapshot contract. Confirm at minimum:

- `app_role` contains `kiosk`,
- `kiosk.view` exists exactly as planned,
- kiosk exclusivity function/constraint/trigger semantics match the migration,
- no unversioned object was introduced.

Expected:

```text
LIVE_SCHEMA_PARITY = PASS
DATABASE_SCHEMA_DRIFT = NONE
```

- [ ] **Step 5: Re-run exact-head GitHub CI**

Expected: Security, full CI and `Database Schema Drift` all PASS on the exact PR head.

- [ ] **Step 6: Update closure evidence only after fresh verification**

Record all exact SHAs/run IDs and keep PR draft/merge/deploy state unchanged until separately approved.

- [ ] **Step 7: Commit Task 5 documentation**

```bash
git add docs/
git commit -m "docs(kiosk): record database source-of-truth acceptance"
```

---

## Self-Review

### Spec coverage

- Four-artifact rule: Tasks 1-2.
- Reconstructability from migrations: Tasks 2-3.
- Canonical schema snapshot: Task 2.
- Generated Supabase types: Tasks 1-2.
- DB contract tests: Tasks 2 and 5.
- CI drift guard: Task 3.
- Lovable-only remote change path: Tasks 4-5.
- Wrong-project fail-closed rule: Tasks 4-5.
- KIOSK transition and BSF-03A gate: Task 4.
- Remote parity proof: Task 5.
- No secrets/data: global constraints and Tasks 2-3.

### Placeholder scan

No TODO/TBD placeholders are permitted. Any environment-specific command must use the exact package scripts defined in Task 1; remote Supabase actions are deliberately executed through Lovable rather than direct CLI credentials.

### Type consistency

- Generated schema candidate: `supabase/schema/public-schema.generated.sql`.
- Committed schema: `supabase/schema/public-schema.sql`.
- Generated type candidate: `src/integrations/supabase/types.generated.ts`.
- Committed types: `src/integrations/supabase/types.ts`.
- Drift result token: `DATABASE_SCHEMA_DRIFT`.
