-- BSF-02C Phase A — Shared Projection: DDL / Grants / RLS Testartefakt (T01–T30)
-- Issue #88, ADR-0032.
-- Transaktional, fail-fast, nur synthetische IDs und @example.invalid-Identitäten.
-- Ausführung: psql -f supabase/tests/bsf-02c-shared-projection.sql
-- Alle Testdaten werden am Ende mit ROLLBACK verworfen; Assertions brechen bei Fehlern ab.

\set ON_ERROR_STOP on

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.assert(cond boolean, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT cond THEN
    RAISE EXCEPTION 'FAIL %', label;
  END IF;
  RAISE NOTICE 'PASS %', label;
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.assert_denied(stmt text, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASS % (denied: %)', label, SQLERRM;
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL % (statement unexpectedly succeeded)', label;
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.assert_constraint_violation(
  stmt text,
  expected_sqlstate text,
  expected_constraint text,
  label text
)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  got_sqlstate text;
  got_constraint text;
  got_message text;
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS
      got_sqlstate = RETURNED_SQLSTATE,
      got_constraint = CONSTRAINT_NAME,
      got_message = MESSAGE_TEXT;
    IF got_sqlstate = expected_sqlstate AND got_constraint = expected_constraint THEN
      RAISE NOTICE 'PASS % (constraint % / SQLSTATE %)', label, got_constraint, got_sqlstate;
      RETURN;
    END IF;
    RAISE EXCEPTION 'FAIL % (expected % / %, got % / %: %)',
      label, expected_constraint, expected_sqlstate, got_constraint, got_sqlstate, got_message;
  END;
  RAISE EXCEPTION 'FAIL % (statement unexpectedly succeeded)', label;
END; $$;

-- ---------------------------------------------------------------------------
-- Statische Struktur-/Grant-/RLS-Verträge
-- ---------------------------------------------------------------------------

-- T01: drei Projection-Tabellen vorhanden
SELECT pg_temp.assert((
  SELECT count(*) = 3 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
    AND c.relname IN ('shared_project_projection','shared_work_package_projection','shared_activity_projection')
), 'T01 tables exist');

-- T02: fachliche Identity-Unique je Tabelle (systemhouse_id, customer_id, source_id)
SELECT pg_temp.assert((
  SELECT count(*) = 3 FROM pg_constraint
  WHERE conname IN ('shared_project_projection_identity_unique',
                    'shared_work_package_projection_identity_unique',
                    'shared_activity_projection_identity_unique')
), 'T02 identity unique constraints');

-- T03: Composite Customer-/Parent-Integrität
SELECT pg_temp.assert((
  SELECT count(*) = 5 FROM pg_constraint
  WHERE contype = 'f' AND conname IN (
    'shared_project_projection_customer_fk',
    'shared_work_package_projection_customer_fk',
    'shared_work_package_projection_parent_fk',
    'shared_activity_projection_customer_fk',
    'shared_activity_projection_parent_fk')
), 'T03 composite customer/parent FKs');

-- T04: RLS auf allen drei Tabellen aktiv
SELECT pg_temp.assert((
  SELECT bool_and(relrowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('shared_project_projection','shared_work_package_projection','shared_activity_projection')
), 'T04 RLS enabled');

-- T05: PUBLIC ohne Table Grants
SELECT pg_temp.assert((
  SELECT count(*) = 0 FROM information_schema.role_table_grants
  WHERE table_schema='public' AND grantee='PUBLIC'
    AND table_name IN ('shared_project_projection','shared_work_package_projection','shared_activity_projection')
), 'T05 no PUBLIC grants');

-- T06: anon ohne Table Grants
SELECT pg_temp.assert((
  SELECT count(*) = 0 FROM information_schema.role_table_grants
  WHERE table_schema='public' AND grantee='anon'
    AND table_name IN ('shared_project_projection','shared_work_package_projection','shared_activity_projection')
), 'T06 no anon grants');

-- T07: authenticated genau SELECT/INSERT/UPDATE
SELECT pg_temp.assert((
  SELECT count(*) = 9 FROM information_schema.role_table_grants
  WHERE table_schema='public' AND grantee='authenticated'
    AND privilege_type IN ('SELECT','INSERT','UPDATE')
    AND table_name IN ('shared_project_projection','shared_work_package_projection','shared_activity_projection')
), 'T07 authenticated minimal grants');

-- T08: authenticated kein DELETE
SELECT pg_temp.assert((
  SELECT count(*) = 0 FROM information_schema.role_table_grants
  WHERE table_schema='public' AND grantee='authenticated' AND privilege_type='DELETE'
    AND table_name IN ('shared_project_projection','shared_work_package_projection','shared_activity_projection')
), 'T08 authenticated no DELETE');

-- T09: authenticated kein TRUNCATE / keine REFERENCES / TRIGGER
SELECT pg_temp.assert((
  SELECT count(*) = 0 FROM information_schema.role_table_grants
  WHERE table_schema='public' AND grantee='authenticated'
    AND privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
    AND table_name IN ('shared_project_projection','shared_work_package_projection','shared_activity_projection')
), 'T09 authenticated no truncate/references/trigger');

-- T29a: keine DELETE-Policy vorhanden
SELECT pg_temp.assert((
  SELECT count(*) = 0 FROM pg_policies
  WHERE schemaname='public' AND cmd IN ('DELETE','ALL')
    AND tablename IN ('shared_project_projection','shared_work_package_projection','shared_activity_projection')
), 'T29a no DELETE/ALL policy');

-- ---------------------------------------------------------------------------
-- Synthetische Testwelt
-- ---------------------------------------------------------------------------
-- Systemhäuser: SH1 = ...aa01, SH2 = ...aa02
-- Kunden: C1 (SH1), C2 (SH1), C3 (SH2)
-- Benutzer:
--   U_WRITE  ...0001 write@C1, project.edit + activity.edit (teamlead)
--   U_READ   ...0002 read@C1  (viewer)
--   U_NOACC  ...0003 Membership SH1, kein Customer Access (teamlead)
--   U_NOMEM  ...0004 keine Membership (teamlead)
--   U_ENG    ...0005 write@C1, engineer (workpackage.edit + activity.edit, kein project.edit)
--   U_OTHER  ...0006 write@C1+C2, teamlead (fremder Publisher / autorisierter C2-Strukturtest)

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
SELECT u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       u.email, 'x', now(), now(), now(), '{}'::jsonb, '{}'::jsonb
FROM (VALUES
  ('00000000-0000-0000-0000-00000000c001'::uuid, 'bsf02c-write@example.invalid'),
  ('00000000-0000-0000-0000-00000000c002'::uuid, 'bsf02c-read@example.invalid'),
  ('00000000-0000-0000-0000-00000000c003'::uuid, 'bsf02c-noaccess@example.invalid'),
  ('00000000-0000-0000-0000-00000000c004'::uuid, 'bsf02c-nomember@example.invalid'),
  ('00000000-0000-0000-0000-00000000c005'::uuid, 'bsf02c-engineer@example.invalid'),
  ('00000000-0000-0000-0000-00000000c006'::uuid, 'bsf02c-other@example.invalid')
) AS u(id, email);

-- handle_new_user() legt Profile + Default-Rolle an; Rollen deterministisch setzen.
DELETE FROM public.user_roles WHERE user_id IN (
  '00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000c002',
  '00000000-0000-0000-0000-00000000c003','00000000-0000-0000-0000-00000000c004',
  '00000000-0000-0000-0000-00000000c005','00000000-0000-0000-0000-00000000c006');

INSERT INTO public.user_roles (user_id, role) VALUES
  ('00000000-0000-0000-0000-00000000c001','teamlead'),
  ('00000000-0000-0000-0000-00000000c002','viewer'),
  ('00000000-0000-0000-0000-00000000c003','teamlead'),
  ('00000000-0000-0000-0000-00000000c004','teamlead'),
  ('00000000-0000-0000-0000-00000000c005','engineer'),
  ('00000000-0000-0000-0000-00000000c006','teamlead');

UPDATE public.profiles SET status = 'active'
WHERE id IN ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000c002',
             '00000000-0000-0000-0000-00000000c003','00000000-0000-0000-0000-00000000c004',
             '00000000-0000-0000-0000-00000000c005','00000000-0000-0000-0000-00000000c006');

INSERT INTO public.systemhouse (id, name, status) VALUES
  ('00000000-0000-0000-0000-0000000aa001','BSF02C SH1','active'),
  ('00000000-0000-0000-0000-0000000aa002','BSF02C SH2','active');

INSERT INTO public.customer (id, systemhouse_id, name, status) VALUES
  ('00000000-0000-0000-0000-0000000bb001','00000000-0000-0000-0000-0000000aa001','C1','active'),
  ('00000000-0000-0000-0000-0000000bb002','00000000-0000-0000-0000-0000000aa001','C2','active'),
  ('00000000-0000-0000-0000-0000000bb003','00000000-0000-0000-0000-0000000aa002','C3','active');

INSERT INTO public.systemhouse_membership (systemhouse_id, user_id, status) VALUES
  ('00000000-0000-0000-0000-0000000aa001','00000000-0000-0000-0000-00000000c001','active'),
  ('00000000-0000-0000-0000-0000000aa001','00000000-0000-0000-0000-00000000c002','active'),
  ('00000000-0000-0000-0000-0000000aa001','00000000-0000-0000-0000-00000000c003','active'),
  ('00000000-0000-0000-0000-0000000aa001','00000000-0000-0000-0000-00000000c005','active'),
  ('00000000-0000-0000-0000-0000000aa001','00000000-0000-0000-0000-00000000c006','active');

INSERT INTO public.customer_access (systemhouse_id, customer_id, user_id, access_level, status) VALUES
  ('00000000-0000-0000-0000-0000000aa001','00000000-0000-0000-0000-0000000bb001','00000000-0000-0000-0000-00000000c001','write','active'),
  ('00000000-0000-0000-0000-0000000aa001','00000000-0000-0000-0000-0000000bb001','00000000-0000-0000-0000-00000000c002','read','active'),
  ('00000000-0000-0000-0000-0000000aa001','00000000-0000-0000-0000-0000000bb001','00000000-0000-0000-0000-00000000c005','write','active'),
  ('00000000-0000-0000-0000-0000000aa001','00000000-0000-0000-0000-0000000bb001','00000000-0000-0000-0000-00000000c006','write','active'),
  ('00000000-0000-0000-0000-0000000aa001','00000000-0000-0000-0000-0000000bb002','00000000-0000-0000-0000-00000000c006','write','active');

-- Hilfsmakro: Rolle + JWT-Claim setzen
CREATE OR REPLACE FUNCTION pg_temp.act_as(uid uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid::text, 'role','authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.act_reset() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', NULL, true);
END; $$;

-- ---------------------------------------------------------------------------
-- Rollenbasierte Verträge
-- ---------------------------------------------------------------------------

-- T15: Customer Access write + project.edit -> Project INSERT PASS
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c001');
INSERT INTO public.shared_project_projection
  (id, systemhouse_id, customer_id, source_id, name, status, published_by)
VALUES ('00000000-0000-0000-0000-0000000dd001','00000000-0000-0000-0000-0000000aa001',
        '00000000-0000-0000-0000-0000000bb001','P-101','Projekt 101','active',
        '00000000-0000-0000-0000-00000000c001');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.shared_project_projection
  WHERE id='00000000-0000-0000-0000-0000000dd001'), 'T15 project insert with write+project.edit');

-- T16: UPDATE im eigenen Scope PASS, Scope-Verschiebung DENY
UPDATE public.shared_project_projection SET name='Projekt 101b'
 WHERE id='00000000-0000-0000-0000-0000000dd001';
SELECT pg_temp.assert((SELECT name='Projekt 101b' FROM public.shared_project_projection
  WHERE id='00000000-0000-0000-0000-0000000dd001'), 'T16a own-scope update');
SELECT pg_temp.assert_denied(
  $$UPDATE public.shared_project_projection SET customer_id='00000000-0000-0000-0000-0000000bb002'
     WHERE id='00000000-0000-0000-0000-0000000dd001'$$,
  'T16b scope shift denied');

-- T17: WorkPackage mit project.edit + korrektem Parent PASS
INSERT INTO public.shared_work_package_projection
  (id, systemhouse_id, customer_id, source_id, project_ref, parent_link_status, title, published_by)
VALUES ('00000000-0000-0000-0000-0000000ee001','00000000-0000-0000-0000-0000000aa001',
        '00000000-0000-0000-0000-0000000bb001','WP-2041','00000000-0000-0000-0000-0000000dd001',
        'linked','WP 2041','00000000-0000-0000-0000-00000000c001');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.shared_work_package_projection
  WHERE id='00000000-0000-0000-0000-0000000ee001'), 'T17 workpackage insert linked parent');

-- T26a: doppelte fachliche Identity im selben Customer fail-closed
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.shared_project_projection
      (systemhouse_id, customer_id, source_id, name, status, published_by)
    VALUES ('00000000-0000-0000-0000-0000000aa001','00000000-0000-0000-0000-0000000bb001',
            'P-101','Duplikat','active','00000000-0000-0000-0000-00000000c001')$$,
  'T26a duplicate identity denied');

-- T26b/T19 werden mit einem für C2 autorisierten Writer ausgeführt, damit nicht RLS,
-- sondern nachweislich die jeweilige strukturelle Constraint-Grenze den Zugriff stoppt.
SELECT pg_temp.act_reset();
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c006');

SELECT pg_temp.assert_constraint_violation(
  $$INSERT INTO public.shared_project_projection
      (systemhouse_id, customer_id, source_id, name, status, published_by)
    VALUES ('00000000-0000-0000-0000-0000000aa001','00000000-0000-0000-0000-0000000bb002',
            'P-101','Cross-Customer-Kollision','active','00000000-0000-0000-0000-00000000c006')$$,
  '23505',
  'shared_project_projection_source_collision_unique',
  'T26b cross-customer source collision denied by source collision constraint');

-- T19: WorkPackage Parent aus fremdem Customer muss am Composite-FK scheitern.
SELECT pg_temp.assert_constraint_violation(
  $$INSERT INTO public.shared_work_package_projection
      (systemhouse_id, customer_id, source_id, project_ref, parent_link_status, title, published_by)
    VALUES ('00000000-0000-0000-0000-0000000aa001','00000000-0000-0000-0000-0000000bb002',
            'WP-9999','00000000-0000-0000-0000-0000000dd001','linked','Fremder Parent',
            '00000000-0000-0000-0000-00000000c006')$$,
  '23503',
  'shared_work_package_projection_parent_fk',
  'T19 cross-customer parent denied by workpackage parent FK');

SELECT pg_temp.act_reset();
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c001');

-- T20: Activity own engineer + activity.edit + write access PASS
INSERT INTO public.shared_activity_projection
  (id, systemhouse_id, customer_id, source_id, work_package_ref, parent_link_status,
   engineer_id, title, published_by)
VALUES ('00000000-0000-0000-0000-0000000ff001','00000000-0000-0000-0000-0000000aa001',
        '00000000-0000-0000-0000-0000000bb001','A-3001','00000000-0000-0000-0000-0000000ee001',
        'linked','00000000-0000-0000-0000-00000000c001','Tätigkeit 3001',
        '00000000-0000-0000-0000-00000000c001');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.shared_activity_projection
  WHERE id='00000000-0000-0000-0000-0000000ff001'), 'T20 activity insert own engineer');

-- T21: Activity mit fremder engineer_id DENY
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.shared_activity_projection
      (systemhouse_id, customer_id, source_id, parent_link_status, engineer_id, title, published_by)
    VALUES ('00000000-0000-0000-0000-0000000aa001','00000000-0000-0000-0000-0000000bb001',
            'A-3002','none','00000000-0000-0000-0000-00000000c005','Fremdzuschreibung',
            '00000000-0000-0000-0000-00000000c001')$$,
  'T21 foreign engineer_id denied');

-- T22: Activity Parent aus fremdem Customer muss bei gültigem C2-Writer am Composite-FK scheitern.
SELECT pg_temp.act_reset();
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c006');
SELECT pg_temp.assert_constraint_violation(
  $$INSERT INTO public.shared_activity_projection
      (systemhouse_id, customer_id, source_id, work_package_ref, parent_link_status,
       engineer_id, title, published_by)
    VALUES ('00000000-0000-0000-0000-0000000aa001','00000000-0000-0000-0000-0000000bb002',
            'A-3003','00000000-0000-0000-0000-0000000ee001','linked',
            '00000000-0000-0000-0000-00000000c006','Fremder Parent',
            '00000000-0000-0000-0000-00000000c006')$$,
  '23503',
  'shared_activity_projection_parent_fk',
  'T22 cross-customer activity parent denied by activity parent FK');
SELECT pg_temp.act_reset();
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c001');

-- T27: publisher-eigener Soft Withdraw via UPDATE PASS
UPDATE public.shared_project_projection
   SET is_active = false, withdrawn_at = now()
 WHERE id='00000000-0000-0000-0000-0000000dd001';
SELECT pg_temp.assert((SELECT NOT is_active AND withdrawn_at IS NOT NULL
  FROM public.shared_project_projection WHERE id='00000000-0000-0000-0000-0000000dd001'),
  'T27 own soft withdraw');
UPDATE public.shared_project_projection SET is_active = true, withdrawn_at = NULL
 WHERE id='00000000-0000-0000-0000-0000000dd001';

-- T29b: DELETE für authenticated DENY
SELECT pg_temp.assert_denied(
  $$DELETE FROM public.shared_project_projection WHERE id='00000000-0000-0000-0000-0000000dd001'$$,
  'T29b delete denied');

SELECT pg_temp.act_reset();

-- T10: Benutzer ohne Membership READ DENY
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c004');
SELECT pg_temp.assert((SELECT count(*)=0 FROM public.shared_project_projection), 'T10 no membership read deny');
SELECT pg_temp.act_reset();

-- T11: Membership ohne Customer Access READ DENY
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c003');
SELECT pg_temp.assert((SELECT count(*)=0 FROM public.shared_project_projection), 'T11 no customer access read deny');
-- T25: erratene Fremd-ID liefert keine Daten (IDOR)
SELECT pg_temp.assert((SELECT count(*)=0 FROM public.shared_project_projection
  WHERE id='00000000-0000-0000-0000-0000000dd001'), 'T25 IDOR by known id denied');
SELECT pg_temp.act_reset();

-- T12/T13: read access -> SELECT PASS, INSERT DENY
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c002');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.shared_project_projection), 'T12 read access select');
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.shared_project_projection
      (systemhouse_id, customer_id, source_id, name, status, published_by)
    VALUES ('00000000-0000-0000-0000-0000000aa001','00000000-0000-0000-0000-0000000bb001',
            'P-777','Read darf nicht','active','00000000-0000-0000-0000-00000000c002')$$,
  'T13 read access insert denied');
SELECT pg_temp.act_reset();

-- T14/T18: engineer (write access, workpackage.edit + activity.edit, ohne project.edit)
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c005');
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.shared_project_projection
      (systemhouse_id, customer_id, source_id, name, status, published_by)
    VALUES ('00000000-0000-0000-0000-0000000aa001','00000000-0000-0000-0000-0000000bb001',
            'P-778','Ohne project.edit','active','00000000-0000-0000-0000-00000000c005')$$,
  'T14 write without project.edit denied');
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.shared_work_package_projection
      (systemhouse_id, customer_id, source_id, parent_link_status, title, published_by)
    VALUES ('00000000-0000-0000-0000-0000000aa001','00000000-0000-0000-0000-0000000bb001',
            'WP-778','none','workpackage.edit allein','00000000-0000-0000-0000-00000000c005')$$,
  'T18 workpackage.edit alone insufficient');
SELECT pg_temp.act_reset();

-- T28: fremder Publisher kann fremde Zeile nicht ändern/withdrawen
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c006');
UPDATE public.shared_project_projection SET is_active=false, withdrawn_at=now()
 WHERE id='00000000-0000-0000-0000-0000000dd001';
SELECT pg_temp.act_reset();
SELECT pg_temp.assert((SELECT is_active FROM public.shared_project_projection
  WHERE id='00000000-0000-0000-0000-0000000dd001'), 'T28 foreign publisher cannot withdraw');

-- T23/T24: Cross-Systemhouse / Cross-Customer Read DENY
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c001');
SELECT pg_temp.assert((SELECT count(*)=0 FROM public.shared_project_projection
  WHERE systemhouse_id='00000000-0000-0000-0000-0000000aa002'), 'T23 cross-systemhouse read deny');
SELECT pg_temp.assert((SELECT count(*)=0 FROM public.shared_project_projection
  WHERE customer_id='00000000-0000-0000-0000-0000000bb002'), 'T24 cross-customer read deny');
SELECT pg_temp.act_reset();

-- T30: bestehende Sicherheitsbasis außerhalb Scope unverändert
SELECT pg_temp.assert((
  SELECT count(*) = 0 FROM information_schema.role_table_grants
  WHERE table_schema='public' AND grantee IN ('anon','PUBLIC')
    AND table_name IN ('reference_catalog','reference_value','reference_value_history')
), 'T30a SEC-02 reference-data grants unchanged');
SELECT pg_temp.assert((
  SELECT count(*) >= 2 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.prosecdef AND p.proname IN ('avkk_can_write','avkk_people_directory')
), 'T30b AVKK definer functions unchanged');
SELECT pg_temp.assert((
  SELECT bool_and(relrowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('systemhouse','systemhouse_membership','customer','customer_access')
), 'T30c BSF-02B RLS unchanged');

\echo 'PASS BSF-02C T01-T30 completed; rolling back synthetic test data.'
ROLLBACK;
