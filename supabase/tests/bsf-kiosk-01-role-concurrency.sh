#!/usr/bin/env bash
set -euo pipefail

DB_URL="${KIOSK_TEST_DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
GUARD_ID="66666666-6666-4666-8666-000000000010"
TARGET_ID="66666666-6666-4666-8666-000000000011"
T1_LOG="$(mktemp)"
T2_LOG="$(mktemp)"
trap 'rm -f "$T1_LOG" "$T2_LOG"' EXIT

psql_local() {
  psql "$DB_URL" -X -v ON_ERROR_STOP=1 "$@"
}

# Stable disposable setup. The first auth user becomes the bootstrap sysadmin;
# the target account is deliberately left without a role before the race.
psql_local >/dev/null <<SQL
INSERT INTO auth.users (
  id, email, aud, role, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
VALUES (
  '${GUARD_ID}', 'kiosk-race-guard@example.invalid',
  'authenticated', 'authenticated', now(), now(), '{}'::jsonb, '{}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (
  id, email, aud, role, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
VALUES (
  '${TARGET_ID}', 'kiosk-race-target@example.invalid',
  'authenticated', 'authenticated', now(), now(), '{}'::jsonb, '{}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

DELETE FROM public.user_roles WHERE user_id = '${TARGET_ID}'::uuid;
SQL

# T1 inserts kiosk and stays open while sleeping. T2 then attempts viewer for
# the same user. A transaction-safe exclusivity guard must serialize these
# writes so T2 observes the committed kiosk role and is rejected.
PGAPPNAME=kiosk-role-race-t1 psql "$DB_URL" -X -v ON_ERROR_STOP=1 >"$T1_LOG" 2>&1 <<SQL &
BEGIN;
INSERT INTO public.user_roles (user_id, role)
VALUES ('${TARGET_ID}'::uuid, 'kiosk'::public.app_role);
SELECT pg_sleep(3);
COMMIT;
SQL
T1_PID=$!

READY=0
for _ in $(seq 1 50); do
  WAIT_EVENT="$(psql_local -Atqc "SELECT COALESCE((SELECT wait_event FROM pg_stat_activity WHERE application_name = 'kiosk-role-race-t1' AND state = 'active' LIMIT 1), '');")"
  if [[ "$WAIT_EVENT" == "PgSleep" ]]; then
    READY=1
    break
  fi
  sleep 0.1
done

if [[ "$READY" -ne 1 ]]; then
  set +e
  wait "$T1_PID"
  set -e
  echo "FAIL T06: first transaction did not reach the controlled race window" >&2
  cat "$T1_LOG" >&2
  exit 1
fi

set +e
PGAPPNAME=kiosk-role-race-t2 psql "$DB_URL" -X -v ON_ERROR_STOP=1 >"$T2_LOG" 2>&1 <<SQL
BEGIN;
INSERT INTO public.user_roles (user_id, role)
VALUES ('${TARGET_ID}'::uuid, 'viewer'::public.app_role);
COMMIT;
SQL
T2_RC=$?
wait "$T1_PID"
T1_RC=$?
set -e

if [[ "$T1_RC" -ne 0 ]]; then
  echo "FAIL T06: kiosk transaction failed unexpectedly" >&2
  cat "$T1_LOG" >&2
  exit 1
fi

ROLE_COUNT="$(psql_local -Atqc "SELECT count(*) FROM public.user_roles WHERE user_id = '${TARGET_ID}'::uuid;")"
KIOSK_COUNT="$(psql_local -Atqc "SELECT count(*) FROM public.user_roles WHERE user_id = '${TARGET_ID}'::uuid AND role = 'kiosk'::public.app_role;")"

if [[ "$T2_RC" -eq 0 ]]; then
  echo "FAIL T06: concurrent viewer role was accepted next to kiosk (role_count=${ROLE_COUNT})" >&2
  exit 1
fi

if ! grep -q "KIOSK_ROLE_MUST_BE_EXCLUSIVE" "$T2_LOG"; then
  echo "FAIL T06: concurrent role write failed for an unexpected reason" >&2
  cat "$T2_LOG" >&2
  exit 1
fi

if [[ "$ROLE_COUNT" != "1" || "$KIOSK_COUNT" != "1" ]]; then
  echo "FAIL T06: kiosk exclusivity invariant not preserved (role_count=${ROLE_COUNT}, kiosk_count=${KIOSK_COUNT})" >&2
  exit 1
fi

echo "PASS T06: concurrent kiosk role exclusivity is transaction-safe"
