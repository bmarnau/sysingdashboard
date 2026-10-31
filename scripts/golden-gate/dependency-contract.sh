#!/usr/bin/env bash

dependency_manifest_path() {
  printf '%s/manifest.env' "${GG_DEPENDENCY_CACHE_DIR:?GG_DEPENDENCY_CACHE_DIR is required}"
}

dependency_contract() {
  local workspace="$1"
  test -n "${GG_IMAGE_DIGEST:-}" || return 2
  test -f "$workspace/bun.lock" || return 3
  printf 'image_digest=%s\n' "$GG_IMAGE_DIGEST"
  printf 'bun_version=%s\n' "$(bun --version)"
  printf 'platform=%s/%s\n' "$(uname -s | tr '[:upper:]' '[:lower:]')" "$(uname -m)"
  printf 'lock_hash=%s\n' "$(sha256sum "$workspace/bun.lock" | awk '{print $1}')"
}

write_dependency_manifest() {
  local workspace="$1"
  local cache_dir="${GG_DEPENDENCY_CACHE_DIR:?GG_DEPENDENCY_CACHE_DIR is required}"
  local manifest
  manifest="$(dependency_manifest_path)"
  mkdir -p "$cache_dir"
  umask 077
  dependency_contract "$workspace" >"$manifest.tmp"
  mv "$manifest.tmp" "$manifest"
}

verify_dependency_manifest() {
  local workspace="$1"
  local manifest
  manifest="$(dependency_manifest_path)"
  if [[ ! -f "$manifest" ]]; then
    printf '%s\n' dependency_manifest_missing
    return 1
  fi
  if ! dependency_contract "$workspace" | cmp -s - "$manifest"; then
    printf '%s\n' dependency_contract_mismatch
    return 1
  fi
}
