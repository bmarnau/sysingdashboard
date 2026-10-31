# BSF-07 P1 — MC01–MC35 Coverage Matrix

Status: **P1 candidate — contractual test evidence is mapped below; acceptance remains gated by the quality and exact-head evidence.**

This matrix maps the grouped RED-test requirement in
`BSF-07-MANAGEMENT-COCKPIT-DESIGN.md` to concrete assertions. It neither
adds product semantics nor changes authorization. Test names refer to
`src/__tests__/lib/management-cockpit/management-cockpit-service.test.ts`.

| Case | P0 group | Concrete test / assertion | Evidence status |
|---|---|---|---|
| MC01 | Data state | `keeps a complete, usable source AVAILABLE`: usable source remains `AVAILABLE` | Covered |
| MC02 | Data state | parameterized `preserves EMPTY without inventing attention data`: `EMPTY` remains payload-free | Covered |
| MC03 | Data state | `preserves PARTIAL and does not change the observed source values` | Covered |
| MC04 | Data state | parameterized `preserves UNKNOWN without inventing attention data`: `UNKNOWN` remains payload-free | Covered |
| MC05 | Data state | parameterized `preserves UNAVAILABLE without inventing attention data`: `UNAVAILABLE` remains payload-free | Covered |
| MC06 | Data state | `keeps denied sections empty so no count or identifier can leak` | Covered |
| MC07 | Data state | `strips invalid payloads from DENIED sources`: no identifiers, counts, or values survive | Covered |
| MC08 | Data state | `strips invalid payloads from secondary non-usable sources` | Covered |
| MC09 | Domain/freshness | `preserves PARTIAL and does not change the observed source values`: completeness drives `PARTIAL` without recomputation | Covered |
| MC10 | Domain/freshness | `passes freshness through without deriving a freshness status`: input timestamps remain source values; no new traffic-light field | Covered |
| MC11 | Domain/freshness | `does not create attention when the canonical project identity is incomplete` | Covered |
| MC12 | Domain/freshness | `keeps secondary source states independently scoped`: domain/source state is not inferred from another source | Covered |
| MC13 | Capability / role preview | `treats SYSTEM_ENGINEER role preview as display metadata and never widens attention` | Covered |
| MC14 | Capability / role preview | `treats CUSTOMER_OWNER role preview as display metadata and never widens attention` | Covered |
| MC15 | Capability / role preview | `treats PROJECT_MANAGER role preview as display metadata and never widens attention` | Covered |
| MC16 | Capability / role preview | `treats TEAM_LEAD role preview as display metadata and never widens attention` | Covered |
| MC17 | Capability / role preview | `treats ADMINISTRATION role preview as display metadata and never widens attention` | Covered |
| MC18 | Capability / role preview | `drops an invalid role preview`: unknown role has no output metadata | Covered |
| MC19 | Capability / role preview | Valid preview leaves `attention` byte-for-byte unchanged; it cannot widen data scope | Covered |
| MC20 | Capability / role preview | Invalid preview cannot create an effective role, identity, permission, JWT, RLS, or scope change | Covered (boundary assertion) |
| MC21 | No rights union / cross-scope | parameterized `preserves all six pre-authorised states … without creating a rights union` for AVKK, customers, and work packages | Covered |
| MC22 | No rights union / cross-scope | `does not correlate a same-named project from another customer` | Covered |
| MC23 | No rights union / cross-scope | `does not correlate a bridge from another systemhouse` | Covered |
| MC24 | No rights union / cross-scope | `strips invalid payloads from secondary non-usable sources`: denied/unusable payload never leaks across sources | Covered |
| MC25 | Correlation | `correlates only an exact canonical bridge`: exact systemhouse, customer, project, and work-package IDs required | Covered |
| MC26 | Correlation | `does not expose a drill-down target without a canonical bridge`: zero match is `NOT_CORRELATABLE` | Covered |
| MC27 | Correlation | `does not expose a drill-down target for ambiguous canonical bridges`: multiple match is `AMBIGUOUS` | Covered |
| MC28 | Correlation | Cross-customer same-name assertion proves names/labels are not a correlation key | Covered |
| MC29 | KPI provenance / prohibitions | `records only project-controlling provenance`: attention is sourced exclusively from `PROJECT_CONTROLLING` | Covered |
| MC30 | KPI provenance / prohibitions | `does not introduce prohibited calculated KPI fields`: no `managementScore` | Covered |
| MC31 | KPI provenance / prohibitions | Same assertion: no `customerHealthPercent` or `projectOnTrackPercent` | Covered |
| MC32 | KPI provenance / prohibitions | Same assertion: no `freshnessStatus` or `trend` | Covered |
| MC33 | Drill-down | Exact bridge exposes exactly its canonical `workPackageSourceId` | Covered |
| MC34 | Drill-down | No bridge emits `NOT_CORRELATABLE` without a work-package ID | Covered |
| MC35 | Drill-down | Multiple bridges emit `AMBIGUOUS` without a work-package ID | Covered |

## AQGS-TCA-01 test-goal review

This is the P1 application of `AQGS-TCA-01`. It separates necessary contract
coverage from redundant execution; it does not downgrade a required gate.

| Goal / risk | Test level and evidence | Review decision | Rationale |
|---|---|---|---|
| Six source states do not invent, leak, or silently normalize data | MC01–MC08; parameterized composer state tests | `BEIBEHALTEN` | State handling is the fail-closed boundary. Parameterization already removes repeated test setup without combining distinct assertions. |
| Source facts, completeness, and freshness retain their original meaning | MC09–MC12; project-controlling regression | `BEIBEHALTEN` | The composer must project, not recalculate, source semantics. |
| Preview and independently authorized sources never widen effective access | MC13–MC24; role-preview, source-state, customer- and systemhouse-boundary tests | `BEIBEHALTEN` | This covers authorization-adjacent and cross-scope failure modes; it is not eligible for deletion based on runtime. |
| Correlation and drill-down stay canonical and fail closed | MC25–MC28 and MC33–MC35; exact, zero, multiple, missing-ID, and cross-scope bridge tests | `BEIBEHALTEN` | An omitted or guessed bridge could expose an unauthorized drill-down target. |
| No derived score, trend, or health KPI is introduced | MC29–MC32; provenance and prohibited-field assertions | `BEIBEHALTEN` | P1 is restricted to source-of-truth composition. |
| P1 remains acceptable only with executable local and exact-head gates | typecheck, lint, format, docs/project-status, full suite, signed PR CI/Security | `BLOCKED` | The MC suite is not equivalent to the required release evidence. The local toolchain blocker is documented below. |

`KONSOLIDIEREN`: no further P1 case is approved for consolidation. The state
and valid-role cases are already parameterized; their individual assertions
remain visible in the test output and MC matrix. `AUSSONDERN`: none.

## Source-of-truth boundary

The composer accepts the established source contracts only:
`ProjectControllingResult`-derived rows/completeness/freshness,
`MyCustomerSummary`, AVKK `ManagementSummary`, and
`WorkPackageWorkViewRow`. It sanitizes the state boundary and projects
source values; it does not fetch providers, aggregate new KPIs, calculate a
score, or correlate names/labels/fuzzy values. The only join uses the
canonical `(systemhouseId, customerId, projectSourceId, workPackageSourceId)`
bridge.

## AQGS and acceptance boundary

## Container execution evidence

The complete operational evidence, exact identities, executed contracts and
explicitly not-run gates are recorded in
`BSF-07-P1-TECHNICAL-TEST-REPORT.md`.

The local clean-candidate snapshot `383a7881` (tree `0e75a78c`) was created
only for provisional Docker evidence. Docker client/server preflight and the
three runner-contract cases passed in the project image. The full P1 runner
reached `GATE=install` and then timed out while `bun install --frozen-lockfile`
produced no progress output; its diagnostic exec timed out as well. Therefore
all gates after installation are `NOT RUN`, the candidate is not accepted, and
this evidence does not replace a signed exact-head run.

The runner contract was then extended and re-run in the project image. All
four cases passed, including the bounded Bun network-concurrency requirement.
This proves the entrypoint change only; it does not change the full-suite
`NOT RUN` status above.

The later observable rerun used clean candidate `7586d5df` (tree `faa52d47`)
and again reached only installation. Sustained CPU and write-I/O activity
proved it was working, but it exceeded the defined 30-minute budget. Its
status is `BLOCKED/TIMEOUT`; all subsequent quality gates remain `NOT RUN`.

This is design- and test-level evidence. The technical report must not claim
runtime, release, CI, or security PASS until a signed exact-head candidate has
passed the required local gates and GitHub CI/Security. Consequently this file
does not by itself authorize a merge, deployment, or P2 implementation.

### Local verification record (2026-10-19)

- The focused composer and applicable source-contract suites passed: 77 tests
  and 178 assertions.
- The local static security scan checked 617 files and passed with 0
  `CRITICAL`, 0 `HIGH`, and 0 `MEDIUM` findings.
- The OneDrive checkout initially created only placeholder/reparse
  `node_modules` directories without package files or binaries. A lockfile-
  exact Bun 1.4.2 installation supplied 692 packages but ended with
  `failed to enqueue lifecycle scripts ... ENOENT` for `msw` and `workerd`,
  and consequently did not create `.bin` shims.
- `AQGS-ENV-01` / ADR-0037 now require file-system intensive toolchain work in
  a commit-matched local `C:\tmp` environment. A temporary cache-backed
  environment proves the P1-focused type and format gates, but does not yet
  provide a healthy full dependency graph for all standard runners.
- `docs:check` now passes after the Windows-safe `fileURLToPath` conversion
  in `scripts/check-docs-sync.mjs`; it found 104 CHANGELOG entries and checked
  27 components.
- `project-status:check` passes in an isolated copy of the same source tree
  after hydrating the lockfile-resolved `yaml@2.9.0` and `ajv@8.20.0` runtime
  packages from the local Bun cache: schema `1.3.0`, dashboard `1.68.0`,
  sprint `BSF-07`, and 19 roadmap entries. The checker also uses the
  Windows-safe `fileURLToPath` conversion.
- A focused TypeScript check for the two P1 composer files passes in a
  temporary copy that resolves the lockfile packages from the local Bun
  cache. A direct Prettier check of those same two files also passes.
- A focused ESLint run using the corresponding cache-resolved configuration
  did not finish within 120 seconds and was terminated by the command timeout.
  It therefore remains **not PASS evidence**; this is recorded as a toolchain
  blocker rather than treated as a clean lint result.
- A subsequent full TypeScript run was executable and reported 493 global
  errors outside the P1 composer boundary; the focused P1 check remains green.
  Full ESLint stops in the cache graph with an incompatible `ajv` resolution,
  and the full Vitest runner cannot resolve `@vitest/utils`. Neither result is
  a PASS and neither is waived by the focused P1 evidence.
- Upgrading Bun to `1.4.3` reproduces the same `msw`/`workerd` lifecycle
  enqueue failure. A temporary npm fallback makes the standard binaries
  executable but is not lockfile-identical and therefore cannot be used as
  release evidence: its full typecheck remains globally red and ESLint reports
  39 pre-existing/global errors (including formatter drift caused by the
  alternative dependency resolution). No P1 code was changed to accommodate
  that fallback.

These are environment and tooling observations, not waivers. They leave the
candidate `PARTIAL` until the normal gates can be run successfully.

## Acceptance rule

P1 may be marked PASS only when all MC01–MC35 evidence above is reproducible,
the focused and applicable source-contract regressions plus type/lint/format
and documentation gates are green, and a signed exact-head draft PR supplies
CI and Security evidence. Missing evidence is `PARTIAL` or `BLOCKED`, never
PASS.
