-- BSF-03B — Teamlead-Leistungsnachweis V1 (Issue #107)
-- Vertragstest, transaktional, fail-fast, ausschliesslich synthetische Daten.
-- Ausfuehrung: psql -f supabase/tests/bsf03b-performance-statement.sql
--
-- Vertraege:
--   T01      fuenf geplante Tabellen existieren
--   T02      RLS auf allen fuenf aktiv
--   T03      anon/PUBLIC ohne Rechte; authenticated least privilege
--   T04      performance.statement.manage: teamlead ALLOW, sysadmin per Catch-all
--   T05-T09  administrator/projectmanager/engineer/viewer/customer DENY
--   T10-T12  Override Scope: same-scope PASS, cross-systemhouse/-customer DENY
--   T13      Override-Auditzeile performance_statement.billable_override.insert
--   T14      Override revisionsgebunden
--   T15-T17  kein direkter Client-INSERT auf statement/item/claim
--   T18      finalisierter Snapshot inhaltlich immutable
--   T19      interne Triggerfunktion: kein direkter EXECUTE fuer authenticated
--   T20      finalize PASS, result_statement_id gesetzt
--   T21      stale Review-Fingerprint -> vollstaendiger Rollback
--   T22      doppelter aktiver Claim -> vollstaendiger Rollback
--   T23      non-billable Item + Source-Provenienz/Freshness im Snapshot
--   T24      billable_hours / non_billable_hours korrekt
--   T25      snapshot_hash = 64 Zeichen lowercase hex
--   T26      Idempotency-Key erzeugt keinen zweiten Snapshot
--   T27      Ersatz: series_id stabil, version+1, Claims auf v2
--   T28      Ersatz cross-customer DENY
--   T29      alte Items immutable, alter Header superseded + verlinkt
--   T30      nach aeusserem ROLLBACK kein synthetisches Residuum

\set ON_ERROR_STOP on

BEGIN;

-- ---------------------------------------------------------------------------
-- Helfer
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- T01/T02: Existenz- und RLS-Vertrag
-- ---------------------------------------------------------------------------
SELECT pg_temp.assert((
  SELECT count(*) = 5 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname IN (
    'customer_activity_billable_override',
    'customer_performance_statement_request',
    'customer_performance_statement',
    'customer_performance_statement_item',
    'customer_performance_activity_claim')
), 'T01 five BSF-03B tables exist');

SELECT pg_temp.assert((
  SELECT bool_and(c.relrowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN (
    'customer_activity_billable_override',
    'customer_performance_statement_request',
    'customer_performance_statement',
    'customer_performance_statement_item',
    'customer_performance_activity_claim')
), 'T02 RLS enabled on all five tables');

-- ---------------------------------------------------------------------------
-- T03: Grant-Posture. Die live vorhandene DEFAULT PRIVILEGES-Lage im Schema
-- public vergibt neu erzeugten Tabellen ALL an anon/authenticated. Die
-- Migration MUSS diese Rechte explizit entziehen; RLS allein genuegt nicht.
-- ---------------------------------------------------------------------------
SELECT pg_temp.assert((
  SELECT bool_and(
      NOT has_table_privilege('anon', t, 'SELECT')
  AND NOT has_table_privilege('anon', t, 'INSERT')
  AND NOT has_table_privilege('anon', t, 'UPDATE')
  AND NOT has_table_privilege('anon', t, 'DELETE')
  AND NOT has_table_privilege('public', t, 'SELECT')
  AND NOT has_table_privilege('public', t, 'INSERT')
  AND NOT has_table_privilege('public', t, 'UPDATE')
  AND NOT has_table_privilege('public', t, 'DELETE'))
  FROM unnest(ARRAY[
    'public.customer_activity_billable_override',
    'public.customer_performance_statement_request',
    'public.customer_performance_statement',
    'public.customer_performance_statement_item',
    'public.customer_performance_activity_claim']) t
), 'T03a anon/PUBLIC hold no DML rights');

SELECT pg_temp.assert((
  SELECT bool_and(
      has_table_privilege('authenticated', t, 'SELECT')
  AND NOT has_table_privilege('authenticated', t, 'INSERT')
  AND NOT has_table_privilege('authenticated', t, 'UPDATE')
  AND NOT has_table_privilege('authenticated', t, 'DELETE'))
  FROM unnest(ARRAY[
    'public.customer_performance_statement',
    'public.customer_performance_statement_item',
    'public.customer_performance_activity_claim']) t
), 'T03b authenticated read-only on statement/item/claim');

SELECT pg_temp.assert(
      has_table_privilege('authenticated','public.customer_activity_billable_override','SELECT')
  AND has_table_privilege('authenticated','public.customer_activity_billable_override','INSERT')
  AND has_table_privilege('authenticated','public.customer_activity_billable_override','UPDATE')
  AND NOT has_table_privilege('authenticated','public.customer_activity_billable_override','DELETE'),
  'T03c override least privilege (no DELETE)');

SELECT pg_temp.assert(
      has_table_privilege('authenticated','public.customer_performance_statement_request','SELECT')
  AND has_table_privilege('authenticated','public.customer_performance_statement_request','INSERT')
  AND NOT has_table_privilege('authenticated','public.customer_performance_statement_request','UPDATE')
  AND NOT has_table_privilege('authenticated','public.customer_performance_statement_request','DELETE'),
  'T03d request least privilege (insert + read only)');

-- Kanonischer Review-Fingerprint gemaess docs/BSF-03B-DESIGN.md Abschnitt 9.
-- Zeile: activity_source_id|source_revision|source_hash|activity_date|
--        duration_hours|billing_status|effective_billable
-- Sortiert nach activity_source_id, verbunden mit \n, SHA-256, lowercase hex.
CREATE OR REPLACE FUNCTION pg_temp.review_fingerprint(
  _sh uuid, _cust uuid, _from date, _to date, _replace_statement_id uuid DEFAULT NULL)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT encode(sha256(convert_to(coalesce(string_agg(line, E'\n' ORDER BY src), ''), 'UTF8')), 'hex')
  FROM (
    SELECT a.source_id AS src,
           a.source_id || '|' || a.source_revision::text || '|' || a.source_hash || '|'
             || to_char(a.activity_date, 'YYYY-MM-DD') || '|'
             || trim(to_char(a.duration_hours, 'FM9999999990.00')) || '|'
             || a.billing_status || '|'
             || CASE WHEN coalesce(o.effective_billable, a.billable) THEN 'true' ELSE 'false' END
             AS line
    FROM public.shared_activity_projection a
    LEFT JOIN public.customer_activity_billable_override o
      ON o.systemhouse_id = a.systemhouse_id
     AND o.customer_id = a.customer_id
     AND o.activity_source_id = a.source_id
     AND o.source_revision = a.source_revision
     AND o.source_hash = a.source_hash
    WHERE a.systemhouse_id = _sh
      AND a.customer_id = _cust
      AND a.is_active
      AND a.activity_date BETWEEN _from AND _to
      AND a.billing_status <> 'abgerechnet'
      AND NOT EXISTS (
        SELECT 1 FROM public.customer_performance_activity_claim c
        WHERE c.systemhouse_id = a.systemhouse_id
          AND c.customer_id = a.customer_id
          AND c.activity_source_id = a.source_id
          AND (_replace_statement_id IS NULL OR c.statement_id <> _replace_statement_id)
      )
  ) rows;
$$;

-- ---------------------------------------------------------------------------
-- Synthetische Testwelt
-- ---------------------------------------------------------------------------
-- U01 sysadmin, U02 admin, U03 teamlead, U04 projectmanager,
-- U05 engineer, U06 viewer, U07 customer, U08 teamlead ohne Scope.
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
SELECT u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       u.email, 'x', now(), now(), now(), '{}'::jsonb, '{}'::jsonb
FROM (VALUES
  ('00000000-0000-0000-0000-00000000b301'::uuid, 'bsf03b-sysadmin@example.invalid'),
  ('00000000-0000-0000-0000-00000000b302'::uuid, 'bsf03b-admin@example.invalid'),
  ('00000000-0000-0000-0000-00000000b303'::uuid, 'bsf03b-teamlead@example.invalid'),
  ('00000000-0000-0000-0000-00000000b304'::uuid, 'bsf03b-projectmanager@example.invalid'),
  ('00000000-0000-0000-0000-00000000b305'::uuid, 'bsf03b-engineer@example.invalid'),
  ('00000000-0000-0000-0000-00000000b306'::uuid, 'bsf03b-viewer@example.invalid'),
  ('00000000-0000-0000-0000-00000000b307'::uuid, 'bsf03b-customer@example.invalid'),
  ('00000000-0000-0000-0000-00000000b308'::uuid, 'bsf03b-teamlead-foreign@example.invalid')
) AS u(id, email);

DELETE FROM public.user_roles WHERE user_id IN (
  '00000000-0000-0000-0000-00000000b301','00000000-0000-0000-0000-00000000b302',
  '00000000-0000-0000-0000-00000000b303','00000000-0000-0000-0000-00000000b304',
  '00000000-0000-0000-0000-00000000b305','00000000-0000-0000-0000-00000000b306',
  '00000000-0000-0000-0000-00000000b307','00000000-0000-0000-0000-00000000b308');

INSERT INTO public.user_roles (user_id, role) VALUES
  ('00000000-0000-0000-0000-00000000b301','systemadministrator'),
  ('00000000-0000-0000-0000-00000000b302','administrator'),
  ('00000000-0000-0000-0000-00000000b303','teamlead'),
  ('00000000-0000-0000-0000-00000000b304','projectmanager'),
  ('00000000-0000-0000-0000-00000000b305','engineer'),
  ('00000000-0000-0000-0000-00000000b306','viewer'),
  ('00000000-0000-0000-0000-00000000b307','customer'),
  ('00000000-0000-0000-0000-00000000b308','teamlead');

UPDATE public.profiles SET status = 'active'
WHERE id IN (
  '00000000-0000-0000-0000-00000000b301','00000000-0000-0000-0000-00000000b302',
  '00000000-0000-0000-0000-00000000b303','00000000-0000-0000-0000-00000000b304',
  '00000000-0000-0000-0000-00000000b305','00000000-0000-0000-0000-00000000b306',
  '00000000-0000-0000-0000-00000000b307','00000000-0000-0000-0000-00000000b308');

-- ---------------------------------------------------------------------------
-- T04-T09: Permission-Matrix performance.statement.manage
-- ---------------------------------------------------------------------------
SELECT pg_temp.assert(public.has_permission('00000000-0000-0000-0000-00000000b303','performance.statement.manage'),
  'T04a teamlead ALLOW');
SELECT pg_temp.assert(public.has_permission('00000000-0000-0000-0000-00000000b301','performance.statement.manage'),
  'T04b sysadmin ALLOW via existing catch-all model');
SELECT pg_temp.assert(NOT public.has_permission('00000000-0000-0000-0000-00000000b302','performance.statement.manage'),
  'T05 administrator DENY');
SELECT pg_temp.assert(NOT public.has_permission('00000000-0000-0000-0000-00000000b304','performance.statement.manage'),
  'T06 projectmanager DENY');
SELECT pg_temp.assert(NOT public.has_permission('00000000-0000-0000-0000-00000000b305','performance.statement.manage'),
  'T07 engineer DENY');
SELECT pg_temp.assert(NOT public.has_permission('00000000-0000-0000-0000-00000000b306','performance.statement.manage'),
  'T08 viewer DENY');
SELECT pg_temp.assert(NOT public.has_permission('00000000-0000-0000-0000-00000000b307','performance.statement.manage'),
  'T09 customer DENY');

-- has_permission bleibt SECURITY INVOKER (Regressionsanker).
SELECT pg_temp.assert((
  SELECT p.prosecdef = false FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'has_permission'
), 'T09b has_permission remains SECURITY INVOKER');

-- ---------------------------------------------------------------------------
-- Scope-Fixture
-- ---------------------------------------------------------------------------
INSERT INTO public.systemhouse (id, name, status) VALUES
  ('00000000-0000-0000-0000-0000000ab301','BSF03B SH1','active'),
  ('00000000-0000-0000-0000-0000000ab302','BSF03B SH2','active');

INSERT INTO public.customer (id, systemhouse_id, name, status) VALUES
  ('00000000-0000-0000-0000-0000000bb301','00000000-0000-0000-0000-0000000ab301','BSF03B C1','active'),
  ('00000000-0000-0000-0000-0000000bb302','00000000-0000-0000-0000-0000000ab301','BSF03B C2','active'),
  ('00000000-0000-0000-0000-0000000bb303','00000000-0000-0000-0000-0000000ab302','BSF03B C3','active');

INSERT INTO public.systemhouse_membership (systemhouse_id, user_id, status) VALUES
  ('00000000-0000-0000-0000-0000000ab301','00000000-0000-0000-0000-00000000b303','active'),
  ('00000000-0000-0000-0000-0000000ab302','00000000-0000-0000-0000-00000000b308','active');

INSERT INTO public.customer_access (systemhouse_id, customer_id, user_id, access_level, status) VALUES
  ('00000000-0000-0000-0000-0000000ab301','00000000-0000-0000-0000-0000000bb301',
   '00000000-0000-0000-0000-00000000b303','write','active'),
  ('00000000-0000-0000-0000-0000000ab302','00000000-0000-0000-0000-0000000bb303',
   '00000000-0000-0000-0000-00000000b308','write','active');

-- Quelldaten ueber den bestehenden BSF-02C-Publish-Pfad, nie per Direkt-DML.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000b303');

SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ab301','00000000-0000-0000-0000-0000000bb301',
  'structure', true,
  '[{"source_id":"BSF03B-PRJ-1","name":"BSF03B Projekt","legacy_client":"C1","status":"active","source_hash":"prj-1"}]'::jsonb,
  '[{"source_id":"BSF03B-WP-1","project_source_id":"BSF03B-PRJ-1","parent_link_status":"linked","title":"BSF03B AP","legacy_client":"C1","status":"open","priority":"medium","category_key":"wartung","source_hash":"wp-1"}]'::jsonb,
  '[]'::jsonb,
  ARRAY['BSF03B-PRJ-1'], ARRAY['BSF03B-WP-1'], '{}'::text[]);

-- A1 billable 2.50h, A2 billable 1.25h (spaeter per Override non-billable),
-- A3 non-billable 0.75h, A4 legacy 'abgerechnet' 4.00h (darf nie in Snapshot).
SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ab301','00000000-0000-0000-0000-0000000bb301',
  'activities', true, '[]'::jsonb, '[]'::jsonb,
  '[
    {"source_id":"BSF03B-ACT-1","work_package_source_id":"BSF03B-WP-1","parent_link_status":"linked","title":"Act 1","legacy_client":"C1","activity_date":"2026-08-03","duration_hours":2.50,"billable":true,"billing_status":"offen","source_hash":"act-1-r1"},
    {"source_id":"BSF03B-ACT-2","work_package_source_id":"BSF03B-WP-1","parent_link_status":"linked","title":"Act 2","legacy_client":"C1","activity_date":"2026-08-10","duration_hours":1.25,"billable":true,"billing_status":"offen","source_hash":"act-2-r1"},
    {"source_id":"BSF03B-ACT-3","work_package_source_id":"BSF03B-WP-1","parent_link_status":"linked","title":"Act 3","legacy_client":"C1","activity_date":"2026-08-17","duration_hours":0.75,"billable":false,"billing_status":"offen","source_hash":"act-3-r1"},
    {"source_id":"BSF03B-ACT-4","work_package_source_id":"BSF03B-WP-1","parent_link_status":"linked","title":"Act 4 legacy","legacy_client":"C1","activity_date":"2026-08-24","duration_hours":4.00,"billable":true,"billing_status":"abgerechnet","source_hash":"act-4-r1"}
  ]'::jsonb,
  '{}'::text[], '{}'::text[],
  ARRAY['BSF03B-ACT-1','BSF03B-ACT-2','BSF03B-ACT-3','BSF03B-ACT-4']);

-- ---------------------------------------------------------------------------
-- T10-T14: Billing-Review-Overlay
-- ---------------------------------------------------------------------------
-- T10: gleiche Scope-Zeile, revisionsgebunden.
INSERT INTO public.customer_activity_billable_override
  (systemhouse_id, customer_id, activity_source_id, source_revision, source_hash,
   source_billable, effective_billable)
SELECT a.systemhouse_id, a.customer_id, a.source_id, a.source_revision, a.source_hash,
       a.billable, false
FROM public.shared_activity_projection a
WHERE a.systemhouse_id = '00000000-0000-0000-0000-0000000ab301'
  AND a.customer_id = '00000000-0000-0000-0000-0000000bb301'
  AND a.source_id = 'BSF03B-ACT-2';

SELECT pg_temp.assert((
  SELECT count(*) = 1 FROM public.customer_activity_billable_override
  WHERE activity_source_id = 'BSF03B-ACT-2' AND effective_billable = false
), 'T10 override same-scope insert allowed');

-- T11: fremdes Systemhaus ohne Membership.
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_activity_billable_override
      (systemhouse_id, customer_id, activity_source_id, source_revision, source_hash,
       source_billable, effective_billable)
    VALUES ('00000000-0000-0000-0000-0000000ab302','00000000-0000-0000-0000-0000000bb303',
            'BSF03B-ACT-X',1,'x',true,false)$$,
  '42501', 'T11 override cross-systemhouse denied');

-- T12: gleiches Systemhaus, Customer ohne Access.
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_activity_billable_override
      (systemhouse_id, customer_id, activity_source_id, source_revision, source_hash,
       source_billable, effective_billable)
    VALUES ('00000000-0000-0000-0000-0000000ab301','00000000-0000-0000-0000-0000000bb302',
            'BSF03B-ACT-X',1,'x',true,false)$$,
  '42501', 'T12 override foreign customer denied');

SELECT pg_temp.act_reset();

-- T13: Audit-Vertrag gegen die live vorhandenen Spalten action/target/payload.
SELECT pg_temp.assert(EXISTS (
  SELECT 1 FROM public.audit_log
  WHERE action = 'performance_statement.billable_override.insert'
    AND actor_id = '00000000-0000-0000-0000-00000000b303'
    AND payload ->> 'activity_source_id' = 'BSF03B-ACT-2'
), 'T13 override audit row written');

-- T14: neue Source-Revision entwertet das alte Override fachlich.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000b303');
SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ab301','00000000-0000-0000-0000-0000000bb301',
  'activities', true, '[]'::jsonb, '[]'::jsonb,
  '[{"source_id":"BSF03B-ACT-2","work_package_source_id":"BSF03B-WP-1","parent_link_status":"linked","title":"Act 2 v2","legacy_client":"C1","activity_date":"2026-08-10","duration_hours":1.25,"billable":true,"billing_status":"offen","source_hash":"act-2-r2"}]'::jsonb,
  '{}'::text[], '{}'::text[],
  ARRAY['BSF03B-ACT-1','BSF03B-ACT-2','BSF03B-ACT-3','BSF03B-ACT-4']);

SELECT pg_temp.assert((
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.shared_activity_projection a
    JOIN public.customer_activity_billable_override o
      ON o.systemhouse_id = a.systemhouse_id AND o.customer_id = a.customer_id
     AND o.activity_source_id = a.source_id
     AND o.source_revision = a.source_revision AND o.source_hash = a.source_hash
    WHERE a.source_id = 'BSF03B-ACT-2')
  AND EXISTS (
    SELECT 1 FROM public.customer_activity_billable_override
    WHERE activity_source_id = 'BSF03B-ACT-2' AND source_hash = 'act-2-r1')
), 'T14 override bound to revision, old override retained but not applied');

-- Override auf die aktuelle Revision neu setzen (Designpfad: erneute Entscheidung).
INSERT INTO public.customer_activity_billable_override
  (systemhouse_id, customer_id, activity_source_id, source_revision, source_hash,
   source_billable, effective_billable)
SELECT a.systemhouse_id, a.customer_id, a.source_id, a.source_revision, a.source_hash,
       a.billable, false
FROM public.shared_activity_projection a
WHERE a.source_id = 'BSF03B-ACT-2'
  AND a.systemhouse_id = '00000000-0000-0000-0000-0000000ab301'
  AND a.customer_id = '00000000-0000-0000-0000-0000000bb301';

-- ---------------------------------------------------------------------------
-- T15-T17: keine direkte Client-DML auf Snapshotobjekten
-- ---------------------------------------------------------------------------
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_performance_statement
      (series_id, version, systemhouse_id, customer_id, customer_name_snapshot,
       period_start, period_end, status, finalized_by, review_fingerprint,
       snapshot_hash, item_count, billable_item_count, billable_hours, non_billable_hours)
    VALUES (gen_random_uuid(),1,'00000000-0000-0000-0000-0000000ab301',
            '00000000-0000-0000-0000-0000000bb301','BSF03B C1','2026-08-01','2026-08-31',
            'finalized','00000000-0000-0000-0000-00000000b303',repeat('0',64),repeat('0',64),
            0,0,0,0)$$,
  '42501', 'T15 direct statement insert denied');

SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_performance_statement_item
      (statement_id, position, activity_source_id, source_revision, source_hash,
       activity_date, title_snapshot, duration_hours, source_billable, effective_billable)
    VALUES (gen_random_uuid(),1,'BSF03B-ACT-1',1,'act-1-r1','2026-08-03','x',1,true,true)$$,
  '42501', 'T16 direct item insert denied');

SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_performance_activity_claim
      (systemhouse_id, customer_id, activity_source_id, statement_id)
    VALUES ('00000000-0000-0000-0000-0000000ab301','00000000-0000-0000-0000-0000000bb301',
            'BSF03B-ACT-1', gen_random_uuid())$$,
  '42501', 'T17 direct claim insert denied');

-- ---------------------------------------------------------------------------
-- T19: interne Triggerfunktion aus pg_trigger ableiten, nicht hardcodieren
-- ---------------------------------------------------------------------------
SELECT pg_temp.act_reset();

SELECT pg_temp.assert((
  SELECT count(*) >= 1 FROM pg_trigger t
  WHERE t.tgrelid = 'public.customer_performance_statement_request'::regclass
    AND NOT t.tgisinternal
), 'T19a request table carries an internal processing trigger');

SELECT pg_temp.assert((
  SELECT bool_and(
      (p.prosecdef = false)
   OR (p.proconfig @> ARRAY['search_path=""']
       AND NOT has_function_privilege('public', p.oid, 'EXECUTE')
       AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
       AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')))
  FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE t.tgrelid = 'public.customer_performance_statement_request'::regclass
    AND NOT t.tgisinternal
), 'T19b trigger function hardened: search_path='''' and no PUBLIC/anon/authenticated EXECUTE');

SELECT pg_temp.assert((
  SELECT bool_and(NOT has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE t.tgrelid = 'public.customer_performance_statement_request'::regclass
    AND NOT t.tgisinternal
), 'T19c authenticated cannot execute the trigger function directly');

-- ---------------------------------------------------------------------------
-- T20/T23/T24/T25: Finalisierung ueber die Request-Tabelle, gleicher User-JWT
-- ---------------------------------------------------------------------------
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000b303');

-- T21 zuerst: veralteter Fingerprint muss vollstaendig zurueckrollen.
SAVEPOINT sp_stale;
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_performance_statement_request
      (id, systemhouse_id, customer_id, period_start, period_end, action,
       expected_review_fingerprint)
    VALUES ('00000000-0000-0000-0000-00000000f901',
            '00000000-0000-0000-0000-0000000ab301','00000000-0000-0000-0000-0000000bb301',
            '2026-08-01','2026-08-31','finalize', repeat('a',64))$$,
  NULL, 'T21a stale fingerprint rejected');
ROLLBACK TO SAVEPOINT sp_stale;

SELECT pg_temp.assert(
      NOT EXISTS (SELECT 1 FROM public.customer_performance_statement_request
                  WHERE id = '00000000-0000-0000-0000-00000000f901')
  AND NOT EXISTS (SELECT 1 FROM public.customer_performance_statement
                  WHERE customer_id = '00000000-0000-0000-0000-0000000bb301')
  AND NOT EXISTS (SELECT 1 FROM public.customer_performance_activity_claim
                  WHERE customer_id = '00000000-0000-0000-0000-0000000bb301'),
  'T21b no statement/request/claim residue after stale fingerprint');

-- T20: gueltige Finalisierung.
INSERT INTO public.customer_performance_statement_request
  (id, systemhouse_id, customer_id, period_start, period_end, action,
   expected_review_fingerprint)
VALUES ('00000000-0000-0000-0000-00000000f001',
        '00000000-0000-0000-0000-0000000ab301','00000000-0000-0000-0000-0000000bb301',
        '2026-08-01','2026-08-31','finalize',
        pg_temp.review_fingerprint('00000000-0000-0000-0000-0000000ab301',
                                   '00000000-0000-0000-0000-0000000bb301',
                                   '2026-08-01','2026-08-31'));

SELECT pg_temp.assert((
  SELECT result_statement_id IS NOT NULL
  FROM public.customer_performance_statement_request
  WHERE id = '00000000-0000-0000-0000-00000000f001'
), 'T20 finalize request populated result_statement_id');

-- T23: non-billable reviewable Zeilen sind Snapshot- und Claimbestandteil.
SELECT pg_temp.assert((
  SELECT count(*) = 3
  FROM public.customer_performance_statement_item i
  JOIN public.customer_performance_statement_request r ON r.result_statement_id = i.statement_id
  WHERE r.id = '00000000-0000-0000-0000-00000000f001'
), 'T23a snapshot contains exactly the three reviewable activities');

SELECT pg_temp.assert((
  SELECT bool_and(i.effective_billable = false)
  FROM public.customer_performance_statement_item i
  JOIN public.customer_performance_statement_request r ON r.result_statement_id = i.statement_id
  WHERE r.id = '00000000-0000-0000-0000-00000000f001'
    AND i.activity_source_id IN ('BSF03B-ACT-2','BSF03B-ACT-3')
), 'T23b overridden and source non-billable rows stay in snapshot');

SELECT pg_temp.assert((
  SELECT bool_and(i.source_published_at IS NOT NULL)
     AND bool_and(i.source_engineer_id IS NOT NULL)
  FROM public.customer_performance_statement_item i
  JOIN public.customer_performance_statement_request r ON r.result_statement_id = i.statement_id
  WHERE r.id = '00000000-0000-0000-0000-00000000f001'
), 'T23c item source provenance persisted');

SELECT pg_temp.assert(
      NOT EXISTS (
        SELECT 1 FROM public.customer_performance_statement_item i
        JOIN public.customer_performance_statement_request r ON r.result_statement_id = i.statement_id
        WHERE r.id = '00000000-0000-0000-0000-00000000f001'
          AND i.activity_source_id = 'BSF03B-ACT-4')
  AND (SELECT count(*) = 3 FROM public.customer_performance_activity_claim
       WHERE customer_id = '00000000-0000-0000-0000-0000000bb301'),
  'T23d legacy_finalized excluded, all snapshot items claimed');

SELECT pg_temp.assert((
  SELECT s.source_oldest_published_at IS NOT NULL
     AND s.source_latest_published_at IS NOT NULL
     AND s.source_oldest_published_at <= s.source_latest_published_at
  FROM public.customer_performance_statement s
  JOIN public.customer_performance_statement_request r ON r.result_statement_id = s.id
  WHERE r.id = '00000000-0000-0000-0000-00000000f001'
), 'T23e header freshness range persisted');

-- T24: Summen exakt aus den gespeicherten Items.
SELECT pg_temp.assert((
  SELECT s.billable_hours = 2.50 AND s.non_billable_hours = 2.00
     AND s.item_count = 3 AND s.billable_item_count = 1
  FROM public.customer_performance_statement s
  JOIN public.customer_performance_statement_request r ON r.result_statement_id = s.id
  WHERE r.id = '00000000-0000-0000-0000-00000000f001'
), 'T24 billable/non-billable hour sums correct');

-- T25: Snapshot-Hash-Vertrag.
SELECT pg_temp.assert((
  SELECT s.snapshot_hash ~ '^[0-9a-f]{64}$'
  FROM public.customer_performance_statement s
  JOIN public.customer_performance_statement_request r ON r.result_statement_id = s.id
  WHERE r.id = '00000000-0000-0000-0000-00000000f001'
), 'T25 snapshot_hash is lowercase 64-hex');

-- T18: finalisierter Inhalt ist unveraenderbar.
SELECT pg_temp.assert_denied(
  $$UPDATE public.customer_performance_statement
       SET billable_hours = 99
     WHERE customer_id = '00000000-0000-0000-0000-0000000bb301'$$,
  '42501', 'T18a finalized statement content immutable for client');

SELECT pg_temp.assert_denied(
  $$UPDATE public.customer_performance_statement_item
       SET duration_hours = 99
     WHERE activity_source_id = 'BSF03B-ACT-1'$$,
  '42501', 'T18b finalized item immutable for client');

-- Quelltaetigkeit bleibt unberuehrt: keine Mutation von billable/billing_status.
SELECT pg_temp.assert((
  SELECT bool_and(billing_status = 'offen')
  FROM public.shared_activity_projection
  WHERE customer_id = '00000000-0000-0000-0000-0000000bb301'
    AND source_id IN ('BSF03B-ACT-1','BSF03B-ACT-2','BSF03B-ACT-3')
), 'T18c finalization does not mutate shared_activity_projection.billing_status');

-- T22: zweite normale Finalisierung mit aktivem Claim -> voller Rollback.
SAVEPOINT sp_dup;
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_performance_statement_request
      (id, systemhouse_id, customer_id, period_start, period_end, action,
       expected_review_fingerprint)
    VALUES ('00000000-0000-0000-0000-00000000f002',
            '00000000-0000-0000-0000-0000000ab301','00000000-0000-0000-0000-0000000bb301',
            '2026-08-01','2026-08-31','finalize', repeat('0',64))$$,
  NULL, 'T22a duplicate claim finalization rejected');
ROLLBACK TO SAVEPOINT sp_dup;

SELECT pg_temp.assert((
  SELECT count(*) = 1 FROM public.customer_performance_statement
  WHERE customer_id = '00000000-0000-0000-0000-0000000bb301'
), 'T22b no second statement created');

-- T26: Idempotenz derselben Request-ID.
SAVEPOINT sp_idem;
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_performance_statement_request
      (id, systemhouse_id, customer_id, period_start, period_end, action,
       expected_review_fingerprint)
    VALUES ('00000000-0000-0000-0000-00000000f001',
            '00000000-0000-0000-0000-0000000ab301','00000000-0000-0000-0000-0000000bb301',
            '2026-08-01','2026-08-31','finalize', repeat('0',64))$$,
  '23505', 'T26a repeated idempotency key rejected by primary key');
ROLLBACK TO SAVEPOINT sp_idem;

SELECT pg_temp.assert((
  SELECT count(*) = 1 FROM public.customer_performance_statement
  WHERE customer_id = '00000000-0000-0000-0000-0000000bb301'
), 'T26b idempotent replay resolves existing result, no second snapshot');

SELECT pg_temp.assert((
  SELECT requested_by = '00000000-0000-0000-0000-00000000b303'
     AND systemhouse_id = '00000000-0000-0000-0000-0000000ab301'
     AND customer_id = '00000000-0000-0000-0000-0000000bb301'
  FROM public.customer_performance_statement_request
  WHERE id = '00000000-0000-0000-0000-00000000f001'
), 'T26c stored request keeps actor and scope for replay resolution');

-- ---------------------------------------------------------------------------
-- T27-T29: Ersatzworkflow
-- ---------------------------------------------------------------------------
-- T28: Ersatz auf fremden Customer.
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_performance_statement_request
      (id, systemhouse_id, customer_id, period_start, period_end, action,
       replaces_statement_id, expected_review_fingerprint)
    SELECT '00000000-0000-0000-0000-00000000f003',
           '00000000-0000-0000-0000-0000000ab301','00000000-0000-0000-0000-0000000bb302',
           '2026-08-01','2026-08-31','replace', s.id, repeat('0',64)
      FROM public.customer_performance_statement s
     WHERE s.customer_id = '00000000-0000-0000-0000-0000000bb301'$$,
  '42501', 'T28 replacement cross-customer denied');

-- Vor dem Ersatz faellt ACT-3 aus dem aktuellen Satz. v1 muss unveraendert
-- bleiben, der aktive Claim von ACT-3 muss beim Replacement freigegeben werden.
SELECT pg_temp.act_reset();
UPDATE public.shared_activity_projection
   SET is_active = false, withdrawn_at = now(), updated_at = now()
 WHERE systemhouse_id = '00000000-0000-0000-0000-0000000ab301'
   AND customer_id = '00000000-0000-0000-0000-0000000bb301'
   AND source_id = 'BSF03B-ACT-3';
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000b303');

-- T27: gueltiger Ersatz im selben Scope und Zeitraum.
INSERT INTO public.customer_performance_statement_request
  (id, systemhouse_id, customer_id, period_start, period_end, action,
   replaces_statement_id, expected_review_fingerprint)
SELECT '00000000-0000-0000-0000-00000000f004',
       '00000000-0000-0000-0000-0000000ab301','00000000-0000-0000-0000-0000000bb301',
       '2026-08-01','2026-08-31','replace', s.id,
       pg_temp.review_fingerprint('00000000-0000-0000-0000-0000000ab301',
                                  '00000000-0000-0000-0000-0000000bb301',
                                  '2026-08-01','2026-08-31', s.id)
FROM public.customer_performance_statement s
WHERE s.customer_id = '00000000-0000-0000-0000-0000000bb301'
  AND s.status = 'finalized';

SELECT pg_temp.assert((
  SELECT v2.version = v1.version + 1
     AND v2.series_id = v1.series_id
     AND v2.status = 'finalized'
     AND v2.replaces_statement_id = v1.id
  FROM public.customer_performance_statement v1
  JOIN public.customer_performance_statement v2 ON v2.id = (
    SELECT result_statement_id FROM public.customer_performance_statement_request
    WHERE id = '00000000-0000-0000-0000-00000000f004')
  WHERE v1.version = 1 AND v1.customer_id = '00000000-0000-0000-0000-0000000bb301'
), 'T27a replacement keeps series_id and increments version');

SELECT pg_temp.assert((
  SELECT bool_and(c.statement_id = (
    SELECT result_statement_id FROM public.customer_performance_statement_request
    WHERE id = '00000000-0000-0000-0000-00000000f004'))
  FROM public.customer_performance_activity_claim c
  WHERE c.customer_id = '00000000-0000-0000-0000-0000000bb301'
), 'T27b active claims atomically re-pointed to v2');

SELECT pg_temp.assert(
      NOT EXISTS (
        SELECT 1 FROM public.customer_performance_activity_claim
        WHERE customer_id = '00000000-0000-0000-0000-0000000bb301'
          AND activity_source_id = 'BSF03B-ACT-3')
  AND (SELECT count(*) = 2 FROM public.customer_performance_activity_claim
       WHERE customer_id = '00000000-0000-0000-0000-0000000bb301'),
  'T27c removed activity claim released during replacement');

-- T29: alter Snapshot bleibt inhaltlich unveraendert, Header wird superseded.
SELECT pg_temp.assert((
  SELECT v1.status = 'superseded'
     AND v1.superseded_by_statement_id = (
       SELECT result_statement_id FROM public.customer_performance_statement_request
       WHERE id = '00000000-0000-0000-0000-00000000f004')
     AND v1.billable_hours = 2.50
     AND v1.snapshot_hash ~ '^[0-9a-f]{64}$'
  FROM public.customer_performance_statement v1
  WHERE v1.version = 1 AND v1.customer_id = '00000000-0000-0000-0000-0000000bb301'
), 'T29a v1 superseded and linked, content unchanged');

SELECT pg_temp.assert((
  SELECT count(*) = 3
  FROM public.customer_performance_statement_item i
  JOIN public.customer_performance_statement v1 ON v1.id = i.statement_id
  WHERE v1.version = 1 AND v1.customer_id = '00000000-0000-0000-0000-0000000bb301'
), 'T29b v1 items remain immutable and complete');

SELECT pg_temp.act_reset();

-- Residuenzaehlung vor dem aeusseren ROLLBACK, fuer T30 sichtbar per NOTICE.
DO $$
DECLARE n bigint;
BEGIN
  SELECT (SELECT count(*) FROM public.customer_performance_statement
           WHERE customer_id = '00000000-0000-0000-0000-0000000bb301')
       + (SELECT count(*) FROM public.customer_activity_billable_override
           WHERE customer_id = '00000000-0000-0000-0000-0000000bb301')
       + (SELECT count(*) FROM public.shared_activity_projection
           WHERE source_id LIKE 'BSF03B-%')
    INTO n;
  RAISE NOTICE 'T30 pre-rollback synthetic rows = %', n;
  IF n = 0 THEN
    RAISE EXCEPTION 'FAIL T30 pre-condition (fixture produced no rows)';
  END IF;
END $$;

ROLLBACK;

-- ---------------------------------------------------------------------------
-- T30: Nach dem einzigen aeusseren ROLLBACK darf kein synthetisches
-- Residuum sichtbar sein. pg_temp bleibt sitzungsweit gueltig; die
-- Nachpruefung ist read-only und startet keine zweite Transaktion.
-- ---------------------------------------------------------------------------
DO $t30$
BEGIN
  IF EXISTS (SELECT 1 FROM public.systemhouse
             WHERE id IN ('00000000-0000-0000-0000-0000000ab301',
                          '00000000-0000-0000-0000-0000000ab302'))
     OR EXISTS (SELECT 1 FROM public.customer
                WHERE id IN ('00000000-0000-0000-0000-0000000bb301',
                             '00000000-0000-0000-0000-0000000bb302',
                             '00000000-0000-0000-0000-0000000bb303'))
     OR EXISTS (SELECT 1 FROM auth.users WHERE email LIKE 'bsf03b-%@example.invalid')
     OR EXISTS (SELECT 1 FROM public.shared_activity_projection
                WHERE source_id LIKE 'BSF03B-%')
     OR EXISTS (SELECT 1 FROM public.shared_work_package_projection
                WHERE source_id LIKE 'BSF03B-%')
     OR EXISTS (SELECT 1 FROM public.shared_project_projection
                WHERE source_id LIKE 'BSF03B-%')
     OR EXISTS (SELECT 1 FROM public.audit_log
                WHERE action LIKE 'performance_statement.%'
                  AND actor_id = '00000000-0000-0000-0000-00000000b303') THEN
    RAISE EXCEPTION 'FAIL T30 no synthetic residue after outer rollback';
  END IF;
  RAISE NOTICE 'PASS T30 no synthetic residue after outer rollback';
END
$t30$;
