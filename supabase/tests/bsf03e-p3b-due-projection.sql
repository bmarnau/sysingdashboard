-- BSF-03E P3b-0 - Due Projection DB Contract (DUE-01 to DUE-05)
-- Transaktional, fail-fast und ausschliesslich mit synthetischen Daten.

\set ON_ERROR_STOP on

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.assert(cond boolean, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL %', label;
  END IF;
  RAISE NOTICE 'PASS %', label;
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.assert_denied(stmt text, expected_sqlstate text, label text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  got_sqlstate text;
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS got_sqlstate = RETURNED_SQLSTATE;
    IF got_sqlstate = expected_sqlstate THEN
      RAISE NOTICE 'PASS % (denied %)', label, got_sqlstate;
      RETURN;
    END IF;
    RAISE EXCEPTION 'FAIL % (expected SQLSTATE %, got %)', label, expected_sqlstate, got_sqlstate;
  END;
  RAISE EXCEPTION 'FAIL % (call unexpectedly succeeded)', label;
END; $$;

-- DUE-01: additive Schema-Semantik.
SELECT pg_temp.assert((
  SELECT data_type = 'date' AND is_nullable = 'YES'
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'shared_work_package_projection'
    AND column_name = 'due'
), 'DUE-01 due exists as nullable date');

-- Der erste auth.users-Datensatz ist bei einem Clean Reset der Last-Sysadmin.
INSERT INTO auth.users (
  id, email, aud, role, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-00000000f3b0',
  'bsf03e-p3b-guard-sysadmin@example.invalid',
  'authenticated', 'authenticated', now(), now(), '{}'::jsonb, '{}'::jsonb
);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-00000000d3b0',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'bsf03e-p3b-writer@example.invalid', 'x',
  now(), now(), now(), '{}'::jsonb, '{}'::jsonb
);

DELETE FROM public.user_roles WHERE user_id = '00000000-0000-0000-0000-00000000d3b0';
INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-00000000d3b0', 'teamlead');
UPDATE public.profiles SET status = 'active' WHERE id = '00000000-0000-0000-0000-00000000d3b0';

INSERT INTO public.systemhouse (id, name, status)
VALUES ('00000000-0000-0000-0000-0000000ad3b0', 'BSF03E P3b SH', 'active');
INSERT INTO public.customer (id, systemhouse_id, name, status)
VALUES (
  '00000000-0000-0000-0000-0000000bd3b0',
  '00000000-0000-0000-0000-0000000ad3b0',
  'BSF03E P3b Customer', 'active'
);
INSERT INTO public.systemhouse_membership (systemhouse_id, user_id, status)
VALUES (
  '00000000-0000-0000-0000-0000000ad3b0',
  '00000000-0000-0000-0000-00000000d3b0', 'active'
);
INSERT INTO public.customer_access (systemhouse_id, customer_id, user_id, access_level, status)
VALUES (
  '00000000-0000-0000-0000-0000000ad3b0',
  '00000000-0000-0000-0000-0000000bd3b0',
  '00000000-0000-0000-0000-00000000d3b0', 'write', 'active'
);

CREATE OR REPLACE FUNCTION pg_temp.act_as(uid uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', uid::text, 'role', 'authenticated')::text,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.act_reset()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', NULL, true);
END; $$;

SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000d3b0');

-- DUE-02: ein valides Datum wird als DATE exakt persistiert.
SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ad3b0',
  '00000000-0000-0000-0000-0000000bd3b0',
  'structure', true, '[]'::jsonb,
  '[{"source_id":"DUE-02","parent_link_status":"none","title":"Due date","legacy_client":"P3b","status":"open","priority":"normal","due":"2026-10-15","source_hash":"due-02-a"}]'::jsonb,
  '[]'::jsonb, '{}'::text[], ARRAY['DUE-02'], '{}'::text[]
);
SELECT pg_temp.assert((
  SELECT due = DATE '2026-10-15'
  FROM public.shared_work_package_projection
  WHERE source_id = 'DUE-02'
), 'DUE-02 valid due persists exactly');

-- DUE-03: eine Legacy-Payload ohne due leitet kein Datum ab.
SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ad3b0',
  '00000000-0000-0000-0000-0000000bd3b0',
  'structure', true, '[]'::jsonb,
  '[{"source_id":"DUE-03","parent_link_status":"none","title":"No due","legacy_client":"P3b","status":"open","priority":"normal","source_hash":"due-03-a"}]'::jsonb,
  '[]'::jsonb, '{}'::text[], ARRAY['DUE-03'], '{}'::text[]
);
SELECT pg_temp.assert((
  SELECT due IS NULL
  FROM public.shared_work_package_projection
  WHERE source_id = 'DUE-03'
), 'DUE-03 absent due remains null');

-- DUE-04: nur due und der daraus abgeleitete Hash ändern die Revision.
SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ad3b0',
  '00000000-0000-0000-0000-0000000bd3b0',
  'structure', true, '[]'::jsonb,
  '[{"source_id":"DUE-04","parent_link_status":"none","title":"Revision","legacy_client":"P3b","status":"open","priority":"normal","due":"2026-10-15","source_hash":"due-04-a"}]'::jsonb,
  '[]'::jsonb, '{}'::text[], ARRAY['DUE-04'], '{}'::text[]
);
CREATE TEMP TABLE pg_temp.due_before AS
SELECT source_revision, source_hash
FROM public.shared_work_package_projection
WHERE source_id = 'DUE-04';
SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ad3b0',
  '00000000-0000-0000-0000-0000000bd3b0',
  'structure', true, '[]'::jsonb,
  '[{"source_id":"DUE-04","parent_link_status":"none","title":"Revision","legacy_client":"P3b","status":"open","priority":"normal","due":"2026-10-16","source_hash":"due-04-b"}]'::jsonb,
  '[]'::jsonb, '{}'::text[], ARRAY['DUE-04'], '{}'::text[]
);
SELECT pg_temp.assert((
  SELECT current.source_revision = before.source_revision + 1
     AND current.source_hash IS DISTINCT FROM before.source_hash
     AND current.due = DATE '2026-10-16'
  FROM public.shared_work_package_projection AS current
  CROSS JOIN pg_temp.due_before AS before
  WHERE current.source_id = 'DUE-04'
), 'DUE-04 due-only change increments revision and changes hash');

-- DUE-05: ein ungueltiges due rollt auch vorherige Updates/Insertions desselben Calls zurueck.
SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ad3b0',
  '00000000-0000-0000-0000-0000000bd3b0',
  'structure', true, '[]'::jsonb,
  '[{"source_id":"DUE-05-EXISTING","parent_link_status":"none","title":"Existing","legacy_client":"P3b","status":"open","priority":"normal","due":"2026-10-10","source_hash":"due-05-before"}]'::jsonb,
  '[]'::jsonb, '{}'::text[], ARRAY['DUE-05-EXISTING'], '{}'::text[]
);
SELECT pg_temp.assert_denied(
  $$SELECT public.bsf02c_publish_shared_projection_snapshot(
      '00000000-0000-0000-0000-0000000ad3b0',
      '00000000-0000-0000-0000-0000000bd3b0',
      'structure', true, '[]'::jsonb,
      '[
        {"source_id":"DUE-05-EXISTING","parent_link_status":"none","title":"Existing","legacy_client":"P3b","status":"open","priority":"normal","due":"2026-10-20","source_hash":"due-05-after"},
        {"source_id":"DUE-05-NEW","parent_link_status":"none","title":"New","legacy_client":"P3b","status":"open","priority":"normal","due":"2026-11-01","source_hash":"due-05-new"},
        {"source_id":"DUE-05-INVALID","parent_link_status":"none","title":"Invalid","legacy_client":"P3b","status":"open","priority":"normal","due":"not-a-date","source_hash":"due-05-invalid"}
      ]'::jsonb,
      '[]'::jsonb, '{}'::text[], ARRAY['DUE-05-EXISTING','DUE-05-NEW','DUE-05-INVALID'], '{}'::text[]
    )$$,
  '22007', 'DUE-05 invalid due rejects the complete publish');
SELECT pg_temp.assert((
  SELECT due = DATE '2026-10-10'
     AND source_revision = 1
     AND source_hash = 'due-05-before'
  FROM public.shared_work_package_projection
  WHERE source_id = 'DUE-05-EXISTING'
), 'DUE-05 existing row remains unchanged');
SELECT pg_temp.assert(NOT EXISTS (
  SELECT 1 FROM public.shared_work_package_projection WHERE source_id = 'DUE-05-NEW'
), 'DUE-05 valid sibling was not partially persisted');

SELECT pg_temp.act_reset();
ROLLBACK;
