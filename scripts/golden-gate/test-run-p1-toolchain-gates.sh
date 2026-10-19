#!/usr/bin/env bash
set -euo pipefail

runner="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/run-p1-toolchain-gates.sh"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

expect_failure() {
  local name="$1"
  shift
  if "$@" >"$tmp_dir/$name.log" 2>&1; then
    echo "FAIL: $name unexpectedly passed" >&2
    cat "$tmp_dir/$name.log" >&2
    exit 1
  fi
  echo "PASS: $name"
}

rejects_missing_lockfile() {
  local fixture="$tmp_dir/missing-lockfile"
  mkdir -p "$fixture"
  git -C "$fixture" init -q
  git -C "$fixture" config user.email gate@example.invalid
  git -C "$fixture" config user.name gate
  touch "$fixture/README"
  git -C "$fixture" add README
  git -C "$fixture" commit -qm fixture
  expect_failure rejects_missing_lockfile env GG_WORKSPACE="$fixture" "$runner"
  grep -q 'bun.lock' "$tmp_dir/rejects_missing_lockfile.log"
}

rejects_dirty_worktree() {
  local fixture="$tmp_dir/dirty-worktree"
  mkdir -p "$fixture"
  git -C "$fixture" init -q
  git -C "$fixture" config user.email gate@example.invalid
  git -C "$fixture" config user.name gate
  touch "$fixture/bun.lock"
  git -C "$fixture" add bun.lock
  git -C "$fixture" commit -qm fixture
  touch "$fixture/dirty"
  expect_failure rejects_dirty_worktree env GG_WORKSPACE="$fixture" "$runner"
  grep -q 'dirty worktree' "$tmp_dir/rejects_dirty_worktree.log"
}

rejects_missing_lockfile
rejects_dirty_worktree
echo 'PASS: run-p1-toolchain-gates contract'
