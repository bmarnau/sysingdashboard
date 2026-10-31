#!/usr/bin/env bash
set -euo pipefail

scripts_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$scripts_dir/dependency-contract.sh"

workspace="${GG_WORKSPACE:-$PWD}"
heartbeat_seconds="${GG_HEARTBEAT_SECONDS:-30}"
heartbeat_pid=""

event() {
  local phase="$1"
  local status="$2"
  local classification="$3"
  local reason="$4"
  local action="$5"
  local attempt="${6:-0}"
  printf 'EVENT timestamp=%s phase=%s status=%s class=%s reason=%s action=%s attempt=%s\n' \
    "$(date -u +%FT%TZ)" "$phase" "$status" "$classification" "$reason" "$action" "$attempt"
}

start_heartbeat() {
  local phase="$1"
  local attempt="${2:-0}"
  (
    while sleep "$heartbeat_seconds"; do
      event "$phase" HEARTBEAT NONE running observe-container "$attempt"
    done
  ) &
  heartbeat_pid=$!
}

stop_heartbeat() {
  if [[ -n "$heartbeat_pid" ]]; then
    kill "$heartbeat_pid" 2>/dev/null || true
    wait "$heartbeat_pid" 2>/dev/null || true
    heartbeat_pid=""
  fi
}

trap stop_heartbeat EXIT

fail() {
  echo "BLOCKED: ${1//_/ }" >&2
  event preflight BLOCKED CONFIGURATION "$1" correct-configuration
  exit 1
}

run_gate() {
  local name="$1"
  shift
  event "$name" START NONE started observe-output
  start_heartbeat "$name"
  if "$@"; then
    stop_heartbeat
    event "$name" PASS NONE complete continue
  else
    local exit_code=$?
    stop_heartbeat
    event "$name" FAIL GATE_FAILURE "exit_$exit_code" inspect-gate-output
    return "$exit_code"
  fi
}

git config --global --add safe.directory "$workspace" \
  || fail cannot_trust_mounted_workspace
git -C "$workspace" rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  || fail workspace_not_git_worktree
test -f "$workspace/bun.lock" || fail bun_lock_missing

if test -n "$(git -C "$workspace" status --porcelain)"; then
  fail dirty_worktree
fi

cd "$workspace"
test -n "${GG_IMAGE_DIGEST:-}" || fail image_digest_missing
test -n "${GG_DEPENDENCY_CACHE_DIR:-}" || fail dependency_cache_dir_missing
if ! dependency_reason="$(verify_dependency_manifest "$workspace")"; then
  event dependency-verify BLOCKED DEPENDENCY_PROVENANCE "$dependency_reason" run-dependency-prepare
  exit 1
fi
echo "HEAD=$(git rev-parse HEAD)"
echo "WORKTREE=clean"
echo "BUN=$(bun --version)"
echo "NODE=$(node --version)"
event runner START NONE preflight_complete observe-output

run_gate format bunx prettier --check .
run_gate lint bun run lint
run_gate typecheck bun run typecheck
run_gate docs bun run docs:check
run_gate project-status bun run project-status:check
run_gate security bun run security:check
run_gate p1-contracts bun test \
  src/__tests__/lib/management-cockpit/management-cockpit-service.test.ts \
  src/__tests__/lib/my-customers.test.ts \
  src/__tests__/lib/avkk/management.test.ts \
  src/__tests__/lib/avkk/work-package-work-view.test.ts \
  src/__tests__/lib/project-controlling.test.ts

echo "GATE=complete"
