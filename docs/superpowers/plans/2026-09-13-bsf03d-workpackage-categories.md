# BSF-03D – Arbeitspaket-Kategorien Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Systemhausweit editierbare Arbeitspaket-Kategorien über den bestehenden Reference-Data-Dienst bereitstellen, sicher an WorkPackages anbinden und Import/Export/Backup rückwärtskompatibel erweitern.

**Architecture:** Der bestehende Reference-Data-Plattformdienst wird um `global | systemhouse`-Scope erweitert. `workpackage.category` bleibt ein gemeinsamer Katalog, dessen Werte durch `systemhouse_id` tenant-getrennt sind. WorkPackages speichern stabilen `categoryKey` plus `categoryLabel`-Snapshot; UI, Cache, Import und Backup verwenden ausschließlich die providerneutralen Service-/Domain-Verträge.

**Tech Stack:** TypeScript 5.9, React 19, TanStack Start/Router, Supabase/PostgreSQL/RLS, Zod, Vitest, Playwright, Bun, Prettier 3.8.4.

**Spec:** `docs/superpowers/specs/2026-09-13-bsf03d-workpackage-categories-design.md`

## Global Constraints

- GitHub `main` bleibt bis zur vollständigen Abnahme unangetastet.
- Featurebranch: `feat/bsf03d-workpackage-categories`.
- Kein Service-Role-Key im Browser oder in Tests/Docs.
- Keine Verbreiterung bestehender Personen-/Customer-RLS.
- Bestehende globale Reference-Data-Kataloge bleiben rückwärtskompatibel.
- Kategorien sind systemhausweit, nicht kundenspezifisch.
- Kategorie ist optional; `null`/fehlend bedeutet keine Kategorie.
- Kein Hard Delete; Deaktivierung statt Löschung.
- Tags bleiben unabhängig.
- TDD: RED vor GREEN, danach Refactor/Regression.
- Vollständige CI/Security/E2E/Accessibility/Technical-Debt/Quality-Gates vor Merge.

---

## File Structure

### Datenbank / Security

- Create via Supabase CLI: migration `bsf03d_reference_data_systemhouse_scope`
- Create: `supabase/tests/bsf-03d-workpackage-category-scope.sql`
- Modify after generated DB diff/types: `src/integrations/supabase/types.ts`

### Reference-Data-Domain

- Modify: `src/lib/reference-data/types.ts`
- Modify: `src/lib/reference-data/adapter.ts`
- Modify: `src/lib/reference-data/repository.ts`
- Modify: `src/lib/reference-data/service.ts`
- Modify: `src/lib/reference-data/cache.ts`
- Modify: `src/lib/reference-data/index.ts`
- Modify: `src/hooks/useReferenceData.ts`
- Create: `src/lib/reference-data/workpackage-category.ts`
- Test: `src/__tests__/lib/reference-data/service.test.ts`
- Create: `src/__tests__/lib/reference-data/cache-v2.test.ts`
- Create: `src/__tests__/lib/reference-data/workpackage-category.test.ts`

### WorkPackage / Import / Backup

- Modify: `src/lib/dashboard-data.ts`
- Modify: `src/components/dashboard/domain.ts`
- Modify: `src/lib/json-schema.ts`
- Modify: `src/lib/json-import-service.ts`
- Modify applicable JSON-export mapper discovered from current export path before edit
- Modify: `src/lib/backup/avkk-payload.ts`
- Modify backup/restore schema/validator files that consume `ReferenceDataset`
- Test: `src/__tests__/io/*` relevant WorkPackage import/export specs
- Test: `src/__tests__/backup/*` relevant Reference-Data backup specs

### UI / Runtime

- Modify: `src/components/dashboard/dialogs/WorkPackageDialog.tsx`
- Modify: `src/routes/_authenticated/dashboard.tsx`
- Create: `src/components/reference-data/WorkPackageCategoryManagementView.tsx`
- Create: `src/routes/_authenticated/arbeitspaket-kategorien/index.tsx`
- Create: `src/lib/reference-data/workpackage-category.functions.ts`
- Modify: `src/components/dashboard/header/ServiceMenu.tsx`
- Modify generated route tree only through normal TanStack generation/build process, never hand-edit unless repository workflow requires it
- Create: `src/__tests__/components/WorkPackageCategoryManagementView.test.tsx`
- Create: `src/__tests__/security/workpackage-category-functions.test.ts`

### E2E / Docs

- Create: `e2e/fixtures/workpackage-categories-e2e.ts`
- Create: `e2e/specs/security/workpackage-categories.spec.ts`
- Modify: `src/lib/help-documentation.ts`
- Modify: `src/lib/help-navigation-topics.ts`
- Modify: `docs/REFERENCE-DATA.md`
- Modify: `docs/DATA-SCHEMA.md`
- Modify: `docs/RBAC-MATRIX.md` only if wording/scope needs clarification; permission matrix itself remains unchanged
- Modify: `docs/CURRENT-STATUS.md`
- Modify: `docs/BSF-CURRENT-PRIORITIES.md`
- Modify: `docs/SPRINT-PLAN-MVP-BSF.md`
- Modify: `docs/PROJECT-STATUS.yaml`
- Modify: `CHANGELOG.md`
- Modify version source(s) used by current repository version check to `1.62.0`

---

### Task 1: RED – Tenant-Scope-Datenbankvertrag

**Files:**

- Create via CLI migration command: `bunx supabase migration new bsf03d_reference_data_systemhouse_scope`
- Create: `supabase/tests/bsf-03d-workpackage-category-scope.sql`

**Interfaces:**

- Consumes: `public.reference_catalog`, `public.reference_value`, `public.reference_value_history`, `public.has_permission(uuid,text)`, `public.has_active_systemhouse_membership(uuid,uuid)`.
- Produces: `scope_type`, `systemhouse_id`, RLS-Vertrag für systemhausbezogene Werte und Katalog `workpackage.category`.

- [ ] **Step 1: SQL-RED-Test schreiben**

Der Test erzeugt zwei synthetische Systemhäuser A/B, je einen aktiven Member, einen Admin mit `referencedata.manage`, einen Leser ohne Manage und Werte in beiden Scopes. Mindestens folgende Assertions müssen als `pg_temp.assert`/`assert_denied` vorhanden sein:

```sql
-- globaler Altbestand bleibt lesbar
SELECT pg_temp.assert(
  EXISTS (
    SELECT 1 FROM public.reference_catalog
    WHERE key = 'avkk.responsibility_type'
      AND scope_type = 'global'
  ),
  'D01 existing global catalog preserved'
);

-- SH-A darf eigenen Wert lesen
SELECT pg_temp.assert(
  EXISTS (
    SELECT 1 FROM public.reference_value
    WHERE catalog_id = current_setting('test.wp_catalog_id')::uuid
      AND systemhouse_id = current_setting('test.sh_a')::uuid
      AND key = 'incident'
  ),
  'D02 own systemhouse category readable'
);

-- SH-A darf SH-B-Wert nicht lesen
SELECT pg_temp.assert(
  NOT EXISTS (
    SELECT 1 FROM public.reference_value
    WHERE catalog_id = current_setting('test.wp_catalog_id')::uuid
      AND systemhouse_id = current_setting('test.sh_b')::uuid
      AND key = 'maintenance'
  ),
  'D03 cross-systemhouse read denied'
);
```

Weitere RED-Fälle: Manage+Membership INSERT PASS, Manage ohne Membership DENY, Read ohne Membership DENY, Nichtmanager UPDATE DENY, DELETE bleibt DENY, `global => systemhouse_id IS NULL`, `systemhouse => systemhouse_id IS NOT NULL`, Eindeutigkeit je `(catalog_id, systemhouse_id, key)`.

- [ ] **Step 2: RED gegen aktuellen DB-Vertrag ausführen**

Run in transaction against the configured Supabase test DB:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/bsf-03d-workpackage-category-scope.sql
```

Expected: FAIL because `scope_type` / `systemhouse_id` do not exist.

- [ ] **Step 3: Migration mit Minimalvertrag füllen**

Core DDL:

```sql
ALTER TABLE public.reference_catalog
  ADD COLUMN scope_type text NOT NULL DEFAULT 'global',
  ADD CONSTRAINT reference_catalog_scope_type_check
    CHECK (scope_type IN ('global','systemhouse'));

ALTER TABLE public.reference_value
  ADD COLUMN systemhouse_id uuid NULL
    REFERENCES public.systemhouse(id) ON DELETE RESTRICT;

ALTER TABLE public.reference_value_history
  ADD COLUMN systemhouse_id uuid NULL
    REFERENCES public.systemhouse(id) ON DELETE RESTRICT;

ALTER TABLE public.reference_value
  DROP CONSTRAINT reference_value_catalog_id_key_key;

CREATE UNIQUE INDEX reference_value_global_key_unique
  ON public.reference_value(catalog_id, key)
  WHERE systemhouse_id IS NULL;

CREATE UNIQUE INDEX reference_value_systemhouse_key_unique
  ON public.reference_value(catalog_id, systemhouse_id, key)
  WHERE systemhouse_id IS NOT NULL;
```

Add constraints/triggers so a global catalog rejects non-null `systemhouse_id` and a systemhouse catalog rejects null `systemhouse_id`. Create `workpackage.category` with `scope_type='systemhouse'`, no hard-coded category values.

RLS semantics for `reference_value`:

```sql
USING (
  public.has_permission(auth.uid(), 'referencedata.view')
  AND (
    systemhouse_id IS NULL
    OR public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
  )
)
```

Write policies additionally require `referencedata.manage` and active Membership. Preserve existing least-privilege grants from SEC-02; do not grant DELETE/TRUNCATE.

- [ ] **Step 4: GREEN SQL-Test ausführen**

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/bsf-03d-workpackage-category-scope.sql
```

Expected: PASS, transaction rolls back all synthetic rows.

- [ ] **Step 5: SEC-02 Regression ausführen**

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/sec02-reference-data-grants.sql
```

Expected: PASS or documented intentional assertion update only where scope metadata changes; privilege envelope must remain unchanged.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations supabase/tests/bsf-03d-workpackage-category-scope.sql
git commit -m "feat(bsf03d): Reference Data nach Systemhaus scopen"
```

---

### Task 2: RED/GREEN – Reference-Data-Domäne und principal-sicherer Cache V2

**Files:**

- Modify: `src/lib/reference-data/types.ts`
- Modify: `src/lib/reference-data/adapter.ts`
- Modify: `src/lib/reference-data/repository.ts`
- Modify: `src/lib/reference-data/service.ts`
- Modify: `src/lib/reference-data/cache.ts`
- Modify: `src/lib/reference-data/index.ts`
- Modify: `src/hooks/useReferenceData.ts`
- Test: `src/__tests__/lib/reference-data/service.test.ts`
- Create: `src/__tests__/lib/reference-data/cache-v2.test.ts`

**Interfaces:**

- Produces:

```ts
export type ReferenceScopeType = "global" | "systemhouse";

export interface ReferenceDataAccessContext {
  principalId: string;
  systemhouseIds: string[];
}

export interface ReferenceCatalog {
  // existing fields...
  scopeType: ReferenceScopeType;
}

export interface ReferenceValue {
  // existing fields...
  systemhouseId: string | null;
}

export async function listValues(
  catalogKey: string,
  options?: { includeInactive?: boolean; systemhouseId?: string },
): Promise<ReferenceValue[]>;
```

- [ ] **Step 1: RED service/cache tests ergänzen**

Test cases:

```ts
it("filters a systemhouse catalog by systemhouseId", async () => {
  const values = await service.listValues("workpackage.category", {
    systemhouseId: "sh-a",
  });
  expect(values.every((value) => value.systemhouseId === "sh-a")).toBe(true);
});

it("does not reuse cache from another principal", () => {
  writeCache(scopeA, snapshotA);
  expect(readCache(scopeB)).toBeNull();
});

it("does not reuse cache when active systemhouse scope changed", () => {
  writeCache({ principalId: "u1", systemhouseIds: ["a"] }, snapshotA);
  expect(readCache({ principalId: "u1", systemhouseIds: ["b"] })).toBeNull();
});
```

- [ ] **Step 2: RED ausführen**

```bash
bunx vitest run src/__tests__/lib/reference-data/service.test.ts src/__tests__/lib/reference-data/cache-v2.test.ts
```

Expected: FAIL because scope fields/signatures do not exist.

- [ ] **Step 3: Domain-Typen und Adapter implementieren**

`adapter.fetchAll()` also loads the current authenticated principal and own active `systemhouse_membership` rows under existing self-only RLS. It returns `{ context, catalogs, values }`. It maps `scope_type -> scopeType` and `systemhouse_id -> systemhouseId`.

No Supabase imports above `adapter.ts`.

- [ ] **Step 4: Cache V2 implementieren**

Use explicit version/key builder:

```ts
export const CACHE_VERSION = 2 as const;

export function cacheKey(context: ReferenceDataAccessContext): string {
  const houses = [...context.systemhouseIds].sort().join(",");
  return `sysing.referencedata.v2:${context.principalId}:${houses}`;
}
```

`readCache(context)` only returns a snapshot whose embedded access context exactly matches the requested principal and sorted systemhouse IDs. V1 cache is ignored by V2 reads.

- [ ] **Step 5: Service scoping implementieren**

For `scopeType='systemhouse'`, `listValues()` requires `options.systemhouseId`; without it return `[]` rather than leaking a mixed tenant list. Global catalogs ignore `systemhouseId` and preserve previous behavior.

- [ ] **Step 6: GREEN tests**

```bash
bunx vitest run src/__tests__/lib/reference-data/service.test.ts src/__tests__/lib/reference-data/cache-v2.test.ts
```

Expected: PASS.

- [ ] **Step 7: Existing AVKK reference-data regression**

```bash
bunx vitest run src/__tests__/lib/reference-data src/__tests__/hooks
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/reference-data src/hooks/useReferenceData.ts src/__tests__/lib/reference-data
git commit -m "feat(bsf03d): Reference-Data-Cache tenant-sicher machen"
```

---

### Task 3: RED/GREEN – WorkPackage-Kategorie und Validierungslogik

**Files:**

- Modify: `src/lib/dashboard-data.ts`
- Modify: `src/components/dashboard/domain.ts`
- Create: `src/lib/reference-data/workpackage-category.ts`
- Create: `src/__tests__/lib/reference-data/workpackage-category.test.ts`

**Interfaces:**

```ts
export interface WorkPackage {
  // existing fields...
  categoryKey?: string | null;
  categoryLabel?: string | null;
}

export function resolveWorkPackageCategory(
  input: { categoryKey?: string | null; categoryLabel?: string | null },
  values: readonly ReferenceValue[],
): { categoryKey: string | null; categoryLabel: string | null; selectable: boolean };
```

- [ ] **Step 1: RED tests**

Cover no-category default, active category, inactive historical category, unknown category, foreign-systemhouse list and tags independence.

```ts
expect(resolveWorkPackageCategory({}, values)).toEqual({
  categoryKey: null,
  categoryLabel: null,
  selectable: true,
});
```

- [ ] **Step 2: RED run**

```bash
bunx vitest run src/__tests__/lib/reference-data/workpackage-category.test.ts
```

Expected: FAIL because helper/type fields do not exist.

- [ ] **Step 3: Minimal implementation**

Add the two optional WorkPackage fields. Preserve them in `normalizeWorkPackage`; never derive billable/status/priority from them. Unknown keys return `selectable:false` while preserving the input snapshot label for historical display.

- [ ] **Step 4: GREEN run**

```bash
bunx vitest run src/__tests__/lib/reference-data/workpackage-category.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard-data.ts src/components/dashboard/domain.ts src/lib/reference-data/workpackage-category.ts src/__tests__/lib/reference-data/workpackage-category.test.ts
git commit -m "feat(bsf03d): Kategorie am Arbeitspaket modellieren"
```

---

### Task 4: RED/GREEN – JSON Import/Export und Backup-Scope

**Files:**

- Modify: `src/lib/json-schema.ts`
- Modify: `src/lib/json-import-service.ts`
- Modify actual export mapper used by `ImportExportDialog`
- Modify: `src/lib/backup/avkk-payload.ts`
- Modify related backup schema/validator files discovered by type references to `ReferenceDataset`
- Test: relevant `src/__tests__/io/*`
- Test: relevant `src/__tests__/backup/*`

**Interfaces:**

WorkPackage JSON fields:

```ts
categoryKey: z.string().max(SHORT_STR).nullable().optional(),
categoryLabel: z.string().max(SHORT_STR).nullable().optional(),
```

Reference backup fields:

```ts
scopeType: z.enum(["global", "systemhouse"]),
systemhouseId: z.string().uuid().nullable(),
```

- [ ] **Step 1: RED tests**

Required cases:

1. v1.1 JSON without category parses.
2. JSON with category round-trips key + label.
3. Unknown/fremd scoped category produces explicit import conflict/warning and never substitutes another value.
4. Backup includes `scopeType` and `systemhouseId`.
5. Existing backup without WorkPackage category stays valid.

- [ ] **Step 2: RED run**

```bash
bun run test:io
bun run test:backup
```

Expected: new tests FAIL only on missing category/scope support.

- [ ] **Step 3: Schema/mappers implementieren**

Keep schema version backward-compatible; only bump JSON schema version if the repository contract requires a version bump for additive fields. Do not reject documents solely because the optional fields are absent.

- [ ] **Step 4: GREEN run**

```bash
bun run test:io
bun run test:backup
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/json-schema.ts src/lib/json-import-service.ts src/lib/backup src/__tests__/io src/__tests__/backup
git commit -m "feat(bsf03d): Kategorien in Import Export und Backup aufnehmen"
```

---

### Task 5: RED/GREEN – Sichere Kategorieverwaltung

**Files:**

- Create: `src/lib/reference-data/workpackage-category.functions.ts`
- Create: `src/components/reference-data/WorkPackageCategoryManagementView.tsx`
- Create: `src/routes/_authenticated/arbeitspaket-kategorien/index.tsx`
- Modify: `src/components/dashboard/header/ServiceMenu.tsx`
- Create: `src/__tests__/security/workpackage-category-functions.test.ts`
- Create: `src/__tests__/components/WorkPackageCategoryManagementView.test.tsx`

**Interfaces:**

```ts
export interface WorkPackageCategoryScope {
  systemhouseId: string;
  systemhouseName: string;
}

export interface WorkPackageCategoryManagementPayload {
  scopes: WorkPackageCategoryScope[];
  selectedSystemhouseId: string | null;
  values: ReferenceValue[];
}
```

Server functions:

```ts
listWorkPackageCategoryManagementFn({ data: { systemhouseId?: string } })
createWorkPackageCategoryFn({ data: { systemhouseId, key, label, description, sortOrder } })
updateWorkPackageCategoryFn({ data: { systemhouseId, valueId, label, description, sortOrder } })
deactivateWorkPackageCategoryFn({ data: { systemhouseId, valueId } })
```

- [ ] **Step 1: RED security tests**

Source/runtime contract tests must assert:

- mutations require `referencedata.manage`,
- all requests use authenticated user context, no service role,
- requested `systemhouseId` must be an active own membership,
- key cannot be changed by update,
- deactivate uses update semantics, not delete,
- response contains only category metadata/systemhouse names, no profile secrets.

- [ ] **Step 2: RED component tests**

Test single-scope automatic selection, multi-scope selector, nonmanager read-only/hidden management controls, inactive badge, create/edit/deactivate interactions.

- [ ] **Step 3: RED run**

```bash
bunx vitest run src/__tests__/security/workpackage-category-functions.test.ts src/__tests__/components/WorkPackageCategoryManagementView.test.tsx
```

Expected: FAIL because route/functions/components do not exist.

- [ ] **Step 4: Server functions implementieren**

Use existing auth/server-function pattern from customer-responsibility management. Resolve own active memberships server-side. Use the provider-neutral Reference-Data service/repository path; do not query Reference Data directly from UI components.

- [ ] **Step 5: Management UI implementieren**

Route title: `Arbeitspaket-Kategorien`. Service-menu link only renders with `referencedata.manage`; server functions still enforce authorization independently.

- [ ] **Step 6: GREEN tests**

```bash
bunx vitest run src/__tests__/security/workpackage-category-functions.test.ts src/__tests__/components/WorkPackageCategoryManagementView.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/reference-data/workpackage-category.functions.ts src/components/reference-data src/routes/_authenticated/arbeitspaket-kategorien src/components/dashboard/header/ServiceMenu.tsx src/__tests__/security/workpackage-category-functions.test.ts src/__tests__/components/WorkPackageCategoryManagementView.test.tsx
git commit -m "feat(bsf03d): Arbeitspaket-Kategorien verwaltbar machen"
```

---

### Task 6: RED/GREEN – Kategorieauswahl im WorkPackageDialog

**Files:**

- Modify: `src/components/dashboard/dialogs/WorkPackageDialog.tsx`
- Modify: `src/routes/_authenticated/dashboard.tsx`
- Add/modify focused component test for `WorkPackageDialog`

**Interfaces:**

Add dialog props:

```ts
categories: ReferenceValue[];
categoryLoading?: boolean;
```

- [ ] **Step 1: RED UI test**

Verify:

- default option `— Keine Kategorie —`,
- active categories shown,
- current inactive category shown once with `(deaktiviert)`,
- selecting a category saves both key and current label,
- clearing selection saves both as `null`,
- tags remain unchanged.

- [ ] **Step 2: RED run**

```bash
bunx vitest run src/__tests__/components
```

Expected: focused new test FAIL.

- [ ] **Step 3: Dialog integration implementieren**

Dashboard loads `workpackage.category` for the current active systemhouse context using `useReferenceData`. Do not render a mixed list if no unambiguous systemhouse scope is available; show `— Keine Kategorie —` plus a clear unavailable/loading state.

- [ ] **Step 4: GREEN component regression**

```bash
bunx vitest run src/__tests__/components
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/dialogs/WorkPackageDialog.tsx src/routes/_authenticated/dashboard.tsx src/__tests__/components
git commit -m "feat(bsf03d): Kategorie im Arbeitspaket auswählen"
```

---

### Task 7: E2E, Accessibility und Cross-Systemhouse-Negativpfade

**Files:**

- Create: `e2e/fixtures/workpackage-categories-e2e.ts`
- Create: `e2e/specs/security/workpackage-categories.spec.ts`

**Interfaces:**

- Consumes final server-function/UI contracts from Tasks 5–6.

- [ ] **Step 1: E2E fixture implementieren**

Provide two systemhouses with distinct categories and roles Admin, Teamlead, Engineer, Viewer. ServerFn interception must decode TanStack `_serverFn/<descriptor>` descriptors using the already proven P5 fixture pattern, not plaintext URL regexes.

- [ ] **Step 2: E2E tests schreiben**

Required scenarios:

1. Admin SH-A manages only SH-A categories.
2. SH-A never sees SH-B category.
3. Teamlead can select category on editable AP but cannot open management controls.
4. Engineer can select category only where existing WorkPackage edit permission allows.
5. Viewer cannot mutate AP/category.
6. Inactive historical category remains visible.
7. New AP defaults to no category.
8. Logout/login as another principal does not reveal previous cached categories.
9. Unknown/fremd import does not silently map.

- [ ] **Step 3: Focused E2E run**

```bash
bunx playwright test e2e/specs/security/workpackage-categories.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Full E2E regression**

```bash
bun run test:e2e
```

Expected: all Playwright tests PASS.

- [ ] **Step 5: Accessibility**

```bash
bun run test:a11y
```

Expected: PASS; category selector and management controls have accessible labels and keyboard operation.

- [ ] **Step 6: Commit**

```bash
git add e2e
git commit -m "test(bsf03d): Kategorien E2E und Tenant-Grenzen absichern"
```

---

### Task 8: Dokumentation, Version 1.62.0 und finale Verifikation

**Files:**

- Modify docs/version files listed in File Structure.

**Interfaces:**

- Produces authoritative project state: BSF-03D DONE, BSF-03A next.

- [ ] **Step 1: Dokumentation aktualisieren**

Document:

- `workpackage.category` systemhouse scope,
- Cache V2 principal/scope binding,
- WorkPackage `categoryKey/categoryLabel`,
- management permission unchanged,
- import/export/backup behavior,
- Cross-Systemhouse deny contract,
- version `1.62.0`,
- BSF-03D completion and BSF-03A as next sprint.

- [ ] **Step 2: Format/Static lokal prüfen**

```bash
bunx prettier --check .
bun run lint
bun run typecheck
bun run rbac:check
bun run lint:no-console
bun run docs:check
bun run project-status:check
```

Expected: PASS.

- [ ] **Step 3: Full relevant tests**

```bash
bun run test
bun run test:security
bun run test:io
bun run test:backup:integrity
bun run build
bun run test:e2e
bun run test:a11y
bun run test:debt
bun run report:technical:ci
bun run ci:gate
```

Expected: PASS with zero unexpected failures.

- [ ] **Step 4: Git hygiene**

```bash
git status --short
git diff --check main...HEAD
git diff --name-only main...HEAD
```

Expected: clean worktree after commit, no whitespace errors, no debug/temp/secret files, only BSF-03D-related changes.

- [ ] **Step 5: Commit Abschlussdokumentation**

```bash
git add CHANGELOG.md docs src/lib/help-documentation.ts src/lib/help-navigation-topics.ts
git commit -m "docs(bsf03d): Arbeitspaket-Kategorien abschließen"
```

- [ ] **Step 6: Draft PR öffnen**

PR title:

```text
feat(bsf03d): Arbeitspaket-Kategorien systemhausweit verwalten
```

PR body must include migration/security evidence, SQL test results, exact test counts, E2E scenarios, version, changed-file scope and explicit `Deploy: NEIN` until separately requested.

- [ ] **Step 7: Exact-Head CI/Security abwarten**

Only the current PR head counts. Required: Security success and complete CI success including Technical Report & Quality Gate.

- [ ] **Step 8: Merge with expected-head protection**

Merge only when PR is current with `main`, mergeable, non-draft and all exact-head gates PASS.

- [ ] **Step 9: Post-Merge verification**

Verify:

- `main` points at the merge commit,
- Lovable has consumed the merge commit,
- Issue #103 is updated/closed as completed,
- BSF-03A/#106 is marked next,
- no temporary branch workflows/scripts remain,
- no deploy was triggered unless explicitly requested.
