-- BSF-03 Prompt 1 + P1 — Customer Responsibility: Schema-, Grant- und RLS-Vertrag (R01–R18, T0–T12)
-- Issue #105, Design: docs/BSF-03-CUSTOMER-RESPONSIBILITY-DESIGN.md
--
-- Eigenschaften dieses Artefakts:
--   * aeusserer BEGIN / regulaerer ROLLBACK — es bleiben keine Testdaten zurueck,
--   * fail-fast: jede verletzte Assertion bricht den gesamten Lauf ab,
--   * ausschliesslich synthetische Identitaeten (bsf03-*@example.invalid),
--   * RLS wird real wirksam geprueft (SET LOCAL ROLE authenticated + request.jwt.claims),
--   * keine Lockerung produktiver Security, keine Migrationsaenderung,
--   * kein Service-Role-Runtime-Pfad.
--
-- Ausfuehrung: psql -f supabase/tests/bsf-03-customer-responsibility-rls.sql
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
  RAISE EXCEPTION 'FAIL % (statement unexpectedly succeeded)', label;
END; $$;

-- ---------------------------------------------------------------------------
-- R00: statischer Tabellen-, Grant- und Policy-Vertrag
-- ---------------------------------------------------------------------------

SELECT pg_temp.assert((
  SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'customer_responsibility'
), 'R00a RLS enabled on customer_responsibility');

SELECT pg_temp.assert((
  SELECT count(*) = 0 FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND table_name = 'customer_responsibility'
    AND grantee IN ('PUBLIC','anon')
), 'R00b no PUBLIC/anon table grants');

SELECT pg_temp.assert((
  SELECT count(*) = 0 FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND table_name = 'customer_responsibility'
    AND grantee = 'authenticated' AND privilege_type NOT IN ('SELECT','INSERT','UPDATE')
), 'R00c authenticated limited to SELECT/INSERT/UPDATE');

SELECT pg_temp.assert((
  SELECT count(*) = 0 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'customer_responsibility'
    AND cmd IN ('DELETE','ALL')
), 'R00d no DELETE/ALL policy');

SELECT pg_temp.assert((
  SELECT count(*) = 1 FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'customer_responsibility'
    AND indexname = 'customer_responsibility_one_active_uidx'
), 'R00e unique active responsibility index exists');

-- ---------------------------------------------------------------------------
-- Synthetische Testwelt
-- ---------------------------------------------------------------------------
-- Systemhaeuser: SH1 = ...0ac301, SH2 = ...0ac302
-- Kunden (SH1):  C1 ...0bc301, C2 ...0bc302, C4 ...0bc304, C5 ...0bc305,
--                C6 ...0bc306, C7 ...0bc307
-- Kunde  (SH2):  C3 ...0bc303
-- Benutzer:
--   U_RESP_READ  ...00c301 engineer      Membership SH1, read@C1,  Resp C1
--   U_RESP_WRITE ...00c302 projectmanager Membership SH1, write@C2, Resp C2
--   U_RESP_NOACC ...00c303 engineer      Membership SH1, kein Access, Resp C4
--   U_ACC_NORESP ...00c304 engineer      Membership SH1, read@C1,  keine Resp
--   U_OTHER_SH   ...00c305 teamlead      Membership SH2, read@C3,  Resp C3
--   U_INACT_MEM  ...00c306 engineer      Membership SH1 inactive, read@C5, Resp C5
--   U_MGR        ...00c307 teamlead      Membership SH1 (customer.responsibility.manage)
--   U_VIEWER     ...00c308 viewer        Membership SH1
--   U_CUSTOMER   ...00c309 customer      Membership SH1
--   U_ENG2       ...00c30a engineer      Membership SH1
--   U_ENDED      ...00c30b engineer      Membership SH1, read@C6, beendete Resp C6
--   U_EXP_ACC    ...00c30c engineer      Membership SH1, abgelaufener Access@C7, Resp C7

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
SELECT u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       u.email, 'x', now(), now(), now(), '{}'::jsonb, '{}'::jsonb
FROM (VALUES
  ('00000000-0000-0000-0000-00000000c301'::uuid, 'bsf03-resp-read@example.invalid'),
  ('00000000-0000-0000-0000-00000000c302'::uuid, 'bsf03-resp-write@example.invalid'),
  ('00000000-0000-0000-0000-00000000c303'::uuid, 'bsf03-resp-noaccess@example.invalid'),
  ('00000000-0000-0000-0000-00000000c304'::uuid, 'bsf03-access-noresp@example.invalid'),
  ('00000000-0000-0000-0000-00000000c305'::uuid, 'bsf03-other-sh@example.invalid'),
  ('00000000-0000-0000-0000-00000000c306'::uuid, 'bsf03-inactive-member@example.invalid'),
  ('00000000-0000-0000-0000-00000000c307'::uuid, 'bsf03-manager@example.invalid'),
  ('00000000-0000-0000-0000-00000000c308'::uuid, 'bsf03-viewer@example.invalid'),
  ('00000000-0000-0000-0000-00000000c309'::uuid, 'bsf03-customer@example.invalid'),
  ('00000000-0000-0000-0000-00000000c30a'::uuid, 'bsf03-engineer2@example.invalid'),
  ('00000000-0000-0000-0000-00000000c30b'::uuid, 'bsf03-ended@example.invalid'),
  ('00000000-0000-0000-0000-00000000c30c'::uuid, 'bsf03-expired-access@example.invalid')
) AS u(id, email);

-- handle_new_user() vergibt automatisch eine Default-Rolle; deterministisch neu setzen.
DELETE FROM public.user_roles WHERE user_id IN (
  '00000000-0000-0000-0000-00000000c301','00000000-0000-0000-0000-00000000c302',
  '00000000-0000-0000-0000-00000000c303','00000000-0000-0000-0000-00000000c304',
  '00000000-0000-0000-0000-00000000c305','00000000-0000-0000-0000-00000000c306',
  '00000000-0000-0000-0000-00000000c307','00000000-0000-0000-0000-00000000c308',
  '00000000-0000-0000-0000-00000000c309','00000000-0000-0000-0000-00000000c30a',
  '00000000-0000-0000-0000-00000000c30b','00000000-0000-0000-0000-00000000c30c');

INSERT INTO public.user_roles (user_id, role) VALUES
  ('00000000-0000-0000-0000-00000000c301','engineer'),
  ('00000000-0000-0000-0000-00000000c302','projectmanager'),
  ('00000000-0000-0000-0000-00000000c303','engineer'),
  ('00000000-0000-0000-0000-00000000c304','engineer'),
  ('00000000-0000-0000-0000-00000000c305','teamlead'),
  ('00000000-0000-0000-0000-00000000c306','engineer'),
  ('00000000-0000-0000-0000-00000000c307','teamlead'),
  ('00000000-0000-0000-0000-00000000c308','viewer'),
  ('00000000-0000-0000-0000-00000000c309','customer'),
  ('00000000-0000-0000-0000-00000000c30a','engineer'),
  ('00000000-0000-0000-0000-00000000c30b','engineer'),
  ('00000000-0000-0000-0000-00000000c30c','engineer');

UPDATE public.profiles SET status = 'active'
WHERE id IN (
  '00000000-0000-0000-0000-00000000c301','00000000-0000-0000-0000-00000000c302',
  '00000000-0000-0000-0000-00000000c303','00000000-0000-0000-0000-00000000c304',
  '00000000-0000-0000-0000-00000000c305','00000000-0000-0000-0000-00000000c306',
  '00000000-0000-0000-0000-00000000c307','00000000-0000-0000-0000-00000000c308',
  '00000000-0000-0000-0000-00000000c309','00000000-0000-0000-0000-00000000c30a',
  '00000000-0000-0000-0000-00000000c30b','00000000-0000-0000-0000-00000000c30c');

INSERT INTO public.systemhouse (id, name, status) VALUES
  ('00000000-0000-0000-0000-0000000ac301','BSF03 SH1','active'),
  ('00000000-0000-0000-0000-0000000ac302','BSF03 SH2','active');

INSERT INTO public.customer (id, systemhouse_id, name, status) VALUES
  ('00000000-0000-0000-0000-0000000bc301','00000000-0000-0000-0000-0000000ac301','BSF03 C1','active'),
  ('00000000-0000-0000-0000-0000000bc302','00000000-0000-0000-0000-0000000ac301','BSF03 C2','active'),
  ('00000000-0000-0000-0000-0000000bc303','00000000-0000-0000-0000-0000000ac302','BSF03 C3','active'),
  ('00000000-0000-0000-0000-0000000bc304','00000000-0000-0000-0000-0000000ac301','BSF03 C4','active'),
  ('00000000-0000-0000-0000-0000000bc305','00000000-0000-0000-0000-0000000ac301','BSF03 C5','active'),
  ('00000000-0000-0000-0000-0000000bc306','00000000-0000-0000-0000-0000000ac301','BSF03 C6','active'),
  ('00000000-0000-0000-0000-0000000bc307','00000000-0000-0000-0000-0000000ac301','BSF03 C7','active');

INSERT INTO public.systemhouse_membership (systemhouse_id, user_id, status) VALUES
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-00000000c301','active'),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-00000000c302','active'),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-00000000c303','active'),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-00000000c304','active'),
  ('00000000-0000-0000-0000-0000000ac302','00000000-0000-0000-0000-00000000c305','active'),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-00000000c306','active'),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-00000000c307','active'),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-00000000c308','active'),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-00000000c309','active'),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-00000000c30a','active'),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-00000000c30b','active'),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-00000000c30c','active');

INSERT INTO public.customer_access (systemhouse_id, customer_id, user_id, access_level, status, valid_to) VALUES
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc301','00000000-0000-0000-0000-00000000c301','read','active',NULL),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc302','00000000-0000-0000-0000-00000000c302','write','active',NULL),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc301','00000000-0000-0000-0000-00000000c304','read','active',NULL),
  ('00000000-0000-0000-0000-0000000ac302','00000000-0000-0000-0000-0000000bc303','00000000-0000-0000-0000-00000000c305','read','active',NULL),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc305','00000000-0000-0000-0000-00000000c306','read','active',NULL),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc306','00000000-0000-0000-0000-00000000c30b','read','active',NULL),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc307','00000000-0000-0000-0000-00000000c30c','read','active', now() - interval '1 day');

-- Hinweis: `valid_from` wird fuer die beendete Zeile explizit gesetzt, weil der
-- Period-Check `valid_to > valid_from` sonst gegen den Default `now()` prueft.
INSERT INTO public.customer_responsibility (systemhouse_id, customer_id, user_id, status, valid_from, valid_to) VALUES
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc301','00000000-0000-0000-0000-00000000c301','active', now() - interval '1 day', NULL),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc302','00000000-0000-0000-0000-00000000c302','active', now() - interval '1 day', NULL),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc304','00000000-0000-0000-0000-00000000c303','active', now() - interval '1 day', NULL),
  ('00000000-0000-0000-0000-0000000ac302','00000000-0000-0000-0000-0000000bc303','00000000-0000-0000-0000-00000000c305','active', now() - interval '1 day', NULL),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc305','00000000-0000-0000-0000-00000000c306','active', now() - interval '1 day', NULL),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc306','00000000-0000-0000-0000-00000000c30b','ended', now() - interval '2 days', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc307','00000000-0000-0000-0000-00000000c30c','active', now() - interval '1 day', NULL);

-- U_INACTIVE (c306): Membership erst NACH Anlage der Verantwortung deaktivieren.
-- Der P1-Target-Guard verhindert die Neuanlage fuer Ziele ohne aktive Membership;
-- der Fall "Verantwortung vorhanden, Membership spaeter erloschen" (R08) wird so
-- realistisch als nachtraeglicher Zustandswechsel abgebildet.
UPDATE public.systemhouse_membership SET status = 'inactive'
 WHERE user_id = '00000000-0000-0000-0000-00000000c306'
   AND systemhouse_id = '00000000-0000-0000-0000-0000000ac301';

-- Rollen-/JWT-Simulation.
CREATE OR REPLACE FUNCTION pg_temp.act_as(uid uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', uid::text, 'role','authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END; $$;

-- Rollen-Preview-Simulation: manipulierte Zusatzclaims, echte Identitaet unveraendert.
CREATE OR REPLACE FUNCTION pg_temp.act_as_with_fake_role(uid uuid, fake_role text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object(
      'sub', uid::text,
      'role','authenticated',
      'user_role', fake_role,
      'app_metadata', json_build_object('role', fake_role)
    )::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.act_reset() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', NULL, true);
END; $$;

-- ---------------------------------------------------------------------------
-- R01–R10: Sichtbarkeitsvertrag "Meine Kunden"
-- ---------------------------------------------------------------------------

-- R01 aktiver Verantwortlicher + Membership + read Access -> sichtbar.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c301');
SELECT pg_temp.assert(
  public.is_my_customer('00000000-0000-0000-0000-00000000c301',
                        '00000000-0000-0000-0000-0000000ac301',
                        '00000000-0000-0000-0000-0000000bc301'),
  'R01 responsible + membership + read access -> customer visible');
SELECT pg_temp.assert((
  SELECT count(*) = 1 FROM public.customer_responsibility
  WHERE customer_id = '00000000-0000-0000-0000-0000000bc301'
), 'R01b own responsibility row readable');
SELECT pg_temp.act_reset();

-- R02 aktiver Verantwortlicher + write Access -> sichtbar; Schreiben bleibt permissionsabhaengig.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c302');
SELECT pg_temp.assert(
  public.is_my_customer('00000000-0000-0000-0000-00000000c302',
                        '00000000-0000-0000-0000-0000000ac301',
                        '00000000-0000-0000-0000-0000000bc302')
  AND public.has_customer_access('00000000-0000-0000-0000-00000000c302',
                                 '00000000-0000-0000-0000-0000000ac301',
                                 '00000000-0000-0000-0000-0000000bc302','write'),
  'R02 responsible + write access -> visible with write scope');
SELECT pg_temp.act_reset();

-- R03 Responsibility ohne Customer Access -> DENY.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c303');
SELECT pg_temp.assert(
  NOT public.is_my_customer('00000000-0000-0000-0000-00000000c303',
                            '00000000-0000-0000-0000-0000000ac301',
                            '00000000-0000-0000-0000-0000000bc304'),
  'R03 responsibility without customer access -> denied');
SELECT pg_temp.act_reset();

-- R04 Customer Access ohne Responsibility -> nicht "Mein Kunde".
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c304');
SELECT pg_temp.assert(
  NOT public.is_my_customer('00000000-0000-0000-0000-00000000c304',
                            '00000000-0000-0000-0000-0000000ac301',
                            '00000000-0000-0000-0000-0000000bc301')
  AND public.has_customer_access('00000000-0000-0000-0000-00000000c304',
                                 '00000000-0000-0000-0000-0000000ac301',
                                 '00000000-0000-0000-0000-0000000bc301','read'),
  'R04 customer access without responsibility -> not my customer');
SELECT pg_temp.act_reset();

-- R05 fremdes Systemhouse -> DENY (Sicht und Zeilenzugriff).
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c301');
SELECT pg_temp.assert(
  NOT public.is_my_customer('00000000-0000-0000-0000-00000000c301',
                            '00000000-0000-0000-0000-0000000ac302',
                            '00000000-0000-0000-0000-0000000bc303'),
  'R05a cross systemhouse denied');
SELECT pg_temp.act_reset();
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c307');
SELECT pg_temp.assert((
  SELECT count(*) = 0 FROM public.customer_responsibility
  WHERE systemhouse_id = '00000000-0000-0000-0000-0000000ac302'
), 'R05b manager cannot read foreign systemhouse responsibilities');
SELECT pg_temp.act_reset();

-- R06 fremder Customer im eigenen Systemhaus -> DENY.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c301');
SELECT pg_temp.assert(
  NOT public.is_my_customer('00000000-0000-0000-0000-00000000c301',
                            '00000000-0000-0000-0000-0000000ac301',
                            '00000000-0000-0000-0000-0000000bc302'),
  'R06 foreign customer denied');

-- R07 erratene Customer-ID / IDOR -> DENY; fremde Zeilen unsichtbar.
SELECT pg_temp.assert(
  NOT public.is_my_customer('00000000-0000-0000-0000-00000000c301',
                            '00000000-0000-0000-0000-0000000ac301',
                            '00000000-0000-0000-0000-0000000bcfff'),
  'R07a guessed customer id denied');
SELECT pg_temp.assert((
  SELECT count(*) = 0 FROM public.customer_responsibility
  WHERE user_id <> '00000000-0000-0000-0000-00000000c301'
), 'R07b foreign responsibility rows invisible');
SELECT pg_temp.act_reset();

-- R08 inaktive Membership -> DENY.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c306');
SELECT pg_temp.assert(
  NOT public.is_my_customer('00000000-0000-0000-0000-00000000c306',
                            '00000000-0000-0000-0000-0000000ac301',
                            '00000000-0000-0000-0000-0000000bc305'),
  'R08 inactive membership denied');
SELECT pg_temp.act_reset();

-- R09 beendete Responsibility -> nicht sichtbar.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c30b');
SELECT pg_temp.assert(
  NOT public.is_my_customer('00000000-0000-0000-0000-00000000c30b',
                            '00000000-0000-0000-0000-0000000ac301',
                            '00000000-0000-0000-0000-0000000bc306'),
  'R09 ended responsibility not visible as my customer');
SELECT pg_temp.act_reset();

-- R10 abgelaufener Customer Access -> DENY.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c30c');
SELECT pg_temp.assert(
  NOT public.is_my_customer('00000000-0000-0000-0000-00000000c30c',
                            '00000000-0000-0000-0000-0000000ac301',
                            '00000000-0000-0000-0000-0000000bc307'),
  'R10 expired customer access denied');
SELECT pg_temp.act_reset();

-- ---------------------------------------------------------------------------
-- R11–R18: Verwaltung, Rechtegrenzen, Lifecycle
-- ---------------------------------------------------------------------------

-- R11 viewer als Responsibility-Ziel -> DENY.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c307');
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_responsibility (systemhouse_id, customer_id, user_id)
    VALUES ('00000000-0000-0000-0000-0000000ac301',
            '00000000-0000-0000-0000-0000000bc305',
            '00000000-0000-0000-0000-00000000c308')$$,
  '42501', 'R11 viewer cannot become responsible');

-- R12 customer-Rolle als Responsibility-Ziel -> DENY.
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_responsibility (systemhouse_id, customer_id, user_id)
    VALUES ('00000000-0000-0000-0000-0000000ac301',
            '00000000-0000-0000-0000-0000000bc305',
            '00000000-0000-0000-0000-00000000c309')$$,
  '42501', 'R12 customer role cannot become responsible');

-- R16 zweiter gleichzeitig aktiver Verantwortlicher -> DENY (Unique-Index).
-- Manager-Pfad: RLS (Manager-Scope) und Target-Guard passieren, der partielle
-- Unique-Index muss den Konflikt melden (23505, nicht 42501).
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_responsibility (systemhouse_id, customer_id, user_id)
    VALUES ('00000000-0000-0000-0000-0000000ac301',
            '00000000-0000-0000-0000-0000000bc301',
            '00000000-0000-0000-0000-00000000c30a')$$,
  '23505', 'R16 second active responsibility per customer denied');
SELECT pg_temp.act_reset();
-- R16b isoliert (Test-Harness, privilegiert innerhalb des aeusseren ROLLBACK):
-- beweist den Unique-Index unabhaengig von RLS/Target-Guard.
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_responsibility (systemhouse_id, customer_id, user_id)
    VALUES ('00000000-0000-0000-0000-0000000ac301',
            '00000000-0000-0000-0000-0000000bc307',
            '00000000-0000-0000-0000-00000000c30a')$$,
  '23505', 'R16b unique active responsibility index enforced (privileged harness)');
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c307');

-- R17 historisch beendete Responsibility bleibt fuer Verwaltung/Audit lesbar.
SELECT pg_temp.assert((
  SELECT count(*) = 1 FROM public.customer_responsibility
  WHERE customer_id = '00000000-0000-0000-0000-0000000bc306' AND status = 'ended'
), 'R17a ended responsibility remains auditable');
SELECT pg_temp.assert_denied(
  $$UPDATE public.customer_responsibility
       SET note = 'tamper'
     WHERE customer_id = '00000000-0000-0000-0000-0000000bc306'$$,
  'P0001', 'R17b ended responsibility immutable');
SELECT pg_temp.act_reset();

-- R13 Responsibility erzeugt keine globale Rolle/Permission.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c301');
SELECT pg_temp.assert(
  NOT public.has_permission('00000000-0000-0000-0000-00000000c301','project.edit')
  AND NOT public.has_permission('00000000-0000-0000-0000-00000000c301','users.manage')
  AND NOT public.has_permission('00000000-0000-0000-0000-00000000c301','customer.responsibility.manage'),
  'R13 responsibility grants no global permission');

-- R14 read-only Verantwortlicher kann Shared Projection nicht schreiben.
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.shared_project_projection
      (systemhouse_id, customer_id, source_id, name, legacy_client, status,
       published_by, source_revision, source_hash)
    VALUES ('00000000-0000-0000-0000-0000000ac301',
            '00000000-0000-0000-0000-0000000bc301','BSF03-R14','x','x','active',
            '00000000-0000-0000-0000-00000000c301',1,'h')$$,
  '42501', 'R14 read-only responsible cannot write shared projection');

-- R15 fremde Responsibility nicht unberechtigt beenden.
SELECT pg_temp.act_reset();
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c30a');
DO $$
DECLARE affected int;
BEGIN
  UPDATE public.customer_responsibility
     SET status = 'ended', valid_to = clock_timestamp()
   WHERE customer_id = '00000000-0000-0000-0000-0000000bc301';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'FAIL R15 (foreign responsibility was modified)';
  END IF;
  RAISE NOTICE 'PASS R15 foreign responsibility not modifiable';
END; $$;
SELECT pg_temp.act_reset();

-- R15b berechtigter Verwalter darf im eigenen Scope beenden (Lifecycle statt Hard Delete).
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c307');
DO $$
DECLARE affected int;
BEGIN
  UPDATE public.customer_responsibility
     SET status = 'ended', valid_to = clock_timestamp()
   WHERE customer_id = '00000000-0000-0000-0000-0000000bc304';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'FAIL R15b (manager could not end responsibility in own scope, rows=%)', affected;
  END IF;
  RAISE NOTICE 'PASS R15b manager can end responsibility in own scope';
END; $$;
SELECT pg_temp.act_reset();

-- R18 Rollen-Preview veraendert nur Darstellung, nie Serverrechte.
SELECT pg_temp.act_as_with_fake_role('00000000-0000-0000-0000-00000000c308','systemadministrator');
SELECT pg_temp.assert((
  SELECT count(*) = 0 FROM public.customer_responsibility
), 'R18a forged role claim grants no row visibility');
SELECT pg_temp.assert(
  NOT public.has_permission('00000000-0000-0000-0000-00000000c308','customer.responsibility.manage'),
  'R18b forged role claim grants no permission');
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_responsibility (systemhouse_id, customer_id, user_id)
    VALUES ('00000000-0000-0000-0000-0000000ac301',
            '00000000-0000-0000-0000-0000000bc305',
            '00000000-0000-0000-0000-00000000c30a')$$,
  '42501', 'R18c forged role claim cannot write');
SELECT pg_temp.act_reset();

-- ---------------------------------------------------------------------------
-- P1 T1–T12: serverseitige Target-Validation (Trigger) + Lifecycle
-- Kontext: Target-Eligibility liegt nicht mehr in den RLS-Policies, sondern im
-- nicht exponierten BEFORE-Trigger customer_responsibility_target_guard().
-- ---------------------------------------------------------------------------

-- Zusatzfixtures: C8 (positiver Fall), C9 (nur DENY-Faelle), C10 in SH2.
INSERT INTO public.customer (id, systemhouse_id, name, status) VALUES
  ('00000000-0000-0000-0000-0000000bc308','00000000-0000-0000-0000-0000000ac301','BSF03 C8','active'),
  ('00000000-0000-0000-0000-0000000bc309','00000000-0000-0000-0000-0000000ac301','BSF03 C9','active'),
  ('00000000-0000-0000-0000-0000000bc30a','00000000-0000-0000-0000-0000000ac302','BSF03 C10','active');

-- T0 Guard ist nicht fuer anon/authenticated ausfuehrbar (kein neuer Angriffspfad).
SELECT pg_temp.assert(
  NOT has_function_privilege('authenticated','public.customer_responsibility_target_guard()','EXECUTE')
  AND NOT has_function_privilege('anon','public.customer_responsibility_target_guard()','EXECUTE'),
  'T0 target guard not executable by anon/authenticated');

-- T1 Teamlead legt gueltige aktive Responsibility fuer fremden Engineer an (Root Cause behoben).
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c307');
INSERT INTO public.customer_responsibility (systemhouse_id, customer_id, user_id)
VALUES ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc308','00000000-0000-0000-0000-00000000c30a');
SELECT pg_temp.assert((
  SELECT count(*) = 1 FROM public.customer_responsibility
  WHERE customer_id = '00000000-0000-0000-0000-0000000bc308' AND status = 'active'
), 'T1 teamlead creates valid active responsibility for foreign engineer');

-- T2 viewer als Ziel -> DENY.
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_responsibility (systemhouse_id, customer_id, user_id)
    VALUES ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc309','00000000-0000-0000-0000-00000000c308')$$,
  '42501', 'T2 viewer target denied');

-- T3 customer als Ziel -> DENY.
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_responsibility (systemhouse_id, customer_id, user_id)
    VALUES ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc309','00000000-0000-0000-0000-00000000c309')$$,
  '42501', 'T3 customer target denied');
SELECT pg_temp.act_reset();

-- T4 inaktive Zielperson -> DENY.
UPDATE public.profiles SET status = 'inactive' WHERE id = '00000000-0000-0000-0000-00000000c30b';
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c307');
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_responsibility (systemhouse_id, customer_id, user_id)
    VALUES ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc309','00000000-0000-0000-0000-00000000c30b')$$,
  '42501', 'T4 inactive target denied');

-- T5 Ziel ohne aktive Membership im Systemhouse -> DENY.
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_responsibility (systemhouse_id, customer_id, user_id)
    VALUES ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc309','00000000-0000-0000-0000-00000000c306')$$,
  '42501', 'T5 target without active membership denied');

-- T6 Cross-Systemhouse (Manager ohne Membership in SH2) -> DENY.
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_responsibility (systemhouse_id, customer_id, user_id)
    VALUES ('00000000-0000-0000-0000-0000000ac302','00000000-0000-0000-0000-0000000bc30a','00000000-0000-0000-0000-00000000c305')$$,
  '42501', 'T6 cross systemhouse denied');
SELECT pg_temp.act_reset();

-- T7 Benutzer ohne customer.responsibility.manage -> DENY.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c30a');
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.customer_responsibility (systemhouse_id, customer_id, user_id)
    VALUES ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc309','00000000-0000-0000-0000-00000000c301')$$,
  '42501', 'T7 user without manage permission denied');
SELECT pg_temp.act_reset();

-- T8 active -> ended durch berechtigten Manager.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c307');
DO $$
DECLARE affected int;
BEGIN
  UPDATE public.customer_responsibility SET status = 'ended', valid_to = clock_timestamp()
   WHERE customer_id = '00000000-0000-0000-0000-0000000bc308';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'FAIL T8 (rows=%)', affected; END IF;
  RAISE NOTICE 'PASS T8 manager ends responsibility';
END; $$;
SELECT pg_temp.act_reset();

-- T9 active -> ended bleibt moeglich, obwohl Zielperson inzwischen inaktiv ist.
UPDATE public.profiles SET status = 'inactive' WHERE id = '00000000-0000-0000-0000-00000000c301';
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c307');
DO $$
DECLARE affected int;
BEGIN
  UPDATE public.customer_responsibility SET status = 'ended', valid_to = clock_timestamp()
   WHERE customer_id = '00000000-0000-0000-0000-0000000bc301';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'FAIL T9 (rows=%)', affected; END IF;
  RAISE NOTICE 'PASS T9 ending works after target deactivated';
END; $$;
SELECT pg_temp.act_reset();

-- T10 active -> ended bleibt moeglich, obwohl Ziel-Membership inzwischen inaktiv ist.
UPDATE public.systemhouse_membership SET status = 'inactive'
 WHERE user_id = '00000000-0000-0000-0000-00000000c302';
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c307');
DO $$
DECLARE affected int;
BEGIN
  UPDATE public.customer_responsibility SET status = 'ended', valid_to = clock_timestamp()
   WHERE customer_id = '00000000-0000-0000-0000-0000000bc302';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'FAIL T10 (rows=%)', affected; END IF;
  RAISE NOTICE 'PASS T10 ending works after target membership inactive';
END; $$;

-- T11 Identitaet unveraenderlich; Statuswechsel zurueck auf active bleibt gesperrt.
SELECT pg_temp.assert_denied(
  $$UPDATE public.customer_responsibility SET user_id = '00000000-0000-0000-0000-00000000c30a'
     WHERE customer_id = '00000000-0000-0000-0000-0000000bc305'$$,
  'P0001', 'T11a user_id immutable');
SELECT pg_temp.assert_denied(
  $$UPDATE public.customer_responsibility SET customer_id = '00000000-0000-0000-0000-0000000bc309'
     WHERE customer_id = '00000000-0000-0000-0000-0000000bc305'$$,
  'P0001', 'T11b customer_id immutable');
SELECT pg_temp.assert_denied(
  $$UPDATE public.customer_responsibility SET status = 'active', valid_to = NULL
     WHERE customer_id = '00000000-0000-0000-0000-0000000bc308'$$,
  'P0001', 'T11c ended responsibility cannot be reactivated');
SELECT pg_temp.act_reset();

-- T12 Manager kann nach Beendigung eine neue aktive Verantwortung fuer den Kunden vergeben.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000c307');
INSERT INTO public.customer_responsibility (systemhouse_id, customer_id, user_id)
VALUES ('00000000-0000-0000-0000-0000000ac301','00000000-0000-0000-0000-0000000bc308','00000000-0000-0000-0000-00000000c30a');
SELECT pg_temp.assert((
  SELECT count(*) FILTER (WHERE status = 'active') = 1
     AND count(*) FILTER (WHERE status = 'ended') = 1
  FROM public.customer_responsibility
  WHERE customer_id = '00000000-0000-0000-0000-0000000bc308'
), 'T12 new active responsibility after ended history');
SELECT pg_temp.act_reset();

-- ---------------------------------------------------------------------------
-- Abschluss: alle synthetischen Testdaten verwerfen.
-- ---------------------------------------------------------------------------

\echo 'PASS BSF-03 R01-R18 + P1 T0-T12 completed; rolling back synthetic test data.'
ROLLBACK;
