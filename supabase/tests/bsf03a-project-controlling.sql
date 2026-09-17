-- BSF-03A Tasks 1-3 — Project Controlling Permission + Kategorie-Bruecke
-- Issue #106. Transaktional, fail-fast, ausschliesslich synthetische Daten.
--
-- Vertraege:
--   T01-T08  project.controlling.view Rollenmatrix
--   T09-T10  additive Kategorie-Spalten
--   T11-T16  Legacy/null/key Semantik + Revision
--   T17-T18  Cross-Systemhouse/Cross-Customer DENY
--   T19      Funktions-Securityattribute unveraendert
--   T20      atomarer BSF-02C-Rollback + Signatur/ACL-Regression
--
-- Ausfuehrung: psql -f supabase/tests/bsf03a-project-controlling.sql

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
  got_message text;
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS got_sqlstate = RETURNED_SQLSTATE, got_message = MESSAGE_TEXT;
    IF expected_sqlstate IS NULL OR got_sqlstate = expected_sqlstate THEN
      RAISE NOTICE 'PASS % (denied % / %)', label, got_sqlstate, got_message;
      RETURN;
    END IF;
    RAISE EXCEPTION 'FAIL % (expected SQLSTATE %, got % / %)',
      label, expected_sqlstate, got_sqlstate, got_message;
  END;
  RAISE EXCEPTION 'FAIL % (call unexpectedly succeeded)', label;
END; $$;

-- ---------------------------------------------------------------------------
-- Synthetische Testwelt
-- ---------------------------------------------------------------------------
-- U01 sysadmin, U02 admin, U03 teamlead, U04 projectmanager,
-- U05 engineer, U06 viewer, U07 customer, U08 kiosk.
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
SELECT u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       u.email, 'x', now(), now(), now(), '{}'::jsonb, '{}'::jsonb
FROM (VALUES
  ('00000000-0000-0000-0000-00000000c301'::uuid, 'bsf03a-sysadmin@example.invalid'),
  ('00000000-0000-0000-0000-00000000c302'::uuid, 'bsf03a-admin@example.invalid'),
  ('00000000-0000-0000-0000-00000000c303'::uuid, 'bsf03a-teamlead@example.invalid'),
  ('00000000-0000-0000-0000-00000000c304'::uuid, 'bsf03a-projectmanager@example.invalid'),
  ('00000000-0000-0000-0000-00000000c305'::uuid, 'bsf03a-engineer@example.invalid'),
  ('00000000-0000-0000-0000-00000000c306'::uuid, 'bsf03a-viewer@example.invalid'),
  ('00000000-0000-0000-0000-00000000c307'::uuid, 'bsf03a-customer@example.invalid'),
  ('00000000-0000-0000-0000-00000000c308'::uuid, 'bsf03a-kiosk@example.invalid')
) AS u(id, email);

-- Default-Rollen aus on_auth_user_created deterministisch ersetzen.
DELETE FROM public.user_roles WHERE user_id IN (
  '00000000-0000-0000-0000-00000000c301','00000000-0000-0000-0000-00000000c302',
  '00000000-0000-0000-0000-00000000c303','00000000-0000-0000-0000-00000000c304',
  '00000000-0000-0000-0000-00000000c305','00000000-0000-0000-0000-00000000c306',
  '00000000-0000-0000-0000-00000000c307','00000000-0000-0000-0000-00000000c308');

INSERT INTO public.user_roles (user_id, role) VALUES
  ('00000000-0000-0000-0000-00000000c301','systemadministrator'),
  ('00000000-0000-0000-0000-00000000c302','administrator'),
  ('00000000-0000-0000-0000-00000000c303','teamlead'),
  ('00000000-0000-0000-0000-00000000c304','projectmanager'),
  ('00000000-0000-0000-0000-00000000c305','engineer'),
  ('00000000-0000-0000-0000-00000000c306','viewer'),
  ('00000000-0000-0000-0000-00000000c307','customer'),
  ('00000000-0000-0000-0000-00000000c308','kiosk');

UPDATE public.profiles SET status = 'active'
WHERE id IN (
  '00000000-0000-0000-0000-00000000c301','00000000-0000-0000-0000-00000000c302',
  '00000000-0000-0000-0000-00000000c303','00000000-0000-0000-0000-00000000c304',
  '00000000-0000-0000-0000-00000000c305','00000000-0000-0000-0000-00000000c306',
  '00000000-0000-0000-0000-00000000c307','00000000-0000-0000-0000-00000000c308');

-- ---------------------------------------------------------------------------
-- T01-T08: Permission-Matrix
-- ---------------------------------------------------------------------------
SELECT pg_temp.assert(public.has_permission('00000000-0000-0000-0000-00000000c301','project.controlling.view'), 'T01 sysadmin ALLOW');
SELECT pg_temp.assert(public.has_permission('00000000-0000-0000-0000-00000000c302','project.controlling.view'), 'T02 admin ALLOW');
SELECT pg_temp.assert(public.has_permission('00000000-0000-0000-0000-00000000c303','project.controlling.view'), 'T03 teamlead ALLOW');
SELECT pg_temp.assert(public.has_permission('00000000-0000-0000-0000-00000000c304','project.controlling.view'), 'T04 projectmanager ALLOW');
SELECT pg_temp.assert(NOT public.has_permission('00000000-0000-0000-0000-00000000c305','project.controlling.view'), 'T05 engineer DENY');
SELECT pg_temp.assert(NOT public.has_permission('00000000-0000-0000-0000-00000000c306','project.controlling.view'), 'T06 viewer DENY');
SELECT pg_temp.assert(NOT public.has_permission('00000000-0000-0000-0000-00000000c307','project.controlling.view'), 'T07 customer DENY');
SELECT pg_temp.assert(NOT public.has_permission('00000000-0000-0000-0000-00000000c308','project.controlling.view'), 'T08 kiosk DENY');

-- T09/T10: additive Spalten mit exaktem Null-/Default-Vertrag.
SELECT pg_temp.assert((
  SELECT data_type = 'text' AND is_nullable = 'YES'
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='shared_work_package_projection' AND column_name='category_key'
), 'T09 category_key exists nullable text');

SELECT pg_temp.assert((
  SELECT data_type = 'boolean' AND is_nullable = 'NO' AND column_default ILIKE '%false%'
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='shared_work_package_projection' AND column_name='category_observed'
), 'T10 category_observed exists default false');

INSERT INTO public.systemhouse (id, name, status) VALUES
  ('00000000-0000-0000-0000-0000000ac301','BSF03A SH1','active'),
  ('00000000-0000-0000-0000-0000000ac302','BSF03A SH2','active');

INSERT INTO public.customer (id, systemhouse_id, name, status) VALUES
  ('00000000-0000-0000-0000-0000000bc301','00000000-0000-0000-0000-0000000ac301','BSF03A C1','active'),
  ('00000000-0000-0000-0000-0000000bc302','00000000-0000-0000-0000-0000000ac301','BSF03A C2','active'),
  ('00000000-0000-0000-0000-0000000bc303','00000000-0000-0000-0000-0000000ac302','BSF03A C3','active');

INSERT INTO public.systemhouse_membership (systemhouse_id, user_id, status) VALUES
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-00000000c303','active');

INSERT INTO public.customer_access (systemhouse_id, customer_id, user_id, access_level, status) VALUES
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc301','00000000-0000-0000-0000-00000000c303','write','active');

CREATE OR REPLACE FUNCTION pg_temp.act_as(uid uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', uid::text, 'role','authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.act_reset() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', NULL, true);
END; $$;

SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c303');

-- T11: alte Payload ohne category_key -> unobserved.
SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc301',
  'structure', true, '[]'::jsonb,
  '[{"source_id":"BSF03A-WP-LEGACY","parent_link_status":"none","title":"Legacy","legacy_client":"C1","status":"open","priority":"medium","source_hash":"legacy-1"}]'::jsonb,
  '[]'::jsonb, '{}'::text[], ARRAY['BSF03A-WP-LEGACY'], '{}'::text[]);

SELECT pg_temp.assert((
  SELECT category_observed = false AND category_key IS NULL
  FROM public.shared_work_package_projection
  WHERE systemhouse_id='00000000-0000-0000-0000-0000000ac301'
    AND customer_id='00000000-0000-0000-0000-0000000bc301'
    AND source_id='BSF03A-WP-LEGACY'
), 'T11 legacy insert remains unobserved');

-- T12: ein bereits beobachteter Wert darf durch alte Payload nicht geloescht werden.
SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc301',
  'structure', true, '[]'::jsonb,
  '[{"source_id":"BSF03A-WP-PRESERVE","parent_link_status":"none","title":"Preserve","legacy_client":"C1","status":"open","priority":"medium","category_key":"wartung","source_hash":"preserve-1"}]'::jsonb,
  '[]'::jsonb, '{}'::text[], ARRAY['BSF03A-WP-PRESERVE'], '{}'::text[]);
SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc301',
  'structure', true, '[]'::jsonb,
  '[{"source_id":"BSF03A-WP-PRESERVE","parent_link_status":"none","title":"Preserve old client","legacy_client":"C1","status":"open","priority":"medium","source_hash":"preserve-2"}]'::jsonb,
  '[]'::jsonb, '{}'::text[], ARRAY['BSF03A-WP-PRESERVE'], '{}'::text[]);
SELECT pg_temp.assert((
  SELECT category_observed = true AND category_key = 'wartung'
  FROM public.shared_work_package_projection
  WHERE systemhouse_id='00000000-0000-0000-0000-0000000ac301'
    AND customer_id='00000000-0000-0000-0000-0000000bc301'
    AND source_id='BSF03A-WP-PRESERVE'
), 'T12 legacy update preserves observed category');

-- T13: explizites JSON null ist beobachtet und bedeutet keine Kategorie.
SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc301',
  'structure', true, '[]'::jsonb,
  '[{"source_id":"BSF03A-WP-NONE","parent_link_status":"none","title":"None","legacy_client":"C1","status":"open","priority":"medium","category_key":null,"source_hash":"none-1"}]'::jsonb,
  '[]'::jsonb, '{}'::text[], ARRAY['BSF03A-WP-NONE'], '{}'::text[]);
SELECT pg_temp.assert((
  SELECT category_observed = true AND category_key IS NULL
  FROM public.shared_work_package_projection
  WHERE systemhouse_id='00000000-0000-0000-0000-0000000ac301'
    AND customer_id='00000000-0000-0000-0000-0000000bc301'
    AND source_id='BSF03A-WP-NONE'
), 'T13 explicit null -> observed true/null');

-- T14: stabiler Key wird unveraendert gespeichert.
SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc301',
  'structure', true, '[]'::jsonb,
  '[{"source_id":"BSF03A-WP-KEY","parent_link_status":"none","title":"Key","legacy_client":"C1","status":"open","priority":"medium","category_key":"wartung","source_hash":"key-1"}]'::jsonb,
  '[]'::jsonb, '{}'::text[], ARRAY['BSF03A-WP-KEY'], '{}'::text[]);
SELECT pg_temp.assert((
  SELECT category_observed = true AND category_key = 'wartung'
  FROM public.shared_work_package_projection
  WHERE systemhouse_id='00000000-0000-0000-0000-0000000ac301'
    AND customer_id='00000000-0000-0000-0000-0000000bc301'
    AND source_id='BSF03A-WP-KEY'
), 'T14 known key preserved');

-- T15: kein FK/Silent-Remap fuer unbekannte historische Keys.
SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc301',
  'structure', true, '[]'::jsonb,
  '[{"source_id":"BSF03A-WP-UNKNOWN","parent_link_status":"none","title":"Unknown","legacy_client":"C1","status":"open","priority":"medium","category_key":"historisch-unbekannt","source_hash":"unknown-1"}]'::jsonb,
  '[]'::jsonb, '{}'::text[], ARRAY['BSF03A-WP-UNKNOWN'], '{}'::text[]);
SELECT pg_temp.assert((
  SELECT category_observed = true AND category_key = 'historisch-unbekannt'
  FROM public.shared_work_package_projection
  WHERE systemhouse_id='00000000-0000-0000-0000-0000000ac301'
    AND customer_id='00000000-0000-0000-0000-0000000bc301'
    AND source_id='BSF03A-WP-UNKNOWN'
), 'T15 unknown historical key preserved');

-- T16: geaenderter Kategorie-Hash erhoeht die Source-Revision reproduzierbar.
SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc301',
  'structure', true, '[]'::jsonb,
  '[{"source_id":"BSF03A-WP-REV","parent_link_status":"none","title":"Revision","legacy_client":"C1","status":"open","priority":"medium","category_key":"wartung","source_hash":"rev-category-wartung"}]'::jsonb,
  '[]'::jsonb, '{}'::text[], ARRAY['BSF03A-WP-REV'], '{}'::text[]);
SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc301',
  'structure', true, '[]'::jsonb,
  '[{"source_id":"BSF03A-WP-REV","parent_link_status":"none","title":"Revision","legacy_client":"C1","status":"open","priority":"medium","category_key":"projektarbeit","source_hash":"rev-category-projektarbeit"}]'::jsonb,
  '[]'::jsonb, '{}'::text[], ARRAY['BSF03A-WP-REV'], '{}'::text[]);
SELECT pg_temp.assert((
  SELECT source_revision = 2
     AND source_hash = 'rev-category-projektarbeit'
     AND category_key = 'projektarbeit'
     AND category_observed = true
  FROM public.shared_work_package_projection
  WHERE systemhouse_id='00000000-0000-0000-0000-0000000ac301'
    AND customer_id='00000000-0000-0000-0000-0000000bc301'
    AND source_id='BSF03A-WP-REV'
), 'T16 category hash change increments revision');

-- T17: fremdes Systemhaus ohne Membership -> DENY.
SELECT pg_temp.assert_denied(
  $$SELECT public.bsf02c_publish_shared_projection_snapshot(
      '00000000-0000-0000-0000-0000000ac302','00000000-0000-0000-0000-0000000bc303',
      'structure', true, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      '{}'::text[], '{}'::text[], '{}'::text[])$$,
  '42501', 'T17 cross-systemhouse denied');

-- T18: gleicher Systemhouse, aber fremder Customer ohne Access -> DENY.
SELECT pg_temp.assert_denied(
  $$SELECT public.bsf02c_publish_shared_projection_snapshot(
      '00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc302',
      'structure', true, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      '{}'::text[], '{}'::text[], '{}'::text[])$$,
  '42501', 'T18 cross-customer denied');

SELECT pg_temp.act_reset();

-- T19: Sicherheitsattribute duerfen durch CREATE OR REPLACE nicht driften.
SELECT pg_temp.assert((
  SELECT p.prosecdef = false AND p.proconfig @> ARRAY['search_path=public']
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='bsf02c_publish_shared_projection_snapshot'
), 'T19a publish RPC remains SECURITY INVOKER');

SELECT pg_temp.assert((
  SELECT p.prosecdef = false AND p.proconfig @> ARRAY['search_path=public']
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='has_permission'
), 'T19b has_permission keeps established SECURITY INVOKER contract');

-- T20: Fehler spaet im RPC muss vorherige Writes desselben Calls zurueckrollen.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c303');
SELECT pg_temp.assert_denied(
  $$SELECT public.bsf02c_publish_shared_projection_snapshot(
      '00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc301',
      'structure', true,
      '[]'::jsonb,
      '[{"source_id":"BSF03A-WP-ATOMIC","parent_link_status":"none","title":"Atomic","legacy_client":"C1","status":"open","priority":"medium","category_key":"wartung","source_hash":"atomic-wp"}]'::jsonb,
      '[{"source_id":"BSF03A-ACT-ATOMIC","work_package_source_id":"MISSING-WP","parent_link_status":"linked","title":"Must fail","legacy_client":"C1","activity_date":"2026-09-17","duration_hours":1,"billable":true,"billing_status":"open","source_hash":"atomic-act"}]'::jsonb,
      '{}'::text[], ARRAY['BSF03A-WP-ATOMIC'], ARRAY['BSF03A-ACT-ATOMIC'])$$,
  '42501', 'T20a late failure denied atomically');
SELECT pg_temp.act_reset();

SELECT pg_temp.assert(NOT EXISTS (
  SELECT 1 FROM public.shared_work_package_projection
  WHERE systemhouse_id='00000000-0000-0000-0000-0000000ac301'
    AND customer_id='00000000-0000-0000-0000-0000000bc301'
    AND source_id='BSF03A-WP-ATOMIC'
), 'T20b prior write rolled back');

SELECT pg_temp.assert(
  to_regprocedure('public.bsf02c_publish_shared_projection_snapshot(uuid,uuid,text,boolean,jsonb,jsonb,jsonb,text[],text[],text[])') IS NOT NULL,
  'T20c BSF-02C exact signature unchanged');

SELECT pg_temp.assert((
  SELECT NOT has_function_privilege('public', p.oid, 'EXECUTE')
     AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
     AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='bsf02c_publish_shared_projection_snapshot'
), 'T20d BSF-02C execute ACL unchanged');

ROLLBACK;
