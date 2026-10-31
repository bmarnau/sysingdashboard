# BSF-07 P1 - Technical Container Test Report

- **Report date:** 2026-10-19
- **Status:** `BLOCKED/INFRASTRUCTURE_RESOURCE` - no P1 acceptance claim
- **Authoritative checkout:** `codex/gg-l2-01-management-cockpit-domain`
- **Checkout HEAD:** `3649b0980422d7805c954c394a53e732ae454bfd`
- **Local clean candidate:** `383a7881e2b701b14abf469cc5f353229735dac9`
- **Candidate Git tree:** `0e75a78cf7c56f951b0fe76e45b20ac4c9c8c9d7`
- **Container image:** `sysingdashboard-golden-gate:local`
- **Image ID:** `sha256:9e5513332b06924c7a75b6897f74e1dcb957f5647ee05ba7e3e5825b8dac53d9`
- **Docker preflight:** client/server `29.7.2` available

## Scope and boundary

This report records only local, provisional container evidence for the BSF-07
P1 composer. It does not replace a signed candidate, an Exact-Head CI run, an
Exact-Head security run, a PR, a merge, or deployment approval.

The candidate was created locally under `C:\tmp` solely to allow a clean Git
worktree for container testing. Its tree must match a later signed Exact Head
before any of this evidence can support acceptance.

## Container contract

The image contains Ubuntu, Node 22, Bun 1.4.3, Git, Curl, CA certificates and
Unzip. It runs as non-root user `vscode`. It contains neither repository
source, `node_modules`, browser binaries, Supabase, secrets nor Docker socket.
The checkout is mounted only at runtime.

The runner trusts only the mounted workspace as Git `safe.directory`. This is
required for Windows-mounted worktrees and is covered by a regression case.

## Executed evidence

| Evidence | Result | Detail |
|---|---|---|
| Docker client/server preflight | PASS | Both report version `29.7.2`. |
| Image identity probe | PASS | Expected local image and immutable image ID available. |
| npm registry reachability from image | PASS | Bounded HTTP probe returned `200`. |
| Missing-lockfile runner contract | PASS | Fails closed before installation. |
| Dirty-worktree runner contract | PASS | Fails closed before installation. |
| Windows-mount Git ownership contract | PASS | Scoped `safe.directory` reaches the intended dirty-worktree blocker. |
| Bounded Bun network-concurrency contract | PASS | Runner uses `--network-concurrency 8`. |
| Structured preflight blocker contract | PASS | Emits an `EVENT` with phase, status, class, reason and next action. |
| Installation retry-policy contract | PASS | Retry policy is explicit and bounded. |
| Diff check | PASS | `git diff --check` completed successfully. |

The runner contract suite therefore passed **6/6** cases in the Docker image.

## Full P1 container gate attempt

The clean candidate entered the full runner successfully and emitted:

```text
HEAD=383a7881e2b701b14abf469cc5f353229735dac9
WORKTREE=clean
BUN=1.4.3
NODE=v22.23.3
GATE=install
```

`bun install --frozen-lockfile` then exceeded the bounded execution window
while the PC and Docker environment were under resource pressure. A verbose,
separately bounded diagnosis proved registry access but showed many concurrent
downloads with long individual latencies. This is classified as
`BLOCKED/INFRASTRUCTURE_RESOURCE`; it is not a product-test failure.

The runner now uses `--network-concurrency 8`, a maximum of three installation
attempts, and a short configurable delay. It emits one machine-readable event
per state:

```text
EVENT timestamp=<UTC> phase=<preflight|gate> status=<START|PASS|FAIL|BLOCKED|RETRY> class=<...> reason=<...> action=<...> attempt=<n>
```

This provides immediate external status: when a step began, where it failed,
which attempt failed, its classification, and the one next action. It does not
trigger automatic extended diagnosis.

The runner contract also verified a real install heartbeat. Future long gates
emit `status=HEARTBEAT` at the configured interval. If a calling environment
buffers standard output, the operator reads only the active container status,
last logs, and one CPU/network/I/O sample to distinguish `RUNNING` from
`BLOCKED/TIMEOUT`.

## Gates not run

Because installation did not complete, the following gates are explicitly
`NOT RUN` for this candidate:

- Prettier format check
- ESLint
- Typecheck
- Documentation check
- Project-status check
- Security check
- Focused P1 composer and source-contract regression tests
- Full test suite
- Signed candidate verification
- PR, Exact-Head CI and Exact-Head security

The MC01-MC35 matrix remains design- and focused-test evidence only. It is not
P1 acceptance evidence until the complete required gate set succeeds on the
signed Exact Head.

## Recovery and continuation

1. Ensure the PC is not under sustained CPU, disk or network contention.
2. Run the mandatory Docker and bounded registry preflights from
   `PROJECT-GOVERNANCE.md`.
3. Start the container runner against a clean candidate. Communicate every
   emitted `EVENT` immediately.
4. If installation exhausts retries, report the final `BLOCKED` event and stop;
   do not claim later gates or begin unbounded investigation.
5. Once all local gates pass, create the signed candidate whose Git tree equals
   the recorded candidate tree, rerun the complete container gates, then await
   Exact-Head CI and security before preparing any draft PR.

## Decision

`P1_READY=NO`. The next authorized action is a controlled, fully observable
rerun of the complete container gate sequence after host resources have
stabilized.

## Observed rerun 2026-10-19

A second clean local candidate was prepared as `7586d5df07afc1f3bf65daabb01fd639cdd8d041`
with tree `faa52d47bd5f5cbfdec95c42124656b0d88c0bd6`. Docker client/server,
bounded registry probe, available host storage and the expanded runner
contract all passed before the full run began.

The full run reached clean preflight and `phase=install`, attempt 1. Live
container observation showed sustained CPU activity, network transfer and
increasing write I/O; later sampling showed approximately 907 percent
container CPU and 827 MB write I/O. The installation therefore worked but did
not complete within the explicit 30-minute controlled-run budget. The run is
`BLOCKED/TIMEOUT` with an infrastructure-resource classification. Prettier,
lint, typecheck, documentation, project-status, security and P1 regression
gates remain `NOT RUN`. The owned container was terminated after the budget;
it exited with code `137` and entered removal.

The observable-runner contract subsequently passed **7/7** cases, including
the actual periodic install-heartbeat fixture. Future long gates therefore
emit status without requiring an external inference from buffered output.
