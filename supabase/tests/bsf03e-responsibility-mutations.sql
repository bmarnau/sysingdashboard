-- BSF-03E P2 — Atomic Responsibility Mutations (T01-T24)
-- Issue #63. TDD contract: before P2 implementation intentionally RED.
-- Transactional, fail-fast, synthetic IDs only.
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
-- P2 public/private lifecycle contract
-- ---------------------------------------------------------------------------

SELECT pg_temp.assert(
  to_regprocedure('public.bsf03e_transfer_owner(uuid,uuid)') IS NOT NULL,
  'T01 transfer_owner public RPC exists'
);
SELECT pg_temp.assert(
  to_regprocedure('public.bsf03e_add_deputy(uuid,uuid)') IS NOT NULL,
  'T02 add_deputy public RPC exists'
);
SELECT pg_temp.assert(
  to_regprocedure('public.bsf03e_end_responsibility(uuid)') IS NOT NULL,
  'T03 end_responsibility public RPC exists'
);

SELECT pg_temp.assert((
  SELECT bool_and(NOT p.prosecdef)
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.oid IN (
      to_regprocedure('public.bsf03e_transfer_owner(uuid,uuid)'),
      to_regprocedure('public.bsf03e_add_deputy(uuid,uuid)'),
      to_regprocedure('public.bsf03e_end_responsibility(uuid)')
    )
), 'T04 public lifecycle RPCs are SECURITY INVOKER');

SELECT pg_temp.assert(
  to_regprocedure('private.bsf03e_transfer_owner(uuid,uuid)') IS NOT NULL
  AND to_regprocedure('private.bsf03e_add_deputy(uuid,uuid)') IS NOT NULL
  AND to_regprocedure('private.bsf03e_end_responsibility(uuid)') IS NOT NULL,
  'T05 private lifecycle implementations exist'
);

SELECT pg_temp.assert((
  SELECT bool_and(p.prosecdef AND COALESCE(array_to_string(p.proconfig,','),'') ILIKE '%search_path=%')
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='private'
    AND p.oid IN (
      to_regprocedure('private.bsf03e_transfer_owner(uuid,uuid)'),
      to_regprocedure('private.bsf03e_add_deputy(uuid,uuid)'),
      to_regprocedure('private.bsf03e_end_responsibility(uuid)')
    )
), 'T06 private lifecycle functions are hardened SECURITY DEFINER');

SELECT pg_temp.assert((
  SELECT bool_and(
    has_function_privilege('authenticated', p.oid, 'EXECUTE')
    AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
  )
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.oid IN (
      to_regprocedure('public.bsf03e_transfer_owner(uuid,uuid)'),
      to_regprocedure('public.bsf03e_add_deputy(uuid,uuid)'),
      to_regprocedure('public.bsf03e_end_responsibility(uuid)')
    )
), 'T07 lifecycle RPCs are authenticated-only');

SELECT pg_temp.assert((
  SELECT bool_and(pg_get_functiondef(p.oid) ILIKE '%FOR UPDATE%')
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='private'
    AND p.oid IN (
      to_regprocedure('private.bsf03e_transfer_owner(uuid,uuid)'),
      to_regprocedure('private.bsf03e_add_deputy(uuid,uuid)'),
      to_regprocedure('private.bsf03e_end_responsibility(uuid)')
    )
), 'T08 lifecycle mutations serialize on locked rows');

-- ---------------------------------------------------------------------------
-- Synthetic scoped world
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
SELECT id, '00000000-0000-0000-0000-000000000000',
       'authenticated','authenticated',email,'x',now(),now(),now(),'{}','{}'
FROM (VALUES
  ('00000000-0000-0000-0000-00000000e601'::uuid,'bsf03e-p2-teamlead@example.invalid'),
  ('00000000-0000-0000-0000-00000000e602'::uuid,'bsf03e-p2-owner@example.invalid'),
  ('00000000-0000-0000-0000-00000000e603'::uuid,'bsf03e-p2-new-owner@example.invalid'),
  ('00000000-0000-0000-0000-00000000e604'::uuid,'bsf03e-p2-deputy@example.invalid'),
  ('00000000-0000-0000-0000-00000000e605'::uuid,'bsf03e-p2-foreign@example.invalid'),
  ('00000000-0000-0000-0000-00000000e606'::uuid,'bsf03e-p2-readonly@example.invalid')
) u(id,email);

DELETE FROM public.user_roles
WHERE user_id BETWEEN '00000000-0000-0000-0000-00000000e601'::uuid
                  AND '00000000-0000-0000-0000-00000000e606'::uuid;

INSERT INTO public.user_roles(user_id,role) VALUES
 ('00000000-0000-0000-0000-00000000e601','teamlead'),
 ('00000000-0000-0000-0000-00000000e602','engineer'),
 ('00000000-0000-0000-0000-00000000e603','engineer'),
 ('00000000-0000-0000-0000-00000000e604','engineer'),
 ('00000000-0000-0000-0000-00000000e605','engineer'),
 ('00000000-0000-0000-0000-00000000e606','projectmanager');

UPDATE public.profiles
SET status='active',
    display_name=CASE id
      WHEN '00000000-0000-0000-0000-00000000e601' THEN 'P2 Teamlead'
      WHEN '00000000-0000-0000-0000-00000000e602' THEN 'P2 Owner Alt'
      WHEN '00000000-0000-0000-0000-00000000e603' THEN 'P2 Owner Neu'
      WHEN '00000000-0000-0000-0000-00000000e604' THEN 'P2 Deputy'
      WHEN '00000000-0000-0000-0000-00000000e605' THEN 'P2 Foreign'
      ELSE 'P2 Readonly'
    END
WHERE id BETWEEN '00000000-0000-0000-0000-00000000e601'::uuid
             AND '00000000-0000-0000-0000-00000000e606'::uuid;

INSERT INTO public.systemhouse(id,name,status) VALUES
 ('00000000-0000-0000-0000-0000000ae601','P2 SH1','active'),
 ('00000000-0000-0000-0000-0000000ae602','P2 SH2','active');

INSERT INTO public.customer(id,systemhouse_id,name,status) VALUES
 ('00000000-0000-0000-0000-0000000be601','00000000-0000-0000-0000-0000000ae601','P2 C1','active'),
 ('00000000-0000-0000-0000-0000000be602','00000000-0000-0000-0000-0000000ae602','P2 C2','active');

INSERT INTO public.systemhouse_membership(systemhouse_id,user_id,status) VALUES
 ('00000000-0000-0000-0000-0000000ae601','00000000-0000-0000-0000-00000000e601','active'),
 ('00000000-0000-0000-0000-0000000ae601','00000000-0000-0000-0000-00000000e602','active'),
 ('00000000-0000-0000-0000-0000000ae601','00000000-0000-0000-0000-00000000e603','active'),
 ('00000000-0000-0000-0000-0000000ae601','00000000-0000-0000-0000-00000000e604','active'),
 ('00000000-0000-0000-0000-0000000ae602','00000000-0000-0000-0000-00000000e605','active'),
 ('00000000-0000-0000-0000-0000000ae601','00000000-0000-0000-0000-00000000e606','active');

INSERT INTO public.customer_access(systemhouse_id,customer_id,user_id,access_level,status) VALUES
 ('00000000-0000-0000-0000-0000000ae601','00000000-0000-0000-0000-0000000be601','00000000-0000-0000-0000-00000000e601','write','active'),
 ('00000000-0000-0000-0000-0000000ae601','00000000-0000-0000-0000-0000000be601','00000000-0000-0000-0000-00000000e602','write','active'),
 ('00000000-0000-0000-0000-0000000ae601','00000000-0000-0000-0000-0000000be601','00000000-0000-0000-0000-00000000e603','write','active'),
 ('00000000-0000-0000-0000-0000000ae601','00000000-0000-0000-0000-0000000be601','00000000-0000-0000-0000-00000000e604','write','active'),
 ('00000000-0000-0000-0000-0000000ae602','00000000-0000-0000-0000-0000000be602','00000000-0000-0000-0000-00000000e605','write','active'),
 ('00000000-0000-0000-0000-0000000ae601','00000000-0000-0000-0000-0000000be601','00000000-0000-0000-0000-00000000e606','read','active');

INSERT INTO public.shared_project_projection
 (id,systemhouse_id,customer_id,source_id,name,status,published_by)
VALUES
 ('00000000-0000-0000-0000-0000000ce601','00000000-0000-0000-0000-0000000ae601','00000000-0000-0000-0000-0000000be601','E3-P2-P-1','P2 Project','active','00000000-0000-0000-0000-00000000e601');

INSERT INTO public.avkk_subject
 (id,subject_type,subject_id,subject_title_snapshot,status,systemhouse_id,customer_id,created_by,updated_by)
VALUES
 ('00000000-0000-0000-0000-0000000ee601','project','E3-P2-P-1','P2 Project','active',
  '00000000-0000-0000-0000-0000000ae601','00000000-0000-0000-0000-0000000be601',
  '00000000-0000-0000-0000-00000000e601','00000000-0000-0000-0000-00000000e601');

-- Seed an owner and two responsibility types under owner context.
INSERT INTO public.avkk_responsibility
 (id,avkk_subject_id,person_id,role_value_id,role_key_snapshot,role_label_snapshot,note,created_by,updated_by)
SELECT
 '00000000-0000-0000-0000-0000000fe601',
 '00000000-0000-0000-0000-0000000ee601',
 '00000000-0000-0000-0000-00000000e602',
 rv.id,rv.key,rv.label,'P2 seed owner',
 '00000000-0000-0000-0000-00000000e601','00000000-0000-0000-0000-00000000e601'
FROM public.reference_value rv
JOIN public.reference_catalog rc ON rc.id=rv.catalog_id
WHERE rc.key='avkk.responsibility_role' AND rv.key='owner';

INSERT INTO public.avkk_responsibility_type
 (responsibility_id,type_value_id,type_key_snapshot,type_label_snapshot,created_by)
SELECT
 '00000000-0000-0000-0000-0000000fe601',rv.id,rv.key,rv.label,
 '00000000-0000-0000-0000-00000000e601'
FROM public.reference_value rv
JOIN public.reference_catalog rc ON rc.id=rv.catalog_id
WHERE rc.key='avkk.responsibility_type' AND rv.key IN ('result','quality');

-- ---------------------------------------------------------------------------
-- Direct scoped DML must no longer bypass P2 lifecycle.
-- ---------------------------------------------------------------------------

SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000e601');
SELECT pg_temp.assert_denied(
 $$INSERT INTO public.avkk_responsibility
   (avkk_subject_id,person_id,role_value_id,role_key_snapshot,role_label_snapshot,note,created_by,updated_by)
   SELECT '00000000-0000-0000-0000-0000000ee601',
          '00000000-0000-0000-0000-00000000e604',
          rv.id,rv.key,rv.label,'direct scoped insert',auth.uid(),auth.uid()
   FROM public.reference_value rv
   JOIN public.reference_catalog rc ON rc.id=rv.catalog_id
   WHERE rc.key='avkk.responsibility_role' AND rv.key='deputy'$$,
 'T09 direct scoped responsibility INSERT denied'
);

UPDATE public.avkk_responsibility
   SET valid_to=now(),updated_by=auth.uid()
 WHERE id='00000000-0000-0000-0000-0000000fe601';
SELECT pg_temp.act_reset();
SELECT pg_temp.assert(
  (SELECT valid_to IS NULL FROM public.avkk_responsibility
    WHERE id='00000000-0000-0000-0000-0000000fe601'),
  'T10 direct scoped responsibility UPDATE changes zero rows'
);

-- ---------------------------------------------------------------------------
-- Atomic owner transfer
-- ---------------------------------------------------------------------------

SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000e601');
SELECT public.bsf03e_transfer_owner(
 '00000000-0000-0000-0000-0000000fe601',
 '00000000-0000-0000-0000-00000000e603'
);
SELECT pg_temp.act_reset();

SELECT pg_temp.assert(
  (SELECT valid_to IS NOT NULL FROM public.avkk_responsibility
    WHERE id='00000000-0000-0000-0000-0000000fe601'),
  'T11 old owner is historized'
);

SELECT pg_temp.assert((
  SELECT count(*)=1
  FROM public.avkk_responsibility
  WHERE avkk_subject_id='00000000-0000-0000-0000-0000000ee601'
    AND role_key_snapshot='owner' AND valid_to IS NULL
    AND person_id='00000000-0000-0000-0000-00000000e603'
), 'T12 transfer leaves exactly one active new owner');

SELECT pg_temp.assert((
  SELECT count(*)=2
  FROM public.avkk_responsibility_type t
  JOIN public.avkk_responsibility r ON r.id=t.responsibility_id
  WHERE r.avkk_subject_id='00000000-0000-0000-0000-0000000ee601'
    AND r.person_id='00000000-0000-0000-0000-00000000e603'
    AND r.role_key_snapshot='owner' AND r.valid_to IS NULL
), 'T13 owner transfer preserves responsibility types');

-- Invalid / foreign target must rollback completely.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000e601');
SELECT pg_temp.assert_denied(
 $$SELECT public.bsf03e_transfer_owner(
   (SELECT id FROM public.avkk_responsibility
     WHERE avkk_subject_id='00000000-0000-0000-0000-0000000ee601'
       AND role_key_snapshot='owner' AND valid_to IS NULL),
   '00000000-0000-0000-0000-00000000e605')$$,
 'T14 cross-systemhouse owner target denied'
);
SELECT pg_temp.act_reset();

SELECT pg_temp.assert((
  SELECT count(*)=1
  FROM public.avkk_responsibility
  WHERE avkk_subject_id='00000000-0000-0000-0000-0000000ee601'
    AND role_key_snapshot='owner' AND valid_to IS NULL
    AND person_id='00000000-0000-0000-0000-00000000e603'
), 'T15 failed transfer preserves active owner');

-- ---------------------------------------------------------------------------
-- Deputy add / duplicate deny / end
-- ---------------------------------------------------------------------------

SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000e601');
SELECT public.bsf03e_add_deputy(
  (SELECT id FROM public.avkk_responsibility
    WHERE avkk_subject_id='00000000-0000-0000-0000-0000000ee601'
      AND role_key_snapshot='owner' AND valid_to IS NULL),
  '00000000-0000-0000-0000-00000000e604'
);

SELECT pg_temp.assert_denied(
 $$SELECT public.bsf03e_add_deputy(
   (SELECT id FROM public.avkk_responsibility
     WHERE avkk_subject_id='00000000-0000-0000-0000-0000000ee601'
       AND role_key_snapshot='owner' AND valid_to IS NULL),
   '00000000-0000-0000-0000-00000000e604')$$,
 'T16 duplicate active deputy denied'
);
SELECT pg_temp.act_reset();

SELECT pg_temp.assert((
  SELECT count(*)=1
  FROM public.avkk_responsibility
  WHERE avkk_subject_id='00000000-0000-0000-0000-0000000ee601'
    AND role_key_snapshot='deputy' AND valid_to IS NULL
    AND person_id='00000000-0000-0000-0000-00000000e604'
), 'T17 deputy added once');

SELECT pg_temp.assert((
  SELECT count(*)=2
  FROM public.avkk_responsibility_type t
  JOIN public.avkk_responsibility r ON r.id=t.responsibility_id
  WHERE r.avkk_subject_id='00000000-0000-0000-0000-0000000ee601'
    AND r.person_id='00000000-0000-0000-0000-00000000e604'
    AND r.role_key_snapshot='deputy' AND r.valid_to IS NULL
), 'T18 deputy inherits source responsibility types');

SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000e601');
SELECT public.bsf03e_end_responsibility(
  (SELECT id FROM public.avkk_responsibility
   WHERE avkk_subject_id='00000000-0000-0000-0000-0000000ee601'
     AND role_key_snapshot='deputy' AND valid_to IS NULL
     AND person_id='00000000-0000-0000-0000-00000000e604')
);
SELECT pg_temp.act_reset();

SELECT pg_temp.assert(
  EXISTS (
    SELECT 1 FROM public.avkk_responsibility
    WHERE avkk_subject_id='00000000-0000-0000-0000-0000000ee601'
      AND role_key_snapshot='deputy'
      AND person_id='00000000-0000-0000-0000-00000000e604'
      AND valid_to IS NOT NULL
  ),
  'T19 end responsibility historizes row without delete'
);

-- Read-only manager cannot mutate.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000e606');
SELECT pg_temp.assert_denied(
 $$SELECT public.bsf03e_add_deputy(
   (SELECT id FROM public.avkk_responsibility
     WHERE avkk_subject_id='00000000-0000-0000-0000-0000000ee601'
       AND role_key_snapshot='owner' AND valid_to IS NULL),
   '00000000-0000-0000-0000-00000000e604')$$,
 'T20 read-only manager cannot mutate'
);
SELECT pg_temp.act_reset();

-- Audit trigger remains the single audit infrastructure.
SELECT pg_temp.assert(
  EXISTS (
    SELECT 1 FROM public.audit_log
    WHERE target='00000000-0000-0000-0000-0000000ee601'
      AND action='avkk.avkk_responsibility.update'
  ),
  'T21 responsibility lifecycle updates are audited'
);
SELECT pg_temp.assert(
  EXISTS (
    SELECT 1 FROM public.audit_log
    WHERE target='00000000-0000-0000-0000-0000000ee601'
      AND action='avkk.avkk_responsibility.insert'
  ),
  'T22 responsibility lifecycle inserts are audited'
);

-- No destructive scoped delete.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000e601');
DELETE FROM public.avkk_responsibility
 WHERE avkk_subject_id='00000000-0000-0000-0000-0000000ee601';
SELECT pg_temp.act_reset();
SELECT pg_temp.assert(
  EXISTS (
    SELECT 1 FROM public.avkk_responsibility
    WHERE avkk_subject_id='00000000-0000-0000-0000-0000000ee601'
  ),
  'T23 direct scoped DELETE changes zero rows'
);

SELECT pg_temp.assert((
  SELECT count(*)=1
  FROM public.avkk_responsibility
  WHERE avkk_subject_id='00000000-0000-0000-0000-0000000ee601'
    AND role_key_snapshot='owner' AND valid_to IS NULL
), 'T24 exactly one active owner remains');

ROLLBACK;
