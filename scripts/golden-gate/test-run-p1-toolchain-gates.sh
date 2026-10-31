#!/usr/bin/env bash
set -euo pipefail

scripts_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
runner="$scripts_dir/run-p1-toolchain-gates.sh"
prepare="$scripts_dir/prepare-p1-toolchain-dependencies.sh"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
export HOME="$tmp_dir/home"
mkdir -p "$HOME"

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

permits_container_mount_worktree() {
  local fixture="$tmp_dir/container-mount-worktree"
  local home_dir="$tmp_dir/container-mount-home"
  mkdir -p "$fixture" "$home_dir"
  git -C "$fixture" init -q
  git -C "$fixture" config user.email gate@example.invalid
  git -C "$fixture" config user.name gate
  touch "$fixture/bun.lock"
  git -C "$fixture" add bun.lock
  git -C "$fixture" commit -qm fixture
  touch "$fixture/dirty"
  expect_failure permits_container_mount_worktree \
    env GIT_TEST_ASSUME_DIFFERENT_OWNER=1 HOME="$home_dir" GG_WORKSPACE="$fixture" "$runner"
  grep -q 'dirty worktree' "$tmp_dir/permits_container_mount_worktree.log"
}

uses_bounded_network_concurrency() {
  grep -q 'bun install --frozen-lockfile --network-concurrency 8' "$prepare"
  if grep -q 'bun install --frozen-lockfile' "$runner"; then
    echo 'FAIL: runner must not install dependencies during a Golden-Gate run' >&2
    exit 1
  fi
  echo 'PASS: uses_bounded_network_concurrency'
}

requires_dependency_manifest() {
  local fixture="$tmp_dir/missing-dependency-manifest"
  local bin_dir="$tmp_dir/missing-dependency-manifest-bin"
  mkdir -p "$fixture" "$bin_dir"
  git -C "$fixture" init -q
  git -C "$fixture" config user.email gate@example.invalid
  git -C "$fixture" config user.name gate
  touch "$fixture/bun.lock"
  git -C "$fixture" add bun.lock
  git -C "$fixture" commit -qm fixture
  cat >"$bin_dir/bun" <<'EOF'
#!/usr/bin/env bash
if [[ "${1:-}" == "--version" ]]; then echo test-bun; exit 0; fi
exit 1
EOF
  chmod +x "$bin_dir/bun"
  expect_failure requires_dependency_manifest \
    env PATH="$bin_dir:$PATH" GG_IMAGE_DIGEST='sha256:test' GG_DEPENDENCY_CACHE_DIR="$tmp_dir/cache-missing" GG_WORKSPACE="$fixture" "$runner"
  grep -q 'reason=dependency_manifest_missing' "$tmp_dir/requires_dependency_manifest.log"
}

rejects_mismatched_dependency_manifest() {
  local fixture="$tmp_dir/mismatched-dependency-manifest"
  local bin_dir="$tmp_dir/mismatched-dependency-manifest-bin"
  local cache_dir="$tmp_dir/mismatched-dependency-manifest-cache"
  mkdir -p "$fixture" "$bin_dir" "$cache_dir"
  git -C "$fixture" init -q
  git -C "$fixture" config user.email gate@example.invalid
  git -C "$fixture" config user.name gate
  printf 'lock-content' >"$fixture/bun.lock"
  git -C "$fixture" add bun.lock
  git -C "$fixture" commit -qm fixture
  cat >"$bin_dir/bun" <<'EOF'
#!/usr/bin/env bash
if [[ "${1:-}" == "--version" ]]; then echo test-bun; exit 0; fi
exit 1
EOF
  chmod +x "$bin_dir/bun"
  cat >"$cache_dir/manifest.env" <<'EOF'
image_digest=sha256:test
bun_version=test-bun
platform=wrong-platform
lock_hash=wrong-hash
EOF
  expect_failure rejects_mismatched_dependency_manifest \
    env PATH="$bin_dir:$PATH" GG_IMAGE_DIGEST='sha256:test' GG_DEPENDENCY_CACHE_DIR="$cache_dir" GG_WORKSPACE="$fixture" "$runner"
  grep -q 'reason=dependency_contract_mismatch' "$tmp_dir/rejects_mismatched_dependency_manifest.log"
}

reports_preflight_blocker() {
  local fixture="$tmp_dir/status-missing-lockfile"
  mkdir -p "$fixture"
  git -C "$fixture" init -q
  git -C "$fixture" config user.email gate@example.invalid
  git -C "$fixture" config user.name gate
  touch "$fixture/README"
  git -C "$fixture" add README
  git -C "$fixture" commit -qm fixture
  expect_failure reports_preflight_blocker env GG_WORKSPACE="$fixture" "$runner"
  grep -q 'EVENT .*phase=preflight .*status=BLOCKED .*class=CONFIGURATION .*reason=bun_lock_missing' "$tmp_dir/reports_preflight_blocker.log"
}

reports_install_retry_policy() {
  grep -q 'GG_INSTALL_ATTEMPTS' "$prepare"
  grep -q 'dependency-prepare RETRY' "$prepare"
  echo 'PASS: reports_install_retry_policy'
}

reports_install_heartbeat() {
  local fixture="$tmp_dir/heartbeat-worktree"
  local bin_dir="$tmp_dir/heartbeat-bin"
  mkdir -p "$fixture" "$bin_dir"
  git -C "$fixture" init -q
  git -C "$fixture" config user.email gate@example.invalid
  git -C "$fixture" config user.name gate
  touch "$fixture/bun.lock"
  git -C "$fixture" add bun.lock
  git -C "$fixture" commit -qm fixture
  cat >"$bin_dir/bun" <<'EOF'
#!/usr/bin/env bash
if [[ "${1:-}" == "--version" ]]; then
  echo 'test-bun'
  exit 0
fi
sleep 2
exit 1
EOF
  chmod +x "$bin_dir/bun"
  expect_failure reports_install_heartbeat \
    env PATH="$bin_dir:$PATH" GG_HEARTBEAT_SECONDS=1 GG_INSTALL_ATTEMPTS=1 GG_IMAGE_DIGEST='sha256:test' GG_DEPENDENCY_CACHE_DIR="$tmp_dir/heartbeat-cache" GG_WORKSPACE="$fixture" "$prepare"
  grep -q 'phase=dependency-prepare status=HEARTBEAT' "$tmp_dir/reports_install_heartbeat.log"
}

rejects_missing_lockfile
rejects_dirty_worktree
permits_container_mount_worktree
uses_bounded_network_concurrency
requires_dependency_manifest
rejects_mismatched_dependency_manifest
reports_preflight_blocker
reports_install_retry_policy
reports_install_heartbeat
echo 'PASS: run-p1-toolchain-gates contract'
