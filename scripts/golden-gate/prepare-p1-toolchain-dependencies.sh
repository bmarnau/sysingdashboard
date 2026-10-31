#!/usr/bin/env bash
set -euo pipefail

scripts_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$scripts_dir/dependency-contract.sh"

workspace="${GG_WORKSPACE:-$PWD}"
install_attempts="${GG_INSTALL_ATTEMPTS:-3}"
install_retry_delay_seconds="${GG_INSTALL_RETRY_DELAY_SECONDS:-5}"
heartbeat_seconds="${GG_HEARTBEAT_SECONDS:-30}"
heartbeat_pid=""

event() {
  printf 'EVENT timestamp=%s phase=%s status=%s class=%s reason=%s action=%s attempt=%s\n' \
    "$(date -u +%FT%TZ)" "$1" "$2" "$3" "$4" "$5" "${6:-0}"
}

stop_heartbeat() {
  if [[ -n "$heartbeat_pid" ]]; then
    kill "$heartbeat_pid" 2>/dev/null || true
    wait "$heartbeat_pid" 2>/dev/null || true
    heartbeat_pid=""
  fi
}

start_heartbeat() {
  local attempt="$1"
  ( while sleep "$heartbeat_seconds"; do event dependency-prepare HEARTBEAT NONE running observe-container "$attempt"; done ) &
  heartbeat_pid=$!
}

trap stop_heartbeat EXIT

fail() {
  event dependency-prepare BLOCKED CONFIGURATION "$1" correct-configuration
  exit 1
}

git config --global --add safe.directory "$workspace" || fail cannot_trust_mounted_workspace
git -C "$workspace" rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail workspace_not_git_worktree
test -f "$workspace/bun.lock" || fail bun_lock_missing
test -n "${GG_IMAGE_DIGEST:-}" || fail image_digest_missing
test -n "${GG_DEPENDENCY_CACHE_DIR:-}" || fail dependency_cache_dir_missing
if test -n "$(git -C "$workspace" status --porcelain)"; then fail dirty_worktree; fi

cd "$workspace"
for ((attempt = 1; attempt <= install_attempts; attempt += 1)); do
  event dependency-prepare START NONE started observe-output "$attempt"
  start_heartbeat "$attempt"
  if bun install --frozen-lockfile --network-concurrency 8; then
    stop_heartbeat
    write_dependency_manifest "$workspace"
    event dependency-prepare PASS NONE complete continue "$attempt"
    exit 0
  else
    exit_code=$?
  fi
  stop_heartbeat
  if (( attempt == install_attempts )); then
    event dependency-prepare BLOCKED DEPENDENCY_INSTALL "exit_$exit_code" check-network-and-resources "$attempt"
    exit "$exit_code"
  fi
  event dependency-prepare RETRY DEPENDENCY_INSTALL "exit_$exit_code" retry-install "$attempt"
  sleep "$install_retry_delay_seconds"
done
