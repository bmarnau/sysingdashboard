# Golden-Gate Toolchain Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a versioned, local Linux toolchain that runs the BSF-07-P1 Golden-Gate checks from `bun.lock` without modifying product behavior.

**Architecture:** A minimal dev-container image supplies pinned operating-system, Node, and Bun tooling. A single shell entrypoint mounts the checkout, installs from `bun.lock`, records immutable execution context, and runs the P1 static and contract gates in order. ADR-0039 and AQGS-ENV-01 make this an approved local evidence path; CI migration stays out of scope.

**Tech Stack:** Docker/Dev Container, Ubuntu, Node 22, pinned Bun, POSIX shell, existing Bun scripts.

**Spec:** `docs/superpowers/specs/2026-10-19-golden-gate-toolchain-image-design.md`

## Global Constraints

- Git and `bun.lock` remain Source-of-Truth; use `bun install --frozen-lockfile`.
- The image contains no workspace source, `node_modules`, browser binaries, Supabase, secrets, or Docker socket.
- Run container gates as a non-root user and do not alter product data, Supabase schema, RBAC/RLS, Auth, UI, or deployment.
- The P1 gate must report Bun version, Git HEAD, worktree state, gate name, and actual exit status.
- Local PASS never replaces a signed candidate, Exact-Head CI, or Exact-Head Security.
- Do not modify CI workflows or shared project templates in this plan; evaluate both only after the pilot.

## Review Focus

- Missing `bun.lock` or a dirty worktree must stop before dependency installation; Task 3 adds preflight assertions.
- A failing intermediate gate must stop the run and identify that gate; Task 3 adds an intentional failing-command harness assertion.
- The image must not accidentally include checkout content or secrets; Task 2 inspects image filesystem and build context.
- The gate must use the project mount rather than a copied image source; Task 3 asserts `git rev-parse --show-toplevel` resolves to `/workspace`.
- Host-specific cache mounts must not become evidence; Task 4 runs once without a pre-populated dependency cache.

---

### Task 1: Decision and governance boundary

**Files:**
- Create: `docs/ADR/0039-kanonisches-golden-gate-toolchain-image.md`
- Modify: `docs/ADR/README.md`
- Modify: `docs/PROJECT-GOVERNANCE.md`
- Test: `node scripts/check-docs-sync.mjs`

**Interfaces:**
- Consumes: ADR-0037, ADR-0038, AQGS-ENV-01, and the approved design.
- Produces: ADR-0039 and an AQGS rule that makes the container a local evidence path, not a release substitute.

- [ ] **Step 1: Add ADR-0039 as an Accepted decision**

State that the project-owned Dockerfile and gate entrypoint are the canonical local Golden-Gate toolchain fallback; pin Node 22 and Bun; exclude secrets, source code, `node_modules`, browsers, Supabase, and Docker socket; defer CI/template migration until pilot evidence.

- [ ] **Step 2: Register ADR-0039 and extend AQGS-ENV-01**

Add the ADR index row and require the container preflight to record Git SHA/worktree state and to run `bun install --frozen-lockfile`; state that a local container PASS is necessary but insufficient for P1 release evidence.

- [ ] **Step 3: Verify documentation gates**

Run: `node scripts/check-docs-sync.mjs && git diff --check`

Expected: documentation check succeeds and the diff has no whitespace errors.

- [ ] **Step 4: Commit governance decision**

```bash
git add docs/ADR/0039-kanonisches-golden-gate-toolchain-image.md docs/ADR/README.md docs/PROJECT-GOVERNANCE.md
git commit -S -m "docs: define golden gate toolchain image"
```

### Task 2: Minimal dev-container image

**Files:**
- Create: `.devcontainer/Dockerfile`
- Create: `.devcontainer/devcontainer.json`
- Create: `.devcontainer/Dockerfile.dockerignore`
- Test: Docker build and image inspection commands

**Interfaces:**
- Consumes: ADR-0039's pinned tool-version policy.
- Produces: image tag `sysingdashboard-golden-gate:local` with `bun`, `node`, `git`, `curl`, `unzip`, and a non-root `vscode` user.

- [ ] **Step 1: Write the failing image-contract probe**

Create a temporary command that expects `docker run --rm sysingdashboard-golden-gate:local bash -lc 'id -u; bun --version; node --version; git --version; unzip -v'` to succeed and expects `/workspace/node_modules` to be absent before mounting a checkout.

- [ ] **Step 2: Run the probe before the image exists**

Run: `docker image inspect sysingdashboard-golden-gate:local`

Expected: fails because the image does not yet exist.

- [ ] **Step 3: Create the Dockerfile, Dev Container descriptor, and narrow build context**

Base on an Ubuntu dev-container image; install only Curl, CA certificates, Git, and Unzip; install Node 22 and the explicitly pinned Bun version; switch to the non-root user. The Dockerfile must not `COPY` the repository. `.dockerignore` excludes `.git`, `node_modules`, `.env*`, reports, coverage, and build output.

- [ ] **Step 4: Build and run the image-contract probe**

Run: `docker build --check -f .devcontainer/Dockerfile . && docker build -t sysingdashboard-golden-gate:local -f .devcontainer/Dockerfile . && docker run --rm sysingdashboard-golden-gate:local bash -lc 'test "$(id -u)" -ne 0 && bun --version && node --version && git --version && unzip -v >/dev/null && test ! -e /workspace/node_modules'`

Expected: all commands pass and report the pinned Bun and Node 22 versions.

- [ ] **Step 5: Commit image definition**

```bash
git add .devcontainer/Dockerfile .devcontainer/devcontainer.json .devcontainer/Dockerfile.dockerignore
git commit -S -m "build: add golden gate dev container"
```

### Task 3: P1 gate entrypoint and failure semantics

**Files:**
- Create: `scripts/golden-gate/run-p1-toolchain-gates.sh`
- Create: `scripts/golden-gate/test-run-p1-toolchain-gates.sh`
- Test: `scripts/golden-gate/test-run-p1-toolchain-gates.sh`

**Interfaces:**
- Consumes: `/workspace` checkout, image-provided Bun/Node/Git, and existing package scripts.
- Produces: executable `run-p1-toolchain-gates.sh` with no arguments; exit `0` only when every named P1 gate passes.

- [ ] **Step 1: Write the failing shell-contract tests**

Implement a POSIX test harness with temporary fixture repositories that verifies: missing `bun.lock` exits non-zero before install; a dirty worktree exits non-zero; an injected failure stops at its named gate; a clean fixture records `HEAD`, worktree state, and Bun version. Name tests `rejects_missing_lockfile`, `rejects_dirty_worktree`, `stops_at_named_failing_gate`, and `records_execution_context`.

- [ ] **Step 2: Run the harness before the runner exists**

Run: `bash scripts/golden-gate/test-run-p1-toolchain-gates.sh`

Expected: fails because `run-p1-toolchain-gates.sh` is missing.

- [ ] **Step 3: Implement the entrypoint**

Use `set -euo pipefail`; require a Git worktree and `bun.lock`; print `HEAD`, concise worktree status, Bun and Node versions; execute `bun install --frozen-lockfile`; then run Prettier check, lint, typecheck, docs check, project-status check, security check, and the five P1/source-contract test files. Implement a `run_gate <name> <command...>` helper that prints `GATE=<name>` before command execution.

- [ ] **Step 4: Run shell-contract tests and focused container gate**

Run: `bash scripts/golden-gate/test-run-p1-toolchain-gates.sh && docker run --rm -v "${PWD}:/workspace" -w /workspace sysingdashboard-golden-gate:local bash scripts/golden-gate/run-p1-toolchain-gates.sh`

Expected: harness passes; container invocation reports either all actual gate results or the first real project failure without masking it.

- [ ] **Step 5: Commit runner and tests**

```bash
git add scripts/golden-gate/run-p1-toolchain-gates.sh scripts/golden-gate/test-run-p1-toolchain-gates.sh
git commit -S -m "build: add p1 toolchain gate runner"
```

### Task 4: Pilot evidence and P1 re-evaluation

**Files:**
- Modify: `docs/BSF-07-P1-MC-COVERAGE.md`
- Modify: `docs/PROJECT-GOVERNANCE.md` only if the pilot exposes an unaddressed rule gap
- Test: full container pilot, docs check, diff check

**Interfaces:**
- Consumes: Tasks 1-3 and the existing P1 evidence matrix.
- Produces: exact PASS/PARTIAL/BLOCKED evidence; no sign, PR, merge, deployment, CI migration, or template update.

- [ ] **Step 1: Run the clean container pilot**

Run: `docker run --rm -v "${PWD}:/workspace" -w /workspace sysingdashboard-golden-gate:local bash scripts/golden-gate/run-p1-toolchain-gates.sh`

Expected: fresh dependency installation; every gate emits a named result; no host `node_modules` is used as evidence.

- [ ] **Step 2: Record only observed results**

Update the P1 matrix with image tag/digest, Bun/Node versions, HEAD, gate commands, outcomes, and exact failures if any. Do not mark P1 PASS without all required local and Exact-Head evidence.

- [ ] **Step 3: Run final non-container documentation checks**

Run: `node scripts/check-docs-sync.mjs && git diff --check`

Expected: both commands pass.

- [ ] **Step 4: Commit pilot evidence only if its documentation is consistent**

```bash
git add docs/BSF-07-P1-MC-COVERAGE.md docs/PROJECT-GOVERNANCE.md
git commit -S -m "docs: record golden gate toolchain pilot"
```

## Out of Scope

- CI workflow migration or reuse of the image.
- Shared template update.
- Supabase, browser, E2E, production Docker image, deployment, or product-code changes.
- P1 signing, PR creation, merge, or release approval unless all existing P1 gates are independently green.
