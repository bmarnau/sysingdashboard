-- BSF-02C Phase B2 — Transaktionale Shared-Projection-Publish-RPC (T31–T51)
-- Issue #88, ADR-0032.
-- Prueft: public.bsf02c_publish_shared_projection_snapshot(uuid,uuid,text,boolean,
--         jsonb,jsonb,jsonb,text[],text[],text[])
--
-- Eigenschaften dieses Artefakts:
--   * aeusserer BEGIN / regulaerer ROLLBACK — es bleiben keine Testdaten zurueck,
--   * fail-fast: jede verletzte Assertion bricht den gesamten Lauf ab,
--   * ausschliesslich synthetische Identitaeten (bsf02c-b2-*@example.invalid),
--   * B2-eigene UUID-/Source-ID-Praefixe, damit keine Kollision mit T01–T30 entsteht,
--   * RLS wird real wirksam geprueft (SET LOCAL ROLE authenticated + request.jwt.claims),
--   * keine Lockerung produktiver Security, keine Migrationsaenderung,
--   * kein Service-Role-Runtime-Pfad; der administrative Harness dient nur dem
--     Aufbau der synthetischen Testwelt und wird vollstaendig zurueckgerollt.
--
-- Ausfuehrung: psql -f supabase/tests/bsf-02c-transactional-publish-rpc.sql
-- (Fuer einen API-SQL-Runner duerfen ausschliesslich die psql-Metakommandos
--  \set und \echo entfallen; alle SQL-Statements bleiben unveraendert.)

\set ON_ERROR_STOP on

BEGIN;

-- ---------------------------------------------------------------------------
-- Assertion-Helfer
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION pg_temp.assert(cond boolean, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL %', label;
  END IF;
  RAISE NOTICE 'PASS %', label;
END; $$;

-- Erwartet eine Abweisung; optional mit exakt erwartetem SQLSTATE.
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
-- T31–T35: statische Funktions-, Grant- und RLS-Vertraege
-- ---------------------------------------------------------------------------

-- T31: Funktion existiert mit exakter Signatur.
SELECT pg_temp.assert((
  SELECT count(*) = 1
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'bsf02c_publish_shared_projection_snapshot'
    AND pg_get_function_identity_arguments(p.oid)
        = 'uuid, uuid, text, boolean, jsonb, jsonb, jsonb, text[], text[], text[]'
), 'T31 function exists with exact signature');

-- T32: SECURITY INVOKER (prosecdef = false) und fixierter search_path.
SELECT pg_temp.assert((
  SELECT p.prosecdef = false AND p.proconfig @> ARRAY['search_path=public']
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'bsf02c_publish_shared_projection_snapshot'
), 'T32 security invoker + pinned search_path');

-- T33: PUBLIC hat kein EXECUTE.
SELECT pg_temp.assert((
  SELECT NOT has_function_privilege('public', p.oid, 'EXECUTE')
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'bsf02c_publish_shared_projection_snapshot'
), 'T33 PUBLIC execute denied');

-- T34: anon hat kein EXECUTE.
SELECT pg_temp.assert((
  SELECT NOT has_function_privilege('anon', p.oid, 'EXECUTE')
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'bsf02c_publish_shared_projection_snapshot'
), 'T34 anon execute denied');

-- T35: authenticated hat EXECUTE; Regression-Guard auf RLS/Policies der Projektionen.
SELECT pg_temp.assert((
  SELECT has_function_privilege('authenticated', p.oid, 'EXECUTE')
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'bsf02c_publish_shared_projection_snapshot'
), 'T35a authenticated execute allowed');

SELECT pg_temp.assert((
  SELECT count(*) = 3 AND bool_and(c.relrowsecurity)
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('shared_project_projection',
                      'shared_work_package_projection',
                      'shared_activity_projection')
), 'T35b RLS still enabled on all three projections');

SELECT pg_temp.assert((
  SELECT count(*) = 0 FROM pg_policies
  WHERE schemaname = 'public' AND cmd IN ('DELETE','ALL')
    AND tablename IN ('shared_project_projection',
                      'shared_work_package_projection',
                      'shared_activity_projection')
), 'T35c no DELETE/ALL policy on projections');

SELECT pg_temp.assert((
  SELECT count(*) = 0 FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND grantee IN ('PUBLIC','anon')
    AND table_name IN ('shared_project_projection',
                       'shared_work_package_projection',
                       'shared_activity_projection')
), 'T35d no PUBLIC/anon table grants on projections');

SELECT pg_temp.assert((
  SELECT count(*) = 0 FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND grantee = 'authenticated'
    AND privilege_type NOT IN ('SELECT','INSERT','UPDATE')
    AND table_name IN ('shared_project_projection',
                       'shared_work_package_projection',
                       'shared_activity_projection')
), 'T35e authenticated limited to SELECT/INSERT/UPDATE');

-- ---------------------------------------------------------------------------
-- Synthetische B2-Testwelt
-- ---------------------------------------------------------------------------
-- Systemhaeuser: SH1 = ...ab201, SH2 = ...ab202
-- Kunden:        C1 (SH1) = ...bb201, C2 (SH1) = ...bb202, C3 (SH2) = ...bb203
-- Benutzer:
--   U_WRITE  ...00b201  teamlead, Membership SH1, write@C1  (project.edit + activity.edit)
--   U_NOACC  ...00b203  teamlead, Membership SH1, kein Customer Access
--   U_NOMEM  ...00b204  teamlead, keine Membership
--   U_ENG    ...00b205  engineer, Membership SH1, write@C1 (activity.edit, kein project.edit)
--   U_OTHER  ...00b206  teamlead, Membership SH1, write@C1 (fremder Publisher)

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
SELECT u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       u.email, 'x', now(), now(), now(), '{}'::jsonb, '{}'::jsonb
FROM (VALUES
  ('00000000-0000-0000-0000-00000000b201'::uuid, 'bsf02c-b2-write@example.invalid'),
  ('00000000-0000-0000-0000-00000000b203'::uuid, 'bsf02c-b2-noaccess@example.invalid'),
  ('00000000-0000-0000-0000-00000000b204'::uuid, 'bsf02c-b2-nomember@example.invalid'),
  ('00000000-0000-0000-0000-00000000b205'::uuid, 'bsf02c-b2-engineer@example.invalid'),
  ('00000000-0000-0000-0000-00000000b206'::uuid, 'bsf02c-b2-other@example.invalid')
) AS u(id, email);

-- handle_new_user() vergibt automatisch eine Default-Rolle; deterministisch neu setzen.
DELETE FROM public.user_roles WHERE user_id IN (
  '00000000-0000-0000-0000-00000000b201','00000000-0000-0000-0000-00000000b203',
  '00000000-0000-0000-0000-00000000b204','00000000-0000-0000-0000-00000000b205',
  '00000000-0000-0000-0000-00000000b206');

INSERT INTO public.user_roles (user_id, role) VALUES
  ('00000000-0000-0000-0000-00000000b201','teamlead'),
  ('00000000-0000-0000-0000-00000000b203','teamlead'),
  ('00000000-0000-0000-0000-00000000b204','teamlead'),
  ('00000000-0000-0000-0000-00000000b205','engineer'),
  ('00000000-0000-0000-0000-00000000b206','teamlead');

UPDATE public.profiles SET status = 'active'
WHERE id IN ('00000000-0000-0000-0000-00000000b201','00000000-0000-0000-0000-00000000b203',
             '00000000-0000-0000-0000-00000000b204','00000000-0000-0000-0000-00000000b205',
             '00000000-0000-0000-0000-00000000b206');

INSERT INTO public.systemhouse (id, name, status) VALUES
  ('00000000-0000-0000-0000-0000000ab201','BSF02C-B2 SH1','active'),
  ('00000000-0000-0000-0000-0000000ab202','BSF02C-B2 SH2','active');

INSERT INTO public.customer (id, systemhouse_id, name, status) VALUES
  ('00000000-0000-0000-0000-0000000bb201','00000000-0000-0000-0000-0000000ab201','BSF02C-B2 C1','active'),
  ('00000000-0000-0000-0000-0000000bb202','00000000-0000-0000-0000-0000000ab201','BSF02C-B2 C2','active'),
  ('00000000-0000-0000-0000-0000000bb203','00000000-0000-0000-0000-0000000ab202','BSF02C-B2 C3','active');

INSERT INTO public.systemhouse_membership (systemhouse_id, user_id, status) VALUES
  ('00000000-0000-0000-0000-0000000ab201','00000000-0000-0000-0000-00000000b201','active'),
  ('00000000-0000-0000-0000-0000000ab201','00000000-0000-0000-0000-00000000b203','active'),
  ('00000000-0000-0000-0000-0000000ab201','00000000-0000-0000-0000-00000000b205','active'),
  ('00000000-0000-0000-0000-0000000ab201','00000000-0000-0000-0000-00000000b206','active');

INSERT INTO public.customer_access (systemhouse_id, customer_id, user_id, access_level, status) VALUES
  ('00000000-0000-0000-0000-0000000ab201','00000000-0000-0000-0000-0000000bb201','00000000-0000-0000-0000-00000000b201','write','active'),
  ('00000000-0000-0000-0000-0000000ab201','00000000-0000-0000-0000-0000000bb201','00000000-0000-0000-0000-00000000b205','write','active'),
  ('00000000-0000-0000-0000-0000000ab201','00000000-0000-0000-0000-0000000bb201','00000000-0000-0000-0000-00000000b206','write','active');

-- Rollen-/JWT-Simulation (identisch zum abgenommenen T01–T30-Pattern).
CREATE OR REPLACE FUNCTION pg_temp.act_as(uid uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', uid::text, 'role','authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.act_anonymous()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', NULL, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.act_reset() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', NULL, true);
END; $$;

-- ---------------------------------------------------------------------------
-- T36–T40: Fail-closed-Vertraege (Session, Scope, Modus)
-- ---------------------------------------------------------------------------

-- T36: kein auth.uid() -> fail closed.
SELECT pg_temp.act_anonymous();
SELECT pg_temp.assert_denied(
  $$SELECT public.bsf02c_publish_shared_projection_snapshot(
      '00000000-0000-0000-0000-0000000ab201'::uuid,
      '00000000-0000-0000-0000-0000000bb201'::uuid,
      'structure', true, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      '{}'::text[], '{}'::text[], '{}'::text[])$$,
  '42501', 'T36 unauthenticated call denied');
SELECT pg_temp.act_reset();

-- T37: keine aktive Systemhouse-Membership -> DENY.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000b204');
SELECT pg_temp.assert_denied(
  $$SELECT public.bsf02c_publish_shared_projection_snapshot(
      '00000000-0000-0000-0000-0000000ab201'::uuid,
      '00000000-0000-0000-0000-0000000bb201'::uuid,
      'structure', true, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      '{}'::text[], '{}'::text[], '{}'::text[])$$,
  '42501', 'T37 missing systemhouse membership denied');
SELECT pg_temp.act_reset();

-- T38: Membership vorhanden, aber kein Customer-Write -> DENY.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000b203');
SELECT pg_temp.assert_denied(
  $$SELECT public.bsf02c_publish_shared_projection_snapshot(
      '00000000-0000-0000-0000-0000000ab201'::uuid,
      '00000000-0000-0000-0000-0000000bb201'::uuid,
      'structure', true, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      '{}'::text[], '{}'::text[], '{}'::text[])$$,
  '42501', 'T38 missing customer write access denied');
SELECT pg_temp.act_reset();

-- T39: structure ohne project.edit (Engineer) -> DENY.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000b205');
SELECT pg_temp.assert_denied(
  $$SELECT public.bsf02c_publish_shared_projection_snapshot(
      '00000000-0000-0000-0000-0000000ab201'::uuid,
      '00000000-0000-0000-0000-0000000bb201'::uuid,
      'structure', true, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      '{}'::text[], '{}'::text[], '{}'::text[])$$,
  '42501', 'T39 structure mode without project.edit denied');

-- T40a: activities-Modus mit Struktur-Payload -> DENY.
SELECT pg_temp.assert_denied(
  $$SELECT public.bsf02c_publish_shared_projection_snapshot(
      '00000000-0000-0000-0000-0000000ab201'::uuid,
      '00000000-0000-0000-0000-0000000bb201'::uuid,
      'activities', true,
      '[{"source_id":"BSF02C-B2-P-X","name":"X"}]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      '{}'::text[], '{}'::text[], '{}'::text[])$$,
  '42501', 'T40a activities mode with project payload denied');

-- T40b: activities-Modus mit Struktur-Reconciliation -> DENY.
SELECT pg_temp.assert_denied(
  $$SELECT public.bsf02c_publish_shared_projection_snapshot(
      '00000000-0000-0000-0000-0000000ab201'::uuid,
      '00000000-0000-0000-0000-0000000bb201'::uuid,
      'activities', true, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      ARRAY['BSF02C-B2-P-1']::text[], '{}'::text[], '{}'::text[])$$,
  '42501', 'T40b activities mode with structure reconciliation denied');

-- T40c: snapshot_complete = false -> fail closed.
SELECT pg_temp.assert_denied(
  $$SELECT public.bsf02c_publish_shared_projection_snapshot(
      '00000000-0000-0000-0000-0000000ab201'::uuid,
      '00000000-0000-0000-0000-0000000bb201'::uuid,
      'activities', false, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      '{}'::text[], '{}'::text[], '{}'::text[])$$,
  '22023', 'T40c incomplete snapshot denied');
SELECT pg_temp.act_reset();

-- ---------------------------------------------------------------------------
-- Struktur-Basispublish durch U_WRITE (Voraussetzung fuer T41, T46–T50)
-- ---------------------------------------------------------------------------

SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000b201');

SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ab201'::uuid,
  '00000000-0000-0000-0000-0000000bb201'::uuid,
  'structure', true,
  '[{"source_id":"BSF02C-B2-P-1","name":"B2 Projekt 1","status":"active","source_hash":"h1"}]'::jsonb,
  '[{"source_id":"BSF02C-B2-WP-1","parent_link_status":"linked","project_source_id":"BSF02C-B2-P-1","title":"B2 WP 1","status":"active","priority":"normal","source_hash":"w1"}]'::jsonb,
  '[]'::jsonb,
  ARRAY['BSF02C-B2-P-1']::text[], ARRAY['BSF02C-B2-WP-1']::text[], '{}'::text[]);

SELECT pg_temp.assert((
  SELECT count(*) = 1 FROM public.shared_project_projection
  WHERE source_id = 'BSF02C-B2-P-1' AND is_active
    AND published_by = '00000000-0000-0000-0000-00000000b201'
    AND source_revision = 1
), 'T-base project published');

-- Parent-Aufloesung: WP verweist serverseitig auf das Projekt im gleichen Scope.
SELECT pg_temp.assert((
  SELECT wp.project_ref = p.id AND wp.parent_link_status = 'linked'
  FROM public.shared_work_package_projection wp
  JOIN public.shared_project_projection p ON p.source_id = 'BSF02C-B2-P-1'
  WHERE wp.source_id = 'BSF02C-B2-WP-1'
), 'T-base server-side parent resolution');

-- T49: gleicher source_hash -> source_revision bleibt stabil.
SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ab201'::uuid,
  '00000000-0000-0000-0000-0000000bb201'::uuid,
  'structure', true,
  '[{"source_id":"BSF02C-B2-P-1","name":"B2 Projekt 1","status":"active","source_hash":"h1"}]'::jsonb,
  '[{"source_id":"BSF02C-B2-WP-1","parent_link_status":"linked","project_source_id":"BSF02C-B2-P-1","title":"B2 WP 1","status":"active","priority":"normal","source_hash":"w1"}]'::jsonb,
  '[]'::jsonb,
  ARRAY['BSF02C-B2-P-1']::text[], ARRAY['BSF02C-B2-WP-1']::text[], '{}'::text[]);

SELECT pg_temp.assert((
  SELECT source_revision = 1 FROM public.shared_project_projection
  WHERE source_id = 'BSF02C-B2-P-1'
), 'T49 unchanged source_hash keeps source_revision stable');

-- T50: geaenderter source_hash -> source_revision exakt +1.
SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ab201'::uuid,
  '00000000-0000-0000-0000-0000000bb201'::uuid,
  'structure', true,
  '[{"source_id":"BSF02C-B2-P-1","name":"B2 Projekt 1b","status":"active","source_hash":"h2"}]'::jsonb,
  '[{"source_id":"BSF02C-B2-WP-1","parent_link_status":"linked","project_source_id":"BSF02C-B2-P-1","title":"B2 WP 1","status":"active","priority":"normal","source_hash":"w1"}]'::jsonb,
  '[]'::jsonb,
  ARRAY['BSF02C-B2-P-1']::text[], ARRAY['BSF02C-B2-WP-1']::text[], '{}'::text[]);

SELECT pg_temp.assert((
  SELECT source_revision = 2 AND name = 'B2 Projekt 1b'
  FROM public.shared_project_projection WHERE source_id = 'BSF02C-B2-P-1'
), 'T50 changed source_hash increments source_revision by exactly 1');

-- T46: beobachtete eigene Source bleibt aktiv.
SELECT pg_temp.assert((
  SELECT is_active AND withdrawn_at IS NULL
  FROM public.shared_project_projection WHERE source_id = 'BSF02C-B2-P-1'
), 'T46 observed own source stays active');

-- T44: Cross-Customer (kein Zugriff auf C2) -> DENY.
SELECT pg_temp.assert_denied(
  $$SELECT public.bsf02c_publish_shared_projection_snapshot(
      '00000000-0000-0000-0000-0000000ab201'::uuid,
      '00000000-0000-0000-0000-0000000bb202'::uuid,
      'structure', true, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      '{}'::text[], '{}'::text[], '{}'::text[])$$,
  '42501', 'T44 cross-customer publish denied');

-- T45: Cross-Systemhouse (SH2/C3) -> DENY.
SELECT pg_temp.assert_denied(
  $$SELECT public.bsf02c_publish_shared_projection_snapshot(
      '00000000-0000-0000-0000-0000000ab202'::uuid,
      '00000000-0000-0000-0000-0000000bb203'::uuid,
      'structure', true, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      '{}'::text[], '{}'::text[], '{}'::text[])$$,
  '42501', 'T45 cross-systemhouse publish denied');

SELECT pg_temp.act_reset();

-- ---------------------------------------------------------------------------
-- T41–T43: Activities-Modus (Engineer)
-- ---------------------------------------------------------------------------

SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000b205');

-- T41: Engineer publiziert eigene Activity gegen sichtbares WP im gleichen Scope.
SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ab201'::uuid,
  '00000000-0000-0000-0000-0000000bb201'::uuid,
  'activities', true, '[]'::jsonb, '[]'::jsonb,
  '[{"source_id":"BSF02C-B2-A-1","parent_link_status":"linked","work_package_source_id":"BSF02C-B2-WP-1","engineer_id":"00000000-0000-0000-0000-00000000b205","title":"B2 Activity 1","activity_date":"2026-09-01","duration_hours":1.5,"billable":true,"billing_status":"open","source_hash":"a1"}]'::jsonb,
  '{}'::text[], '{}'::text[], ARRAY['BSF02C-B2-A-1']::text[]);

SELECT pg_temp.assert((
  SELECT a.is_active
     AND a.engineer_id = '00000000-0000-0000-0000-00000000b205'
     AND a.published_by = '00000000-0000-0000-0000-00000000b205'
     AND a.work_package_ref = wp.id
  FROM public.shared_activity_projection a
  JOIN public.shared_work_package_projection wp ON wp.source_id = 'BSF02C-B2-WP-1'
  WHERE a.source_id = 'BSF02C-B2-A-1'
), 'T41 engineer publishes own activity against visible parent work package');

-- T42: fremde engineer_id -> DENY.
SELECT pg_temp.assert_denied(
  $$SELECT public.bsf02c_publish_shared_projection_snapshot(
      '00000000-0000-0000-0000-0000000ab201'::uuid,
      '00000000-0000-0000-0000-0000000bb201'::uuid,
      'activities', true, '[]'::jsonb, '[]'::jsonb,
      '[{"source_id":"BSF02C-B2-A-2","parent_link_status":"none","engineer_id":"00000000-0000-0000-0000-00000000b201","title":"Fremde Identitaet","activity_date":"2026-09-01","duration_hours":1,"billable":false,"billing_status":"open","source_hash":"a2"}]'::jsonb,
      '{}'::text[], '{}'::text[], ARRAY['BSF02C-B2-A-1','BSF02C-B2-A-2']::text[])$$,
  '42501', 'T42 foreign engineer_id denied');

-- T43: nicht aufloesbarer Parent -> DENY.
SELECT pg_temp.assert_denied(
  $$SELECT public.bsf02c_publish_shared_projection_snapshot(
      '00000000-0000-0000-0000-0000000ab201'::uuid,
      '00000000-0000-0000-0000-0000000bb201'::uuid,
      'activities', true, '[]'::jsonb, '[]'::jsonb,
      '[{"source_id":"BSF02C-B2-A-3","parent_link_status":"linked","work_package_source_id":"BSF02C-B2-WP-DOES-NOT-EXIST","engineer_id":"00000000-0000-0000-0000-00000000b205","title":"Ohne Parent","activity_date":"2026-09-01","duration_hours":1,"billable":false,"billing_status":"open","source_hash":"a3"}]'::jsonb,
      '{}'::text[], '{}'::text[], ARRAY['BSF02C-B2-A-1','BSF02C-B2-A-3']::text[])$$,
  '42501', 'T43 unresolvable parent denied');

-- Die abgewiesenen Aufrufe duerfen die bestehende eigene Activity nicht veraendert haben.
SELECT pg_temp.assert((
  SELECT is_active AND source_revision = 1
  FROM public.shared_activity_projection WHERE source_id = 'BSF02C-B2-A-1'
), 'T43b denied calls left existing activity untouched');

SELECT pg_temp.act_reset();

-- ---------------------------------------------------------------------------
-- T48: fremder Publisher wird nie withdrawn oder ueberschrieben
-- ---------------------------------------------------------------------------

SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000b206');

SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ab201'::uuid,
  '00000000-0000-0000-0000-0000000bb201'::uuid,
  'structure', true,
  '[{"source_id":"BSF02C-B2-P-9","name":"B2 Projekt 9","status":"active","source_hash":"h9"}]'::jsonb,
  '[]'::jsonb, '[]'::jsonb,
  ARRAY['BSF02C-B2-P-9']::text[], '{}'::text[], '{}'::text[]);

SELECT pg_temp.assert((
  SELECT is_active AND withdrawn_at IS NULL AND source_revision = 2
     AND published_by = '00000000-0000-0000-0000-00000000b201'
  FROM public.shared_project_projection WHERE source_id = 'BSF02C-B2-P-1'
), 'T48a foreign publisher row neither withdrawn nor overwritten');

SELECT pg_temp.assert((
  SELECT is_active FROM public.shared_activity_projection WHERE source_id = 'BSF02C-B2-A-1'
), 'T48b foreign engineer activity not withdrawn');

-- Fremde Source-ID darf nicht uebernommen werden.
SELECT pg_temp.assert_denied(
  $$SELECT public.bsf02c_publish_shared_projection_snapshot(
      '00000000-0000-0000-0000-0000000ab201'::uuid,
      '00000000-0000-0000-0000-0000000bb201'::uuid,
      'structure', true,
      '[{"source_id":"BSF02C-B2-P-1","name":"Uebernahmeversuch","status":"active","source_hash":"hx"}]'::jsonb,
      '[]'::jsonb, '[]'::jsonb,
      ARRAY['BSF02C-B2-P-1','BSF02C-B2-P-9']::text[], '{}'::text[], '{}'::text[])$$,
  '42501', 'T48c takeover of foreign publisher source denied');

SELECT pg_temp.act_reset();

-- ---------------------------------------------------------------------------
-- T47: fehlende eigene Source wird SOFT withdrawn (kein Hard Delete)
-- ---------------------------------------------------------------------------

SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000b201');

SELECT public.bsf02c_publish_shared_projection_snapshot(
  '00000000-0000-0000-0000-0000000ab201'::uuid,
  '00000000-0000-0000-0000-0000000bb201'::uuid,
  'structure', true, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  '{}'::text[], '{}'::text[], '{}'::text[]);

SELECT pg_temp.assert((
  SELECT count(*) = 1 FROM public.shared_project_projection
  WHERE source_id = 'BSF02C-B2-P-1' AND is_active = false AND withdrawn_at IS NOT NULL
), 'T47a missing own project soft withdrawn, row still present');

SELECT pg_temp.assert((
  SELECT count(*) = 1 FROM public.shared_work_package_projection
  WHERE source_id = 'BSF02C-B2-WP-1' AND is_active = false AND withdrawn_at IS NOT NULL
), 'T47b missing own work package soft withdrawn, row still present');

SELECT pg_temp.assert((
  SELECT is_active AND withdrawn_at IS NULL FROM public.shared_project_projection
  WHERE source_id = 'BSF02C-B2-P-9'
), 'T47c other publisher row untouched by reconciliation');

SELECT pg_temp.act_reset();

-- ---------------------------------------------------------------------------
-- T51: echter Atomizitaetsnachweis innerhalb EINER RPC-Ausfuehrung
-- ---------------------------------------------------------------------------
-- Ein Payload enthaelt einen gueltigen fruehen Project-Write und danach einen
-- absichtlich ungueltigen WorkPackage-Schritt (nicht aufloesbarer Parent).
-- Der Fehler wird in einem PL/pgSQL-Subblock abgefangen; unmittelbar danach —
-- NOCH VOR dem aeusseren ROLLBACK — wird geprueft, dass der fruehe Write
-- nicht existiert.

CREATE OR REPLACE FUNCTION pg_temp.t51_atomic_rollback()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  got_sqlstate text;
  got_message text;
  leftover integer;
BEGIN
  BEGIN
    PERFORM public.bsf02c_publish_shared_projection_snapshot(
      '00000000-0000-0000-0000-0000000ab201'::uuid,
      '00000000-0000-0000-0000-0000000bb201'::uuid,
      'structure', true,
      '[{"source_id":"BSF02C-B2-P-T51","name":"Atomizitaet","status":"active","source_hash":"t51"}]'::jsonb,
      '[{"source_id":"BSF02C-B2-WP-T51","parent_link_status":"linked","project_source_id":"BSF02C-B2-MISSING-PARENT","title":"Ungueltig","source_hash":"t51w"}]'::jsonb,
      '[]'::jsonb,
      ARRAY['BSF02C-B2-P-T51']::text[], ARRAY['BSF02C-B2-WP-T51']::text[], '{}'::text[]);
    RAISE EXCEPTION 'FAIL T51 (rpc unexpectedly succeeded)';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS got_sqlstate = RETURNED_SQLSTATE, got_message = MESSAGE_TEXT;
    IF got_message LIKE 'FAIL T51%' THEN
      RAISE EXCEPTION '%', got_message;
    END IF;
    IF got_sqlstate <> '42501' THEN
      RAISE EXCEPTION 'FAIL T51 (unexpected SQLSTATE % / %)', got_sqlstate, got_message;
    END IF;
    RAISE NOTICE 'T51 rpc failed as designed (% / %)', got_sqlstate, got_message;
  END;

  -- Direkte Pruefung nach der abgefangenen Ausnahme, vor jedem aeusseren ROLLBACK.
  SELECT count(*) INTO leftover FROM public.shared_project_projection
   WHERE source_id = 'BSF02C-B2-P-T51';
  IF leftover <> 0 THEN
    RAISE EXCEPTION 'FAIL T51 (early project write survived failed rpc: % rows)', leftover;
  END IF;

  SELECT count(*) INTO leftover FROM public.shared_work_package_projection
   WHERE source_id = 'BSF02C-B2-WP-T51';
  IF leftover <> 0 THEN
    RAISE EXCEPTION 'FAIL T51 (partial work package write survived failed rpc)';
  END IF;

  RAISE NOTICE 'PASS T51 atomic rollback within a single rpc execution';
END; $$;

SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000b201');
SELECT pg_temp.t51_atomic_rollback();
SELECT pg_temp.act_reset();

-- ---------------------------------------------------------------------------
-- Abschluss: alle synthetischen Testdaten verwerfen.
-- ---------------------------------------------------------------------------

\echo 'PASS BSF-02C T31-T51 completed; rolling back synthetic test data.'
ROLLBACK;
