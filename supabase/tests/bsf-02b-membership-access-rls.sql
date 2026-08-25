-- =====================================================================
-- BSF-02B — Reproduzierbares DB/RLS-Testartefakt (Issue #86)
-- Prüfgegenstand: public.systemhouse, public.customer,
--                 public.systemhouse_membership, public.customer_access
--                 public.has_active_systemhouse_membership(uuid, uuid)
--                 public.has_customer_access(uuid, uuid, uuid, text)
-- Basis: supabase/migrations/20260825090229_71d33100-99d6-4021-bbfb-8b3bcade4436.sql
--
-- WARNUNG / EINSATZKONTEXT
--   NICHT ungeprüft gegen Produktion ausführen.
--   Ausschließlich für eine disposable/local/staging Testdatenbank oder
--   einen ausdrücklich freigegebenen Testkontext bestimmt.
--
-- VORAUSSETZUNGEN
--   1. Ausführung mit einem ausreichend privilegierten DB-Testkontext
--      (Owner/Superuser-äquivalent, z. B. `postgres` via lokalem psql).
--      Benötigt: INSERT in auth.users und public.profiles, SET ROLE auf
--      `anon` und `authenticated`, Setzen von `request.jwt.claims`.
--      Ein reiner PostgREST-/Anwendungszugang genügt NICHT.
--   2. Die BSF-02B-Migration ist bereits angewendet.
--   3. Nur synthetische Testidentitäten; keine realen Benutzer- oder
--      Kundendaten.
--
-- AUSFÜHRUNG
--   psql "<test-db-connection>" -v ON_ERROR_STOP=1 \
--        -f supabase/tests/bsf-02b-membership-access-rls.sql
--
-- SEMANTIK
--   Alles läuft in EINER Transaktion und endet mit ROLLBACK; es bleiben
--   weder Testdaten noch Hilfsobjekte zurück.
--   Fail-fast: jede unerwartete Beobachtung erzeugt RAISE EXCEPTION,
--   ein Testlauf kann daher nicht fälschlich PASS melden.
--
-- SYNTHETISCHE IDs
--   systemhouse A 11111111-1111-4111-8111-000000000001
--   systemhouse B 11111111-1111-4111-8111-000000000002
--   customer  A1  22222222-2222-4222-8222-000000000001
--   customer  A2  22222222-2222-4222-8222-000000000002
--   customer  B1  22222222-2222-4222-8222-000000000003
--   Benutzer      33333333-3333-4333-8333-0000000000NN
-- =====================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ---------------------------------------------------------------------
-- Seed (privilegierter Kontext, RLS wird hier bewusst nicht getestet)
-- ---------------------------------------------------------------------

INSERT INTO auth.users (id, email, aud, role, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
SELECT u.id,
       'bsf02b+' || u.tag || '@example.invalid',
       'authenticated', 'authenticated', now(), now(),
       '{}'::jsonb,
       jsonb_build_object('first_name', 'BSF02B', 'last_name', u.tag)
FROM (VALUES
  ('33333333-3333-4333-8333-000000000001'::uuid, 'nomember'),
  ('33333333-3333-4333-8333-000000000002'::uuid, 'memnogrant'),
  ('33333333-3333-4333-8333-000000000003'::uuid, 'read'),
  ('33333333-3333-4333-8333-000000000004'::uuid, 'write'),
  ('33333333-3333-4333-8333-000000000005'::uuid, 'meminactive'),
  ('33333333-3333-4333-8333-000000000006'::uuid, 'memfuture'),
  ('33333333-3333-4333-8333-000000000007'::uuid, 'memexpired'),
  ('33333333-3333-4333-8333-000000000008'::uuid, 'grantinactive'),
  ('33333333-3333-4333-8333-000000000009'::uuid, 'grantfuture'),
  ('33333333-3333-4333-8333-000000000010'::uuid, 'grantexpired'),
  ('33333333-3333-4333-8333-000000000011'::uuid, 'grantnomem'),
  ('33333333-3333-4333-8333-000000000012'::uuid, 'sysadmin'),
  ('33333333-3333-4333-8333-000000000013'::uuid, 'profinactive'),
  ('33333333-3333-4333-8333-000000000015'::uuid, 'cascade')
) AS u(id, tag);

-- profiles: unabhängig davon, ob ein auth-Trigger bereits angelegt hat
INSERT INTO public.profiles (id, first_name, last_name, display_name, email, status)
SELECT u.id, 'BSF02B', 'Test', 'BSF02B Test',
       'bsf02b+' || replace(u.id::text, '-', '') || '@example.invalid',
       'active'::public.user_status
FROM auth.users u
WHERE u.id::text LIKE '33333333-3333-4333-8333-%'
ON CONFLICT (id) DO UPDATE
  SET status = 'active'::public.user_status;

-- Test 20 benötigt eine globale Rolle; zugleich bleibt so mindestens ein
-- aktiver Systemadministrator bestehen (Schutz-Trigger).
INSERT INTO public.user_roles (user_id, role)
VALUES ('33333333-3333-4333-8333-000000000012', 'systemadministrator'::public.app_role)
ON CONFLICT DO NOTHING;

DELETE FROM public.user_roles
WHERE user_id::text LIKE '33333333-3333-4333-8333-%'
  AND user_id <> '33333333-3333-4333-8333-000000000012';

INSERT INTO public.systemhouse (id, name) VALUES
  ('11111111-1111-4111-8111-000000000001', 'BSF02B Systemhaus A'),
  ('11111111-1111-4111-8111-000000000002', 'BSF02B Systemhaus B');

INSERT INTO public.customer (id, systemhouse_id, name) VALUES
  ('22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-000000000001', 'BSF02B Kunde A1'),
  ('22222222-2222-4222-8222-000000000002', '11111111-1111-4111-8111-000000000001', 'BSF02B Kunde A2'),
  ('22222222-2222-4222-8222-000000000003', '11111111-1111-4111-8111-000000000002', 'BSF02B Kunde B1');

INSERT INTO public.systemhouse_membership (systemhouse_id, user_id, status, valid_from, valid_to) VALUES
  ('11111111-1111-4111-8111-000000000001', '33333333-3333-4333-8333-000000000002', 'active',   NULL, NULL),
  ('11111111-1111-4111-8111-000000000001', '33333333-3333-4333-8333-000000000003', 'active',   NULL, NULL),
  ('11111111-1111-4111-8111-000000000001', '33333333-3333-4333-8333-000000000004', 'active',   NULL, NULL),
  ('11111111-1111-4111-8111-000000000001', '33333333-3333-4333-8333-000000000005', 'inactive', NULL, NULL),
  ('11111111-1111-4111-8111-000000000001', '33333333-3333-4333-8333-000000000006', 'active',   now() + interval '10 days', NULL),
  ('11111111-1111-4111-8111-000000000001', '33333333-3333-4333-8333-000000000007', 'active',   now() - interval '30 days', now() - interval '1 day'),
  ('11111111-1111-4111-8111-000000000001', '33333333-3333-4333-8333-000000000008', 'active',   NULL, NULL),
  ('11111111-1111-4111-8111-000000000001', '33333333-3333-4333-8333-000000000009', 'active',   NULL, NULL),
  ('11111111-1111-4111-8111-000000000001', '33333333-3333-4333-8333-000000000010', 'active',   NULL, NULL),
  ('11111111-1111-4111-8111-000000000001', '33333333-3333-4333-8333-000000000013', 'active',   NULL, NULL),
  ('11111111-1111-4111-8111-000000000001', '33333333-3333-4333-8333-000000000015', 'active',   NULL, NULL);

INSERT INTO public.customer_access
  (systemhouse_id, customer_id, user_id, access_level, status, valid_from, valid_to) VALUES
  ('11111111-1111-4111-8111-000000000001', '22222222-2222-4222-8222-000000000001', '33333333-3333-4333-8333-000000000003', 'read',  'active',   NULL, NULL),
  ('11111111-1111-4111-8111-000000000001', '22222222-2222-4222-8222-000000000001', '33333333-3333-4333-8333-000000000004', 'write', 'active',   NULL, NULL),
  ('11111111-1111-4111-8111-000000000001', '22222222-2222-4222-8222-000000000001', '33333333-3333-4333-8333-000000000008', 'read',  'inactive', NULL, NULL),
  ('11111111-1111-4111-8111-000000000001', '22222222-2222-4222-8222-000000000001', '33333333-3333-4333-8333-000000000009', 'read',  'active',   now() + interval '10 days', NULL),
  ('11111111-1111-4111-8111-000000000001', '22222222-2222-4222-8222-000000000001', '33333333-3333-4333-8333-000000000010', 'read',  'active',   now() - interval '30 days', now() - interval '1 day'),
  ('11111111-1111-4111-8111-000000000001', '22222222-2222-4222-8222-000000000001', '33333333-3333-4333-8333-000000000011', 'read',  'active',   NULL, NULL),
  ('11111111-1111-4111-8111-000000000001', '22222222-2222-4222-8222-000000000001', '33333333-3333-4333-8333-000000000013', 'read',  'active',   NULL, NULL),
  ('11111111-1111-4111-8111-000000000001', '22222222-2222-4222-8222-000000000001', '33333333-3333-4333-8333-000000000015', 'read',  'active',   NULL, NULL);

-- Benutzer 13: Membership + Grant vorhanden, Account jedoch nicht aktiv
UPDATE public.profiles
   SET status = 'inactive'::public.user_status
 WHERE id = '33333333-3333-4333-8333-000000000013';

-- ---------------------------------------------------------------------
-- Test 01 — anon hat keinerlei Zugriff auf die vier neuen Tabellen
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  t text;
  denied boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY['systemhouse','customer','systemhouse_membership','customer_access'] LOOP
    denied := false;
    BEGIN
      SET LOCAL ROLE anon;
      EXECUTE format('SELECT 1 FROM public.%I LIMIT 1', t);
      RESET ROLE;
    EXCEPTION WHEN insufficient_privilege THEN
      RESET ROLE;
      denied := true;
    END;
    RESET ROLE;
    IF NOT denied THEN
      RAISE EXCEPTION 'FAIL 01: anon konnte public.% lesen', t;
    END IF;
  END LOOP;
END
$do$;

-- ---------------------------------------------------------------------
-- Tests 02, 03, 04, 05, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 20, 21
-- Sichtbarkeit von public.customer je Testidentität
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  c record;
  v_cnt int;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      ('02 ohne Membership',                  '33333333-3333-4333-8333-000000000001'::uuid, 0),
      ('03 Membership ohne Grant',            '33333333-3333-4333-8333-000000000002'::uuid, 0),
      ('04 Membership + read Grant',          '33333333-3333-4333-8333-000000000003'::uuid, 1),
      ('05 Membership + write Grant',         '33333333-3333-4333-8333-000000000004'::uuid, 1),
      ('10 inaktive Membership',              '33333333-3333-4333-8333-000000000005'::uuid, 0),
      ('11 Membership valid_from Zukunft',    '33333333-3333-4333-8333-000000000006'::uuid, 0),
      ('12 Membership abgelaufen',            '33333333-3333-4333-8333-000000000007'::uuid, 0),
      ('13 inaktiver Customer Grant',         '33333333-3333-4333-8333-000000000008'::uuid, 0),
      ('14 Customer Grant valid_from Zukunft','33333333-3333-4333-8333-000000000009'::uuid, 0),
      ('15 Customer Grant abgelaufen',        '33333333-3333-4333-8333-000000000010'::uuid, 0),
      ('16 Grant ohne aktive Membership',     '33333333-3333-4333-8333-000000000011'::uuid, 0),
      ('20 globale Rolle systemadministrator, KEINE Membership, KEIN Customer Grant -> DENY', '33333333-3333-4333-8333-000000000012'::uuid, 0),
      ('21 profiles.status != active',        '33333333-3333-4333-8333-000000000013'::uuid, 0)
    ) AS v(label, uid, expected)
  LOOP
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', c.uid::text, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO v_cnt FROM public.customer;
    RESET ROLE;
    IF v_cnt <> c.expected THEN
      RAISE EXCEPTION 'FAIL %: erwartet % sichtbare Customer, tatsaechlich %',
        c.label, c.expected, v_cnt;
    END IF;
  END LOOP;
END
$do$;

-- ---------------------------------------------------------------------
-- Test 07 Cross-Systemhouse / Test 08 Cross-Customer / Test 09 IDOR
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  v_cnt int;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"33333333-3333-4333-8333-000000000003","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO v_cnt FROM public.customer
   WHERE systemhouse_id = '11111111-1111-4111-8111-000000000002';
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'FAIL 07: Cross-Systemhouse sichtbar (%)', v_cnt; END IF;

  SELECT count(*) INTO v_cnt FROM public.customer
   WHERE id = '22222222-2222-4222-8222-000000000002';
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'FAIL 08: Cross-Customer sichtbar (%)', v_cnt; END IF;

  SELECT count(*) INTO v_cnt FROM public.customer
   WHERE id = '22222222-2222-4222-8222-000000000003';
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'FAIL 09: erratene Customer-ID lieferte Fremddaten (%)', v_cnt; END IF;

  SELECT count(*) INTO v_cnt FROM public.systemhouse
   WHERE id = '11111111-1111-4111-8111-000000000002';
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'FAIL 07: fremdes Systemhaus sichtbar (%)', v_cnt; END IF;

  RESET ROLE;
END
$do$;

-- ---------------------------------------------------------------------
-- Test 06 — read Grant erlaubt keinen Schreibzugriff auf public.customer
-- ---------------------------------------------------------------------
DO $do$
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claims',
      '{"sub":"33333333-3333-4333-8333-000000000003","role":"authenticated"}', true);
    SET LOCAL ROLE authenticated;
    UPDATE public.customer SET name = 'tampered'
     WHERE id = '22222222-2222-4222-8222-000000000001';
    RESET ROLE;
    RAISE EXCEPTION 'FAIL 06: read Grant konnte public.customer schreiben';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
  END;
  RESET ROLE;
END
$do$;

-- ---------------------------------------------------------------------
-- Tests 17 / 18 — authenticated darf Membership und Access nicht schreiben
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  stmts text[] := ARRAY[
    $s$INSERT INTO public.systemhouse_membership (systemhouse_id, user_id)
       VALUES ('11111111-1111-4111-8111-000000000001','33333333-3333-4333-8333-000000000001')$s$,
    $s$UPDATE public.systemhouse_membership SET status = 'active'$s$,
    $s$DELETE FROM public.systemhouse_membership$s$,
    $s$INSERT INTO public.customer_access (systemhouse_id, customer_id, user_id, access_level)
       VALUES ('11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000001',
               '33333333-3333-4333-8333-000000000001','write')$s$,
    $s$UPDATE public.customer_access SET access_level = 'write'$s$,
    $s$DELETE FROM public.customer_access$s$
  ];
  s text;
  denied boolean;
BEGIN
  FOREACH s IN ARRAY stmts LOOP
    denied := false;
    BEGIN
      PERFORM set_config('request.jwt.claims',
        '{"sub":"33333333-3333-4333-8333-000000000003","role":"authenticated"}', true);
      SET LOCAL ROLE authenticated;
      EXECUTE s;
      RESET ROLE;
    EXCEPTION WHEN insufficient_privilege THEN
      RESET ROLE;
      denied := true;
    END;
    RESET ROLE;
    IF NOT denied THEN
      RAISE EXCEPTION 'FAIL 17/18: authenticated konnte ausfuehren: %', s;
    END IF;
  END LOOP;
END
$do$;

-- ---------------------------------------------------------------------
-- Test 19 — Cross-Systemhouse-Kombination scheitert am Composite-FK
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.customer_access (systemhouse_id, customer_id, user_id, access_level)
    VALUES ('11111111-1111-4111-8111-000000000002',
            '22222222-2222-4222-8222-000000000001',
            '33333333-3333-4333-8333-000000000003', 'read');
  EXCEPTION WHEN foreign_key_violation THEN
    blocked := true;
  END;
  IF NOT blocked THEN
    RAISE EXCEPTION 'FAIL 19: Cross-Systemhouse customer_access wurde akzeptiert';
  END IF;
END
$do$;

-- ---------------------------------------------------------------------
-- Tests 22 / 23 und ungültiger bzw. NULL required_level
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  v boolean;
BEGIN
  -- 22: write Grant erfuellt read
  PERFORM set_config('request.jwt.claims',
    '{"sub":"33333333-3333-4333-8333-000000000004","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT public.has_customer_access('33333333-3333-4333-8333-000000000004',
           '11111111-1111-4111-8111-000000000001',
           '22222222-2222-4222-8222-000000000001', 'read') INTO v;
  RESET ROLE;
  IF v IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FAIL 22: write Grant erfuellt read nicht (%)', v;
  END IF;

  -- 23: read Grant erfuellt write nicht
  PERFORM set_config('request.jwt.claims',
    '{"sub":"33333333-3333-4333-8333-000000000003","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT public.has_customer_access('33333333-3333-4333-8333-000000000003',
           '11111111-1111-4111-8111-000000000001',
           '22222222-2222-4222-8222-000000000001', 'write') INTO v;
  IF COALESCE(v, false) THEN
    RESET ROLE;
    RAISE EXCEPTION 'FAIL 23: read Grant erfuellte write';
  END IF;

  -- ungueltiger Level
  SELECT public.has_customer_access('33333333-3333-4333-8333-000000000003',
           '11111111-1111-4111-8111-000000000001',
           '22222222-2222-4222-8222-000000000001', 'admin') INTO v;
  IF COALESCE(v, false) THEN
    RESET ROLE;
    RAISE EXCEPTION 'FAIL: ungueltiger required_level lieferte true';
  END IF;

  -- NULL Level
  SELECT public.has_customer_access('33333333-3333-4333-8333-000000000003',
           '11111111-1111-4111-8111-000000000001',
           '22222222-2222-4222-8222-000000000001', NULL) INTO v;
  IF COALESCE(v, false) THEN
    RESET ROLE;
    RAISE EXCEPTION 'FAIL: NULL required_level lieferte true';
  END IF;

  -- NULL Benutzer
  SELECT public.has_customer_access(NULL,
           '11111111-1111-4111-8111-000000000001',
           '22222222-2222-4222-8222-000000000001', 'read') INTO v;
  IF COALESCE(v, false) THEN
    RESET ROLE;
    RAISE EXCEPTION 'FAIL: NULL _user_id lieferte true';
  END IF;

  RESET ROLE;
END
$do$;

-- ---------------------------------------------------------------------
-- Test 25 — self-only SELECT auf Membership und Customer Access
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  v_cnt int;
  v_foreign int;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"33333333-3333-4333-8333-000000000003","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) FILTER (WHERE true),
         count(*) FILTER (WHERE user_id <> '33333333-3333-4333-8333-000000000003')
    INTO v_cnt, v_foreign
    FROM public.systemhouse_membership;
  IF v_cnt <> 1 OR v_foreign <> 0 THEN
    RESET ROLE;
    RAISE EXCEPTION 'FAIL 25: Membership self-only verletzt (gesamt %, fremd %)', v_cnt, v_foreign;
  END IF;

  SELECT count(*) FILTER (WHERE true),
         count(*) FILTER (WHERE user_id <> '33333333-3333-4333-8333-000000000003')
    INTO v_cnt, v_foreign
    FROM public.customer_access;
  IF v_cnt <> 1 OR v_foreign <> 0 THEN
    RESET ROLE;
    RAISE EXCEPTION 'FAIL 25: Customer-Access self-only verletzt (gesamt %, fremd %)', v_cnt, v_foreign;
  END IF;

  RESET ROLE;
END
$do$;

-- ---------------------------------------------------------------------
-- Test 24 — Profil-Löschung kaskadiert Membership/Access,
--           Systemhouse und Customer bleiben bestehen
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  v_mem int;
  v_acc int;
  v_sys int;
  v_cus int;
BEGIN
  DELETE FROM public.profiles WHERE id = '33333333-3333-4333-8333-000000000015';

  SELECT count(*) INTO v_mem FROM public.systemhouse_membership
   WHERE user_id = '33333333-3333-4333-8333-000000000015';
  SELECT count(*) INTO v_acc FROM public.customer_access
   WHERE user_id = '33333333-3333-4333-8333-000000000015';
  SELECT count(*) INTO v_sys FROM public.systemhouse
   WHERE id::text LIKE '11111111-1111-4111-8111-%';
  SELECT count(*) INTO v_cus FROM public.customer
   WHERE id::text LIKE '22222222-2222-4222-8222-%';

  IF v_mem <> 0 OR v_acc <> 0 THEN
    RAISE EXCEPTION 'FAIL 24: Kaskade unvollstaendig (membership %, access %)', v_mem, v_acc;
  END IF;
  IF v_sys <> 2 OR v_cus <> 3 THEN
    RAISE EXCEPTION 'FAIL 24: Systemhouse/Customer unerwartet veraendert (% / %)', v_sys, v_cus;
  END IF;
END
$do$;

-- ---------------------------------------------------------------------
-- Abschluss: keine Persistenz
-- ---------------------------------------------------------------------
RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);
SELECT 'BSF-02B RLS-Testmatrix 01-25: PASS' AS result;

ROLLBACK;
