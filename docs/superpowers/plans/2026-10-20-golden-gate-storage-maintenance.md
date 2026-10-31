# Golden-Gate Storage Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a safe local PowerShell CLI/TUI that inventories and reclaims only known Golden-Gate temporary storage through reversible quarantine.

**Architecture:** `storage-maintenance.ps1` owns candidate classification, path validation, quarantine manifests and CLI modes. It delegates Docker inventory to the existing project-limited cleanup script and never controls Docker/WSL lifecycle or VHDX files. Contract tests execute solely in isolated fixture roots, never against real `C:\tmp`.

**Tech Stack:** PowerShell 7-compatible scripts, Windows filesystem APIs, JSON/NDJSON, existing Docker cleanup PowerShell script.

**Spec:** `docs/superpowers/specs/2026-10-20-golden-gate-storage-maintenance-design.md`

## Global Constraints

- Default mode is read-only `Plan`; all real paths are canonicalized before action.
- Write modes accept only known `sysingdashboard-p1-candidate-*` directories below `C:\tmp` and reject reparse points.
- `Quarantine` uses `C:\tmp\.golden-gate-quarantine\<UTC>`; `Restore` never overwrites an existing original path.
- `Purge` requires age >= 14 × 24 hours and token `PURGE_GOLDEN_GATE_QUARANTINE`.
- `Quarantine` and `Restore` require their exact tokens from the approved spec.
- No global Docker prune, Docker/WSL start/stop, automatic VHDX compact, foreign-project cleanup, network service, or new dependency.
- Every write event records UTC time, mode, result, reason, source/target and free C: bytes before/after.
- The current branch contains one coherent, uncommitted P1 candidate; record task evidence immediately, but create no partial commit. The storage-maintenance files join the signed candidate only after all P1-required gates pass.

## Review Focus

- Reparse point inside `C:\tmp`: reject rather than traverse or move it (Task 1).
- Candidate path that merely shares a prefix outside `C:\tmp`: reject after canonicalization (Task 1).
- Original path recreated after quarantine: Restore blocks and leaves quarantine intact (Task 2).
- Manifest age manipulated or malformed: Purge blocks rather than deleting (Task 2).
- Docker unavailable during Plan: return a classified Docker observation while retaining Tmp inventory (Task 3).

---

### Task 1: Candidate inventory and path-safety contract

**Files:**
- Create: `scripts/golden-gate/storage-maintenance.ps1`
- Create: `scripts/golden-gate/test-storage-maintenance.ps1`

**Interfaces:**
- Produces: `Get-GoldenGateTmpCandidates([string] $TmpRoot) -> object[]`, `Test-ManagedTmpPath([string] $Path, [string] $TmpRoot) -> bool`, and `Get-StorageSnapshot([string] $DriveName) -> object`.
- Consumes: no new project interfaces.

- [ ] **Step 1: Write failing inventory/path tests**

  Add tests that create fixture directories `sysingdashboard-p1-candidate-old`, an unknown sibling and a reparse-point fixture. Assert only the known non-reparse candidate is returned, its ID is deterministic, and a prefix-matching path outside the fixture root is rejected.

- [ ] **Step 2: Run the PowerShell contract test to verify it fails**

  Run: `pwsh -File scripts/golden-gate/test-storage-maintenance.ps1`

  Expected: FAIL because `Get-GoldenGateTmpCandidates` and `Test-ManagedTmpPath` are not defined.

- [ ] **Step 3: Implement inventory and canonical path checks**

  Implement the three produced functions. `Get-GoldenGateTmpCandidates` recognizes only immediate, non-reparse directories matching `sysingdashboard-p1-candidate-*`; `Test-ManagedTmpPath` resolves the path and verifies it is below the resolved root with a path separator boundary; `Get-StorageSnapshot` returns C: free/total bytes without writing.

- [ ] **Step 4: Run Task 1 tests to verify they pass**

  Run: `pwsh -File scripts/golden-gate/test-storage-maintenance.ps1`

  Expected: PASS for known candidate inclusion, unknown exclusion, reparse exclusion and prefix/path-traversal rejection.

- [ ] **Step 5: Record the Task 1 evidence**

  Record the exact passing test command and changed files in the technical
  report worklog. Do not create a partial commit; Task 4's evidence and the
  existing P1 changes remain part of one future signed candidate.

### Task 2: Quarantine, restore and delayed purge

**Files:**
- Modify: `scripts/golden-gate/storage-maintenance.ps1`
- Modify: `scripts/golden-gate/test-storage-maintenance.ps1`

**Interfaces:**
- Consumes: `Get-GoldenGateTmpCandidates`, `Test-ManagedTmpPath`, `Get-StorageSnapshot` from Task 1.
- Produces: `Invoke-QuarantineCandidate`, `Invoke-RestoreCandidate`, `Invoke-PurgeQuarantineCandidate`; each returns an event object with `Status`, `Reason`, `SourcePath`, `TargetPath`, `FreeBytesBefore`, `FreeBytesAfter`.

- [ ] **Step 1: Write failing lifecycle tests**

  Add isolated-root tests that require the exact quarantine token, move a known candidate while retaining a JSON manifest and NDJSON event, restore it to its original path, block restore when the original path exists, block purge before 14 days or with malformed manifest, and purge an artificially aged fixture only with `PURGE_GOLDEN_GATE_QUARANTINE`.

- [ ] **Step 2: Run the contract test to verify it fails**

  Run: `pwsh -File scripts/golden-gate/test-storage-maintenance.ps1`

  Expected: FAIL because the lifecycle functions do not exist.

- [ ] **Step 3: Implement lifecycle operations**

  Use `Move-Item -LiteralPath` only after managed-path validation. Write `manifest.json` before moving, append NDJSON event records after each result, retain the original manifest on blocked operations, and calculate age from `quarantinedAtUtc`. Never call recursive delete outside a validated quarantine entry.

- [ ] **Step 4: Run Task 2 tests to verify they pass**

  Run: `pwsh -File scripts/golden-gate/test-storage-maintenance.ps1`

  Expected: PASS for token, quarantine, restore, existing-destination, age, malformed-manifest and purge cases.

- [ ] **Step 5: Record the Task 2 evidence**

  Record the exact lifecycle test result in the technical report worklog and
  retain all files for the single future signed candidate commit.

### Task 3: CLI/TUI, Docker observation and operational evidence

**Files:**
- Modify: `scripts/golden-gate/storage-maintenance.ps1`
- Modify: `scripts/golden-gate/test-storage-maintenance.ps1`
- Modify: `docs/PROJECT-GOVERNANCE.md`
- Modify: `docs/ADR/0040-sichere-lokale-speicherwartung.md`

**Interfaces:**
- Consumes: lifecycle functions from Task 2 and `clean-docker-toolchain.ps1` in Plan mode only.
- Produces: `Invoke-StorageMaintenance([ValidateSet('Plan','Quarantine','Restore','Purge')] $Mode, [ValidateSet('Docker','Tmp','All')] $Scope, ...)` and `Show-StorageMaintenanceMenu()`.

- [ ] **Step 1: Write failing CLI/delegation tests**

  Add tests that assert default `Plan` changes no fixture, an unavailable injected Docker plan reports `BLOCKED/INFRASTRUCTURE_DOCKER` while Tmp observations remain available, and interactive mode maps an explicit menu choice only to the same token-protected operation.

- [ ] **Step 2: Run the contract test to verify it fails**

  Run: `pwsh -File scripts/golden-gate/test-storage-maintenance.ps1`

  Expected: FAIL because `Invoke-StorageMaintenance` and `Show-StorageMaintenanceMenu` are not defined.

- [ ] **Step 3: Implement modes, menu and bounded Docker delegation**

  Default `Mode` to `Plan`; call the existing cleanup script without `-Apply` only when Docker scope is requested. Catch Docker access failures as a classified observation and continue Tmp reporting. The menu may call only the exact same public CLI functions and must request the same tokens.

- [ ] **Step 4: Execute the isolated end-to-end test plan**

  Run: `pwsh -File scripts/golden-gate/test-storage-maintenance.ps1`; then run `pwsh -File scripts/golden-gate/storage-maintenance.ps1 -Mode Plan -Scope All` against the real machine.

  Expected: Fixture suite PASS; real execution is observation-only and reports C: free bytes, Docker result, VHDX metadata and no deletion.

- [ ] **Step 5: Document and record**

  Add exact commands, token semantics, quarantine retention and the real Plan evidence to governance/ADR. Then:

  Record the resulting checks and changed files. Do not create a partial
  commit; the files remain part of the future signed P1 candidate.

### Task 4: Controlled cleanup test run

**Files:**
- Modify: `docs/BSF-07-P1-TECHNICAL-TEST-REPORT.md`

**Interfaces:**
- Consumes: CLI/TUI from Task 3 and its emitted event objects.
- Produces: reproducible test evidence, not a product release gate.

- [ ] **Step 1: Create only explicit test fixtures**

  Create a `sysingdashboard-p1-candidate-storage-test-*` fixture under `C:\tmp` and a foreign sibling fixture. Record C: free bytes before the test. Do not use any real candidate or Docker production artifact.

- [ ] **Step 2: Verify Plan and Quarantine behavior**

  Run Plan, then Quarantine the explicit test fixture with its exact token. Assert the foreign sibling remains untouched and the manifest/event exists.

- [ ] **Step 3: Verify Restore and delayed Purge protections**

  Restore the fixture; repeat quarantine in an isolated fixture and verify Purge is blocked while younger than 14 days. Use only a deliberately aged test manifest to verify the token-protected Purge path.

- [ ] **Step 4: Record evidence and cleanup only the test fixture**

  Record commands, events and free-space values before/after in the technical report. Remove only the deliberately aged test fixture through the tested Purge operation. Do not run Docker Apply or VHDX maintenance.

- [ ] **Step 5: Retain evidence for the signed candidate**

  Keep the report and all implementation files in the P1 candidate. A signed
  commit is considered only after the complete local and Exact-Head P1 gate
  policy is satisfied.
