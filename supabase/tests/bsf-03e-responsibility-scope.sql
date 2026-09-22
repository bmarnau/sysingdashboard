-- BSF-03E P0 — AVKK Responsibility Scope Hardening (T01–T22)
-- Issue #63. TDD-Vertrag: auf Vor-P0-Stand absichtlich RED.
-- Transaktional, fail-fast, nur synthetische IDs / @example.invalid.
\set ON_ERROR_STOP on
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.assert(cond boolean, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FAIL %', label; END IF;
  RAISE NOTICE 'PASS %', label;
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.assert_denied(stmt text, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASS % (denied: %)', label, SQLERRM; RETURN;
  END;
  RAISE EXCEPTION 'FAIL % statement unexpectedly succeeded', label;
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.act_as(uid uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub',uid::text,'role','authenticated')::text,
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

-- ---------------------------------------------------------------------------
-- P0 RED/static contract
-- ---------------------------------------------------------------------------

SELECT pg_temp.assert((
  SELECT count(*) = 2
  FROM information_schema.columns
  WHERE table_schema='public'
    AND table_name='avkk_subject'
    AND column_name IN ('systemhouse_id','customer_id')
    AND data_type='uuid'
), 'T01 avkk_subject has systemhouse/customer scope columns');

SELECT pg_temp.assert(EXISTS (
  SELECT 1
  FROM pg_constraint c
  JOIN pg_class t ON t.oid=c.conrelid
  JOIN pg_namespace n ON n.oid=t.relnamespace
  WHERE n.nspname='public'
    AND t.relname='avkk_subject'
    AND c.contype='c'
    AND pg_get_constraintdef(c.oid) ILIKE '%systemhouse_id%'
    AND pg_get_constraintdef(c.oid) ILIKE '%customer_id%'
), 'T02 subject scope columns are both null or both set');

SELECT pg_temp.assert((
  SELECT count(*) >= 2
  FROM pg_indexes
  WHERE schemaname='public'
    AND tablename='avkk_subject'
    AND indexdef ILIKE '%UNIQUE%'
    AND (
      (indexdef ILIKE '%systemhouse_id%' AND indexdef ILIKE '%subject_type%' AND indexdef ILIKE '%subject_id%')
      OR (indexdef ILIKE '%subject_type%' AND indexdef ILIKE '%subject_id%' AND indexdef ILIKE '%WHERE%systemhouse_id IS NULL%')
    )
), 'T03 scoped + legacy uniqueness are explicit');

SELECT pg_temp.assert(
  to_regprocedure('public.bsf03e_avkk_responsibility_candidates(uuid)') IS NOT NULL,
  'T04 scoped candidate RPC exists'
);

SELECT pg_temp.assert((
  SELECT p.prosecdef = false
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.oid=to_regprocedure('public.bsf03e_avkk_responsibility_candidates(uuid)')
), 'T05 public candidate RPC is SECURITY INVOKER');

SELECT pg_temp.assert(
  pg_get_function_result(to_regprocedure('public.bsf03e_avkk_responsibility_candidates(uuid)')::oid)
    !~* '(email|phone|mfa|profile_image|first_name|last_name)',
  'T06 candidate RPC is data-minimized'
);

SELECT pg_temp.assert(
  has_function_privilege('authenticated','public.bsf03e_avkk_responsibility_candidates(uuid)','EXECUTE')
  AND NOT has_function_privilege('anon','public.bsf03e_avkk_responsibility_candidates(uuid)','EXECUTE'),
  'T07 candidate RPC authenticated-only'
);

-- ---------------------------------------------------------------------------
-- Synthetic scope world
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
SELECT id, '00000000-0000-0000-0000-000000000000',
       'authenticated','authenticated',email,'x',now(),now(),now(),'{}','{}'
FROM (VALUES
  ('00000000-0000-0000-0000-00000000e501'::uuid,'bsf03e-teamlead@example.invalid'),
  ('00000000-0000-0000-0000-00000000e502'::uuid,'bsf03e-projectmanager@example.invalid'),
  ('00000000-0000-0000-0000-00000000e503'::uuid,'bsf03e-engineer@example.invalid'),
  ('00000000-0000-0000-0000-00000000e504'::uuid,'bsf03e-viewer@example.invalid'),
  ('00000000-0000-0000-0000-00000000e505'::uuid,'bsf03e-other-sh@example.invalid'),
  ('00000000-0000-0000-0000-00000000e506'::uuid,'bsf03e-readonly@example.invalid')
) u(id,email);

DELETE FROM public.user_roles
WHERE user_id BETWEEN '00000000-0000-0000-0000-00000000e501'::uuid
                  AND '00000000-0000-0000-0000-00000000e506'::uuid;

INSERT INTO public.user_roles(user_id,role) VALUES
 ('00000000-0000-0000-0000-00000000e501','teamlead'),
 ('00000000-0000-0000-0000-00000000e502','projectmanager'),
 ('00000000-0000-0000-0000-00000000e503','engineer'),
 ('00000000-0000-0000-0000-00000000e504','viewer'),
 ('00000000-0000-0000-0000-00000000e505','teamlead'),
 ('00000000-0000-0000-0000-00000000e506','projectmanager');

UPDATE public.profiles
SET status='active',
    display_name=CASE id
      WHEN '00000000-0000-0000-0000-00000000e501' THEN 'E3 Teamlead'
      WHEN '00000000-0000-0000-0000-00000000e502' THEN 'E3 Projektleitung'
      WHEN '00000000-0000-0000-0000-00000000e503' THEN 'E3 Engineer'
      WHEN '00000000-0000-0000-0000-00000000e504' THEN 'E3 Viewer'
      WHEN '00000000-0000-0000-0000-00000000e505' THEN 'E3 Fremd SH'
      ELSE 'E3 Readonly PM'
    END
WHERE id BETWEEN '00000000-0000-0000-0000-00000000e501'::uuid
             AND '00000000-0000-0000-0000-00000000e506'::uuid;

INSERT INTO public.systemhouse(id,name,status) VALUES
 ('00000000-0000-0000-0000-0000000ae501','E3 SH1','active'),
 ('00000000-0000-0000-0000-0000000ae502','E3 SH2','active');

INSERT INTO public.customer(id,systemhouse_id,name,status) VALUES
 ('00000000-0000-0000-0000-0000000be501','00000000-0000-0000-0000-0000000ae501','E3 C1','active'),
 ('00000000-0000-0000-0000-0000000be502','00000000-0000-0000-0000-0000000ae501','E3 C2','active'),
 ('00000000-0000-0000-0000-0000000be503','00000000-0000-0000-0000-0000000ae502','E3 C3','active');

INSERT INTO public.systemhouse_membership(systemhouse_id,user_id,status) VALUES
 ('00000000-0000-0000-0000-0000000ae501','00000000-0000-0000-0000-00000000e501','active'),
 ('00000000-0000-0000-0000-0000000ae501','00000000-0000-0000-0000-00000000e502','active'),
 ('00000000-0000-0000-0000-0000000ae501','00000000-0000-0000-0000-00000000e503','active'),
 ('00000000-0000-0000-0000-0000000ae501','00000000-0000-0000-0000-00000000e504','active'),
 ('00000000-0000-0000-0000-0000000ae502','00000000-0000-0000-0000-00000000e505','active'),
 ('00000000-0000-0000-0000-0000000ae501','00000000-0000-0000-0000-00000000e506','active');

INSERT INTO public.customer_access(systemhouse_id,customer_id,user_id,access_level,status) VALUES
 ('00000000-0000-0000-0000-0000000ae501','00000000-0000-0000-0000-0000000be501','00000000-0000-0000-0000-00000000e501','write','active'),
 ('00000000-0000-0000-0000-0000000ae501','00000000-0000-0000-0000-0000000be501','00000000-0000-0000-0000-00000000e502','write','active'),
 ('00000000-0000-0000-0000-0000000ae501','00000000-0000-0000-0000-0000000be501','00000000-0000-0000-0000-00000000e503','write','active'),
 ('00000000-0000-0000-0000-0000000ae501','00000000-0000-0000-0000-0000000be501','00000000-0000-0000-0000-00000000e504','read','active'),
 ('00000000-0000-0000-0000-0000000ae501','00000000-0000-0000-0000-0000000be501','00000000-0000-0000-0000-00000000e506','read','active'),
 ('00000000-0000-0000-0000-0000000ae502','00000000-0000-0000-0000-0000000be503','00000000-0000-0000-0000-00000000e505','write','active');

-- Seed authoritative shared projections under owner context.
INSERT INTO public.shared_project_projection
 (id,systemhouse_id,customer_id,source_id,name,status,published_by)
VALUES
 ('00000000-0000-0000-0000-0000000ce501','00000000-0000-0000-0000-0000000ae501','00000000-0000-0000-0000-0000000be501','E3-P-1','E3 Project 1','active','00000000-0000-0000-0000-00000000e501'),
 ('00000000-0000-0000-0000-0000000ce502','00000000-0000-0000-0000-0000000ae502','00000000-0000-0000-0000-0000000be503','E3-P-2','E3 Project 2','active','00000000-0000-0000-0000-00000000e505');

INSERT INTO public.shared_work_package_projection
 (id,systemhouse_id,customer_id,source_id,project_ref,project_source_id,parent_link_status,title,status,published_by)
VALUES
 ('00000000-0000-0000-0000-0000000de501','00000000-0000-0000-0000-0000000ae501','00000000-0000-0000-0000-0000000be501','E3-WP-1','00000000-0000-0000-0000-0000000ce501','E3-P-1','linked','E3 WP 1','active','00000000-0000-0000-0000-00000000e501');

-- Scoped AVKK subjects must match the authoritative projection scope.
INSERT INTO public.avkk_subject
 (id,subject_type,subject_id,subject_title_snapshot,status,systemhouse_id,customer_id,created_by,updated_by)
VALUES
 ('00000000-0000-0000-0000-0000000ee501','project','E3-P-1','E3 Project 1','active',
  '00000000-0000-0000-0000-0000000ae501','00000000-0000-0000-0000-0000000be501',
  '00000000-0000-0000-0000-00000000e501','00000000-0000-0000-0000-00000000e501'),
 ('00000000-0000-0000-0000-0000000ee502','workpackage','E3-WP-1','E3 WP 1','active',
  '00000000-0000-0000-0000-0000000ae501','00000000-0000-0000-0000-0000000be501',
  '00000000-0000-0000-0000-00000000e501','00000000-0000-0000-0000-00000000e501');

-- Legacy row remains valid but deliberately outside BSF-03E.
INSERT INTO public.avkk_subject
 (id,subject_type,subject_id,subject_title_snapshot,status,created_by,updated_by)
VALUES
 ('00000000-0000-0000-0000-0000000ee599','project','E3-LEGACY','Legacy','active',
  '00000000-0000-0000-0000-00000000e501','00000000-0000-0000-0000-00000000e501');

-- Invalid scoped activity/measure or mismatched projection scope must fail.
SELECT pg_temp.assert_denied(
 $$INSERT INTO public.avkk_subject
   (subject_type,subject_id,subject_title_snapshot,status,systemhouse_id,customer_id,created_by,updated_by)
   VALUES ('activity','E3-A-1','Activity','active',
           '00000000-0000-0000-0000-0000000ae501','00000000-0000-0000-0000-0000000be501',
           '00000000-0000-0000-0000-00000000e501','00000000-0000-0000-0000-00000000e501')$$,
 'T08 scoped activity denied');

SELECT pg_temp.assert_denied(
 $$INSERT INTO public.avkk_subject
   (subject_type,subject_id,subject_title_snapshot,status,systemhouse_id,customer_id,created_by,updated_by)
   VALUES ('project','E3-P-1','Wrong customer','active',
           '00000000-0000-0000-0000-0000000ae501','00000000-0000-0000-0000-0000000be502',
           '00000000-0000-0000-0000-00000000e501','00000000-0000-0000-0000-00000000e501')$$,
 'T09 mismatched projection scope denied');

-- ---------------------------------------------------------------------------
-- RLS / direct Data API behavior
-- ---------------------------------------------------------------------------

SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000e501');
SELECT pg_temp.assert(
  (SELECT count(*)=2 FROM public.avkk_subject WHERE id IN (
    '00000000-0000-0000-0000-0000000ee501','00000000-0000-0000-0000-0000000ee502'
  )),
  'T10 teamlead sees scoped own-customer subjects'
);

SELECT pg_temp.assert((
  SELECT count(*) >= 3
  FROM public.bsf03e_avkk_responsibility_candidates('00000000-0000-0000-0000-0000000ee501')
), 'T11 scoped candidate list available to teamlead');

SELECT pg_temp.assert(NOT EXISTS (
  SELECT 1
  FROM public.bsf03e_avkk_responsibility_candidates('00000000-0000-0000-0000-0000000ee501')
  WHERE user_id='00000000-0000-0000-0000-00000000e505'
), 'T12 foreign-systemhouse candidate excluded');

SELECT pg_temp.assert_denied(
 $$SELECT * FROM public.bsf03e_avkk_responsibility_candidates('00000000-0000-0000-0000-0000000ee599')$$,
 'T13 legacy subject is not a BSF-03E candidate scope'
);

-- Direct responsibility mutation in scoped subject: manager + write PASS.
INSERT INTO public.avkk_responsibility
 (id,avkk_subject_id,person_id,role_value_id,role_key_snapshot,role_label_snapshot,
  note,created_by,updated_by)
SELECT
 '00000000-0000-0000-0000-0000000fe501',
 '00000000-0000-0000-0000-0000000ee501',
 '00000000-0000-0000-0000-00000000e503',
 rv.id,rv.key,rv.label,'',auth.uid(),auth.uid()
FROM public.reference_value rv
JOIN public.reference_catalog rc ON rc.id=rv.catalog_id
WHERE rc.key='avkk.responsibility_role' AND rv.key='owner';

SELECT pg_temp.assert(
  EXISTS (SELECT 1 FROM public.avkk_responsibility WHERE id='00000000-0000-0000-0000-0000000fe501'),
  'T14 scoped direct mutation allowed only in authorized scope'
);
SELECT pg_temp.act_reset();

-- Read-only PM: may read, may not assign despite avkk.responsibility.assign because no write access.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000e506');
SELECT pg_temp.assert(
  EXISTS (SELECT 1 FROM public.avkk_subject WHERE id='00000000-0000-0000-0000-0000000ee501'),
  'T15 read-access projectmanager can read scoped AVKK'
);
SELECT pg_temp.assert_denied(
 $$INSERT INTO public.avkk_responsibility
   (avkk_subject_id,person_id,role_value_id,role_key_snapshot,role_label_snapshot,note,created_by,updated_by)
   SELECT '00000000-0000-0000-0000-0000000ee501',
          '00000000-0000-0000-0000-00000000e503',
          rv.id,rv.key,rv.label,'',auth.uid(),auth.uid()
   FROM public.reference_value rv
   JOIN public.reference_catalog rc ON rc.id=rv.catalog_id
   WHERE rc.key='avkk.responsibility_role' AND rv.key='deputy'$$,
 'T16 read-only PM cannot mutate scoped responsibility'
);
SELECT pg_temp.act_reset();

-- Engineer has customer write + avkk.edit but no avkk.responsibility.assign.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000e503');
SELECT pg_temp.assert_denied(
 $$INSERT INTO public.avkk_responsibility
   (avkk_subject_id,person_id,role_value_id,role_key_snapshot,role_label_snapshot,note,created_by,updated_by)
   SELECT '00000000-0000-0000-0000-0000000ee501',
          '00000000-0000-0000-0000-00000000e503',
          rv.id,rv.key,rv.label,'',auth.uid(),auth.uid()
   FROM public.reference_value rv
   JOIN public.reference_catalog rc ON rc.id=rv.catalog_id
   WHERE rc.key='avkk.responsibility_role' AND rv.key='deputy'$$,
 'T17 engineer cannot assign responsibility'
);
SELECT pg_temp.act_reset();

-- Viewer keeps scoped read only when Customer Access read is present.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000e504');
SELECT pg_temp.assert(
  EXISTS (SELECT 1 FROM public.avkk_subject WHERE id='00000000-0000-0000-0000-0000000ee501'),
  'T18 viewer read remains scoped'
);
SELECT pg_temp.assert_denied(
 $$SELECT * FROM public.bsf03e_avkk_responsibility_candidates('00000000-0000-0000-0000-0000000ee501')$$,
 'T19 viewer cannot use management candidate RPC'
);
SELECT pg_temp.act_reset();

-- Foreign systemhouse manager: no read / no candidates / no direct mutation.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000e505');
SELECT pg_temp.assert(
  NOT EXISTS (SELECT 1 FROM public.avkk_subject WHERE id='00000000-0000-0000-0000-0000000ee501'),
  'T20 cross-systemhouse AVKK read denied'
);
SELECT pg_temp.assert_denied(
 $$SELECT * FROM public.bsf03e_avkk_responsibility_candidates('00000000-0000-0000-0000-0000000ee501')$$,
 'T21 cross-systemhouse candidate lookup denied'
);
SELECT pg_temp.assert(
  NOT EXISTS (
    SELECT 1 FROM public.avkk_responsibility
    WHERE id='00000000-0000-0000-0000-0000000fe501'
  ),
  'T22a cross-systemhouse responsibility is not visible'
);
UPDATE public.avkk_responsibility
   SET valid_to=now(),updated_by=auth.uid()
 WHERE id='00000000-0000-0000-0000-0000000fe501';
SELECT pg_temp.act_reset();
SELECT pg_temp.assert(
  (SELECT valid_to IS NULL
     FROM public.avkk_responsibility
    WHERE id='00000000-0000-0000-0000-0000000fe501'),
  'T22 cross-systemhouse responsibility mutation changes zero rows'
);

ROLLBACK;
