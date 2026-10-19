#!/usr/bin/env bash
set -euo pipefail

workspace="${GG_WORKSPACE:-$PWD}"

fail() {
  echo "BLOCKED: $*" >&2
  exit 1
}

run_gate() {
  local name="$1"
  shift
  echo "GATE=$name"
  "$@"
}

git -C "$workspace" rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  || fail "workspace is not a Git worktree"
test -f "$workspace/bun.lock" || fail "bun.lock is required"

if test -n "$(git -C "$workspace" status --porcelain)"; then
  fail "dirty worktree"
fi

cd "$workspace"
echo "HEAD=$(git rev-parse HEAD)"
echo "WORKTREE=clean"
echo "BUN=$(bun --version)"
echo "NODE=$(node --version)"

run_gate install bun install --frozen-lockfile
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
