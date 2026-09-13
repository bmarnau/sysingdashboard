-- BSF-03 P5 — Customer Responsibility Management (R19–R31)
-- Issue #105 / TDD-Vertrag. Aeußerer BEGIN/ROLLBACK, fail-fast, synthetische Daten.
\set ON_ERROR_STOP on
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.assert(cond boolean, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FAIL %', label; END IF;
  RAISE NOTICE 'PASS %', label;
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.assert_denied(stmt text, expected_state text, label text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE got_state text; got_message text;
BEGIN
  BEGIN EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS got_state = RETURNED_SQLSTATE, got_message = MESSAGE_TEXT;
    IF expected_state IS NULL OR got_state = expected_state THEN
      RAISE NOTICE 'PASS % (% / %)', label, got_state, got_message; RETURN;
    END IF;
    RAISE EXCEPTION 'FAIL % expected %, got % / %', label, expected_state, got_state, got_message;
  END;
  RAISE EXCEPTION 'FAIL % statement unexpectedly succeeded', label;
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.act_as(uid uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub',uid::text,'role','authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END; $$;
CREATE OR REPLACE FUNCTION pg_temp.act_reset() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', NULL, true);
END; $$;

-- RED gate: auf dem Vor-P5-Stand fehlen diese vier Funktionen.
SELECT pg_temp.assert(to_regprocedure('public.customer_responsibility_management_overview(uuid)') IS NOT NULL,
  'R19 overview RPC exists');
SELECT pg_temp.assert(to_regprocedure('public.customer_responsibility_management_candidates(uuid)') IS NOT NULL,
  'R22 candidates RPC exists');
SELECT pg_temp.assert(to_regprocedure('public.set_customer_responsibility(uuid,uuid,uuid)') IS NOT NULL,
  'R26 set RPC exists');
SELECT pg_temp.assert(to_regprocedure('public.end_customer_responsibility(uuid,uuid)') IS NOT NULL,
  'R30 end RPC exists');

-- Statischer Security-Vertrag.
SELECT pg_temp.assert(
  has_function_privilege('authenticated','public.customer_responsibility_management_overview(uuid)','EXECUTE')
  AND NOT has_function_privilege('anon','public.customer_responsibility_management_overview(uuid)','EXECUTE'),
  'R19a overview authenticated-only');
SELECT pg_temp.assert(
  has_function_privilege('authenticated','public.customer_responsibility_management_candidates(uuid)','EXECUTE')
  AND NOT has_function_privilege('anon','public.customer_responsibility_management_candidates(uuid)','EXECUTE'),
  'R22a candidates authenticated-only');
SELECT pg_temp.assert((
  SELECT count(*) = 4 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname IN ('customer_responsibility_management_overview','customer_responsibility_management_candidates',
                      'set_customer_responsibility','end_customer_responsibility')
    AND p.prosecdef = false),
  'R24 public P5 functions are SECURITY INVOKER');
SELECT pg_temp.assert(
  pg_get_function_result(to_regprocedure('public.customer_responsibility_management_candidates(uuid)')::oid)
    !~* '(email|phone|mfa|profile_image|role|status|first_name|last_name)',
  'R24a candidate result is data-minimized');
SELECT pg_temp.assert(
  pg_get_function_result(to_regprocedure('public.customer_responsibility_management_overview(uuid)')::oid)
    !~* '(email|phone|mfa|profile_image|first_name|last_name)',
  'R24b overview excludes profile details');

-- Testwelt.
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
SELECT id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',email,'x',now(),now(),now(),'{}','{}'
FROM (VALUES
 ('00000000-0000-0000-0000-00000000d501'::uuid,'bsf03-p5-manager@example.invalid'),
 ('00000000-0000-0000-0000-00000000d502'::uuid,'bsf03-p5-engineer-a@example.invalid'),
 ('00000000-0000-0000-0000-00000000d503'::uuid,'bsf03-p5-engineer-b@example.invalid'),
 ('00000000-0000-0000-0000-00000000d504'::uuid,'bsf03-p5-viewer@example.invalid'),
 ('00000000-0000-0000-0000-00000000d505'::uuid,'bsf03-p5-customer@example.invalid'),
 ('00000000-0000-0000-0000-00000000d506'::uuid,'bsf03-p5-inactive@example.invalid'),
 ('00000000-0000-0000-0000-00000000d507'::uuid,'bsf03-p5-other-manager@example.invalid')) v(id,email);

DELETE FROM public.user_roles WHERE user_id BETWEEN '00000000-0000-0000-0000-00000000d501'::uuid
                                                AND '00000000-0000-0000-0000-00000000d507'::uuid;
INSERT INTO public.user_roles(user_id,role) VALUES
 ('00000000-0000-0000-0000-00000000d501','teamlead'),
 ('00000000-0000-0000-0000-00000000d502','engineer'),
 ('00000000-0000-0000-0000-00000000d503','projectmanager'),
 ('00000000-0000-0000-0000-00000000d504','viewer'),
 ('00000000-0000-0000-0000-00000000d505','customer'),
 ('00000000-0000-0000-0000-00000000d506','engineer'),
 ('00000000-0000-0000-0000-00000000d507','teamlead');
UPDATE public.profiles SET status='active', display_name=CASE id
 WHEN '00000000-0000-0000-0000-00000000d501' THEN 'P5 Manager'
 WHEN '00000000-0000-0000-0000-00000000d502' THEN 'P5 Engineer A'
 WHEN '00000000-0000-0000-0000-00000000d503' THEN 'P5 Engineer B'
 WHEN '00000000-0000-0000-0000-00000000d504' THEN 'P5 Viewer'
 WHEN '00000000-0000-0000-0000-00000000d505' THEN 'P5 Customer'
 WHEN '00000000-0000-0000-0000-00000000d506' THEN 'P5 Inactive'
 ELSE 'P5 Other Manager' END
WHERE id BETWEEN '00000000-0000-0000-0000-00000000d501'::uuid AND '00000000-0000-0000-0000-00000000d507'::uuid;

INSERT INTO public.systemhouse(id,name,status) VALUES
 ('00000000-0000-0000-0000-0000000ad501','P5 SH1','active'),
 ('00000000-0000-0000-0000-0000000ad502','P5 SH2','active');
INSERT INTO public.customer(id,systemhouse_id,name,status) VALUES
 ('00000000-0000-0000-0000-0000000bd501','00000000-0000-0000-0000-0000000ad501','P5 C1','active'),
 ('00000000-0000-0000-0000-0000000bd502','00000000-0000-0000-0000-0000000ad501','P5 C2','active'),
 ('00000000-0000-0000-0000-0000000bd503','00000000-0000-0000-0000-0000000ad502','P5 C3','active');
INSERT INTO public.systemhouse_membership(systemhouse_id,user_id,status) VALUES
 ('00000000-0000-0000-0000-0000000ad501','00000000-0000-0000-0000-00000000d501','active'),
 ('00000000-0000-0000-0000-0000000ad501','00000000-0000-0000-0000-00000000d502','active'),
 ('00000000-0000-0000-0000-0000000ad501','00000000-0000-0000-0000-00000000d503','active'),
 ('00000000-0000-0000-0000-0000000ad501','00000000-0000-0000-0000-00000000d504','active'),
 ('00000000-0000-0000-0000-0000000ad501','00000000-0000-0000-0000-00000000d505','active'),
 ('00000000-0000-0000-0000-0000000ad501','00000000-0000-0000-0000-00000000d506','inactive'),
 ('00000000-0000-0000-0000-0000000ad502','00000000-0000-0000-0000-00000000d507','active');
INSERT INTO public.customer_responsibility(systemhouse_id,customer_id,user_id,status,valid_from)
VALUES ('00000000-0000-0000-0000-0000000ad501','00000000-0000-0000-0000-0000000bd502',
        '00000000-0000-0000-0000-00000000d502','active',now()-interval '1 day');

-- R19 manager sees all customers in own systemhouse despite no customer_access.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000d501');
SELECT pg_temp.assert((SELECT count(*)=2 FROM public.customer_responsibility_management_overview('00000000-0000-0000-0000-0000000ad501')),
 'R19 manager overview without customer_access');
-- R20 cross-systemhouse read denied.
SELECT pg_temp.assert_denied(
 $$SELECT * FROM public.customer_responsibility_management_overview('00000000-0000-0000-0000-0000000ad502')$$,
 '42501','R20 cross-systemhouse overview denied');
-- R22/R23 candidates same SH, active, eligible only.
SELECT pg_temp.assert((SELECT count(*)=3 FROM public.customer_responsibility_management_candidates('00000000-0000-0000-0000-0000000ad501')),
 'R22 candidate count eligible+active only');
SELECT pg_temp.assert(NOT EXISTS(
 SELECT 1 FROM public.customer_responsibility_management_candidates('00000000-0000-0000-0000-0000000ad501') c
 WHERE c.user_id IN ('00000000-0000-0000-0000-00000000d504','00000000-0000-0000-0000-00000000d505','00000000-0000-0000-0000-00000000d506')),
 'R23 viewer/customer/inactive excluded');

-- R26 manager can assign C1 without customer_access.
SELECT pg_temp.assert(
 public.set_customer_responsibility('00000000-0000-0000-0000-0000000ad501','00000000-0000-0000-0000-0000000bd501','00000000-0000-0000-0000-00000000d502') IS NOT NULL,
 'R26 assign without customer_access');
-- R27 invalid target rolls back, previous active remains.
SELECT pg_temp.assert_denied(
 $$SELECT public.set_customer_responsibility('00000000-0000-0000-0000-0000000ad501','00000000-0000-0000-0000-0000000bd501','00000000-0000-0000-0000-00000000d504')$$,
 '42501','R27 invalid target denied');
SELECT pg_temp.assert((SELECT user_id='00000000-0000-0000-0000-00000000d502'::uuid
 FROM public.customer_responsibility WHERE customer_id='00000000-0000-0000-0000-0000000bd501' AND status='active'),
 'R27b previous active remains after rollback');
-- R28 replace A->B.
SELECT public.set_customer_responsibility('00000000-0000-0000-0000-0000000ad501','00000000-0000-0000-0000-0000000bd501','00000000-0000-0000-0000-00000000d503');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.customer_responsibility WHERE customer_id='00000000-0000-0000-0000-0000000bd501' AND status='active' AND user_id='00000000-0000-0000-0000-00000000d503'),
 'R28 replacement creates exactly one new active');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.customer_responsibility WHERE customer_id='00000000-0000-0000-0000-0000000bd501' AND status='ended' AND user_id='00000000-0000-0000-0000-00000000d502'),
 'R28b old responsibility retained as history');
-- R29 idempotent same target.
SELECT public.set_customer_responsibility('00000000-0000-0000-0000-0000000ad501','00000000-0000-0000-0000-0000000bd501','00000000-0000-0000-0000-00000000d503');
SELECT pg_temp.assert((SELECT count(*)=2 FROM public.customer_responsibility WHERE customer_id='00000000-0000-0000-0000-0000000bd501'),
 'R29 same target creates no extra history');
-- R30 end idempotent and historic.
SELECT pg_temp.assert(public.end_customer_responsibility('00000000-0000-0000-0000-0000000ad501','00000000-0000-0000-0000-0000000bd501'), 'R30 first end returns true');
SELECT pg_temp.assert(NOT public.end_customer_responsibility('00000000-0000-0000-0000-0000000ad501','00000000-0000-0000-0000-0000000bd501'), 'R30b second end idempotent false');
SELECT pg_temp.assert((SELECT count(*)=0 FROM public.customer_responsibility WHERE customer_id='00000000-0000-0000-0000-0000000bd501' AND status='active'), 'R30c no active after end');
-- R31 direct duplicate active remains blocked by unique index.
SELECT pg_temp.assert_denied(
 $$INSERT INTO public.customer_responsibility(systemhouse_id,customer_id,user_id) VALUES
 ('00000000-0000-0000-0000-0000000ad501','00000000-0000-0000-0000-0000000bd502','00000000-0000-0000-0000-00000000d503')$$,
 '23505','R31 second active denied');
SELECT pg_temp.act_reset();

-- R21 non-manager may not use management RPCs.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000d502');
SELECT pg_temp.assert_denied($$SELECT * FROM public.customer_responsibility_management_overview('00000000-0000-0000-0000-0000000ad501')$$,'42501','R21 engineer overview denied');
SELECT pg_temp.assert_denied($$SELECT * FROM public.customer_responsibility_management_candidates('00000000-0000-0000-0000-0000000ad501')$$,'42501','R21b engineer candidates denied');
SELECT pg_temp.assert_denied($$SELECT public.set_customer_responsibility('00000000-0000-0000-0000-0000000ad501','00000000-0000-0000-0000-0000000bd501','00000000-0000-0000-0000-00000000d502')$$,'42501','R21c engineer mutation denied');
SELECT pg_temp.act_reset();

ROLLBACK;
