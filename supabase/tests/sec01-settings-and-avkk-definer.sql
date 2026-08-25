-- =====================================================================
-- SEC-01 / Issue #89 — Reproduzierbares DB/RLS-Testartefakt
--
-- Prüfgegenstand:
--   1. public.app_settings          — Allowlist-Lesbarkeit, Schreibschutz
--   2. public.avkk_people_directory() — akzeptiertes SECURITY-DEFINER-Design
--   3. public.avkk_can_write(uuid)  — DEFINER + search_path='' + Fachmatrix
--
-- WARNUNG / EINSATZKONTEXT
--   NICHT gegen Produktion ausführen. Ausschließlich für eine
--   disposable/local/staging Testdatenbank bestimmt.
--
-- VORAUSSETZUNGEN
--   1. Privilegierter Testkontext (Owner/Superuser-äquivalent, z. B.
--      `postgres` via lokalem psql): INSERT in auth.users, SET ROLE auf
--      `anon`/`authenticated`, Setzen von `request.jwt.claims`.
--      Ein reiner PostgREST-Anwendungszugang genügt NICHT.
--   2. Die SEC-01-Migration ist bereits angewendet.
--   3. Nur synthetische Testidentitäten; keine realen Daten.
--
-- AUSFÜHRUNG
--   psql "<test-db-connection>" -v ON_ERROR_STOP=1 \
--        -f supabase/tests/sec01-settings-and-avkk-definer.sql
--
-- SEMANTIK
--   Eine Transaktion, Abschluss mit ROLLBACK; keine Rückstände.
--   Fail-fast: jede unerwartete Beobachtung erzeugt RAISE EXCEPTION.
--
-- NICHT IN DIESER DATEI BEWEISBAR (separates Integrations-Test-Gate)
--   - Verhalten des PostgREST-Layers (HTTP-Statuscodes, apikey-Handling).
--   - Wirkung der Client-Fallbacks (`loadIdleTimeoutConfig`,
--     `selectRiskThreshold`) — das ist ein Vitest-Vertragstest, kein SQL-Test.
--   - Rollen-/Permission-Zuschnitt selbst: dieser Test liest die geltende
--     Matrix über `public.has_permission` und prüft die Sicherheitsgrenze
--     relativ dazu, statt eine Matrix zu duplizieren.
--
-- SYNTHETISCHE IDs
--   Benutzer 44444444-4444-4444-8444-0000000000NN
-- =====================================================================

\set ON_ERROR_STOP on

BEGIN;

SET LOCAL client_min_messages = warning;

-- ---------------------------------------------------------------------
-- Teil 0 — Katalogverträge (Vertrag A)
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  r record;
BEGIN
  -- 0.1 avkk_can_write: SECURITY DEFINER, search_path = '', kein PUBLIC/anon
  SELECT p.prosecdef,
         p.proconfig::text AS cfg,
         coalesce(array_to_string(p.proacl, ' | '), '') AS acl
    INTO r
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'avkk_can_write';

  IF r IS NULL THEN
    RAISE EXCEPTION 'SEC-01 0.1: public.avkk_can_write fehlt';
  END IF;
  IF NOT r.prosecdef THEN
    RAISE EXCEPTION 'SEC-01 0.1: avkk_can_write ist nicht SECURITY DEFINER (RLS-Rekursionsschutz)';
  END IF;
  IF r.cfg IS NULL OR r.cfg NOT LIKE '%search_path=""%' THEN
    RAISE EXCEPTION 'SEC-01 0.1: avkk_can_write hat keinen leeren search_path: %', r.cfg;
  END IF;
  -- PUBLIC-Grant erscheint in proacl als Eintrag ohne Grantee-Präfix ("=X/owner").
  IF r.acl ~ '(^|\| )=' THEN
    RAISE EXCEPTION 'SEC-01 0.1: avkk_can_write ist für PUBLIC ausführbar: %', r.acl;
  END IF;
  IF r.acl LIKE '%anon=%' THEN
    RAISE EXCEPTION 'SEC-01 0.1: avkk_can_write ist für anon ausführbar: %', r.acl;
  END IF;
  IF r.acl NOT LIKE '%authenticated=%' THEN
    RAISE EXCEPTION 'SEC-01 0.1: avkk_can_write ist für authenticated nicht ausführbar (Policies brechen): %', r.acl;
  END IF;

  -- 0.2 avkk_people_directory: identischer Vertrag
  SELECT p.prosecdef,
         p.proconfig::text AS cfg,
         coalesce(array_to_string(p.proacl, ' | '), '') AS acl
    INTO r
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'avkk_people_directory';

  IF r IS NULL THEN
    RAISE EXCEPTION 'SEC-01 0.2: public.avkk_people_directory fehlt';
  END IF;
  IF NOT r.prosecdef THEN
    RAISE EXCEPTION 'SEC-01 0.2: avkk_people_directory ist nicht SECURITY DEFINER';
  END IF;
  IF r.cfg IS NULL OR r.cfg NOT LIKE '%search_path=""%' THEN
    RAISE EXCEPTION 'SEC-01 0.2: avkk_people_directory hat keinen leeren search_path: %', r.cfg;
  END IF;
  IF r.acl ~ '(^|\| )=' THEN
    RAISE EXCEPTION 'SEC-01 0.2: avkk_people_directory ist für PUBLIC ausführbar: %', r.acl;
  END IF;
  IF r.acl LIKE '%anon=%' THEN
    RAISE EXCEPTION 'SEC-01 0.2: avkk_people_directory ist für anon ausführbar: %', r.acl;
  END IF;
END
$do$;

-- 0.3 Spaltenvertrag des Personenverzeichnisses (Vertrag C):
--     exakt vier Felder, keine Kontakt-, MFA- oder Bilddaten.
DO $do$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(a.name, ',' ORDER BY a.ord)
    INTO cols
    FROM (
      SELECT unnest(p.proargnames) AS name,
             generate_subscripts(p.proargnames, 1) AS ord,
             unnest(p.proargmodes) AS mode
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = 'avkk_people_directory'
    ) a
   WHERE a.mode = 't';

  IF cols IS DISTINCT FROM 'id,display_name,role,status' THEN
    RAISE EXCEPTION 'SEC-01 0.3: Rückgabevertrag geändert (erwartet id,display_name,role,status): %', cols;
  END IF;
  IF cols ~* '(email|phone|mfa|image)' THEN
    RAISE EXCEPTION 'SEC-01 0.3: Personenvertrag enthält Kontakt-/MFA-/Bilddaten: %', cols;
  END IF;
END
$do$;

-- 0.4 app_settings: keine pauschale SELECT-Policy mehr (Vertrag B)
DO $do$
DECLARE
  offending int;
  allowlisted int;
BEGIN
  SELECT count(*) INTO offending
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'app_settings'
     AND cmd = 'SELECT' AND btrim(coalesce(qual, '')) = 'true';
  IF offending > 0 THEN
    RAISE EXCEPTION 'SEC-01 0.4: app_settings besitzt weiterhin eine pauschale SELECT-Policy';
  END IF;

  SELECT count(*) INTO allowlisted
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'app_settings'
     AND cmd = 'SELECT'
     AND coalesce(qual, '') LIKE '%idle_timeout_minutes%';
  IF allowlisted < 1 THEN
    RAISE EXCEPTION 'SEC-01 0.4: Allowlist-SELECT-Policy auf app_settings fehlt';
  END IF;
END
$do$;

-- 0.5 Schreibregel unverändert: Änderungen nur mit users.manage
DO $do$
DECLARE
  guarded int;
BEGIN
  SELECT count(*) INTO guarded
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'app_settings'
     AND cmd IN ('INSERT', 'UPDATE')
     AND coalesce(with_check, '') LIKE '%users.manage%';
  IF guarded < 2 THEN
    RAISE EXCEPTION 'SEC-01 0.5: Schreibschutz users.manage auf app_settings fehlt';
  END IF;
END
$do$;

-- ---------------------------------------------------------------------
-- Teil 1 — Synthetische Identitäten (Muster: bsf-02b-…)
--   auth.users ZUERST (profiles.id hat FK auf auth.users.id).
-- ---------------------------------------------------------------------
INSERT INTO auth.users (id, email, aud, role, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
SELECT u.id,
       'sec01+' || u.tag || '@example.invalid',
       'authenticated', 'authenticated', now(), now(),
       '{}'::jsonb,
       jsonb_build_object('first_name', 'SEC01', 'last_name', u.tag)
FROM (VALUES
  ('44444444-4444-4444-8444-000000000001'::uuid, 'viewer'),
  ('44444444-4444-4444-8444-000000000002'::uuid, 'engineera'),
  ('44444444-4444-4444-8444-000000000003'::uuid, 'engineerb'),
  ('44444444-4444-4444-8444-000000000004'::uuid, 'teamlead'),
  ('44444444-4444-4444-8444-000000000005'::uuid, 'sysadmin')
) AS u(id, tag)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, first_name, last_name, display_name, email, status)
SELECT u.id, 'SEC01', 'Test', 'SEC01 Test ' || right(u.id::text, 2),
       'sec01+' || replace(u.id::text, '-', '') || '@example.invalid',
       'active'::public.user_status
  FROM auth.users u
 WHERE u.id::text LIKE '44444444-4444-4444-8444-%'
ON CONFLICT (id) DO UPDATE
  SET status = 'active'::public.user_status;

DELETE FROM public.user_roles
 WHERE user_id::text LIKE '44444444-4444-4444-8444-%';

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('44444444-4444-4444-8444-000000000001', 'viewer'::public.app_role),
  ('44444444-4444-4444-8444-000000000002', 'engineer'::public.app_role),
  ('44444444-4444-4444-8444-000000000003', 'engineer'::public.app_role),
  ('44444444-4444-4444-8444-000000000004', 'teamlead'::public.app_role),
  ('44444444-4444-4444-8444-000000000005', 'systemadministrator'::public.app_role)
ON CONFLICT DO NOTHING;

-- Gültiger AVKK-Sachverhalt (Schema-konform: subject_type/status aus dem
-- erlaubten Wertebereich), erstellt von engineer_a.
CREATE TEMP TABLE sec01_subject (id uuid) ON COMMIT DROP;

WITH ins AS (
  INSERT INTO public.avkk_subject
    (subject_type, subject_id, subject_title_snapshot, status, created_by)
  VALUES ('project', 'SEC-01-PROBE', 'SEC-01 Testsachverhalt', 'draft',
          '44444444-4444-4444-8444-000000000002')
  RETURNING id
)
INSERT INTO sec01_subject (id) SELECT id FROM ins;

DO $do$
BEGIN
  IF (SELECT count(*) FROM sec01_subject) <> 1 THEN
    RAISE EXCEPTION 'SEC-01 1.1: Test-Sachverhalt konnte nicht angelegt werden';
  END IF;
END
$do$;

-- Erwartungsanker: die geltende Rollenmatrix wird gelesen, nicht dupliziert.
DO $do$
BEGIN
  IF public.has_permission('44444444-4444-4444-8444-000000000001', 'avkk.edit') THEN
    RAISE EXCEPTION 'SEC-01 1.2: Viewer besitzt unerwartet avkk.edit — Testannahme ungültig';
  END IF;
  IF NOT public.has_permission('44444444-4444-4444-8444-000000000004', 'avkk.edit') THEN
    RAISE EXCEPTION 'SEC-01 1.3: Teamlead besitzt kein avkk.edit — Testannahme ungültig';
  END IF;
  IF NOT public.has_permission('44444444-4444-4444-8444-000000000005', 'users.manage') THEN
    RAISE EXCEPTION 'SEC-01 1.4: Systemadministrator besitzt kein users.manage — Testannahme ungültig';
  END IF;
  IF public.has_permission('44444444-4444-4444-8444-000000000001', 'users.manage') THEN
    RAISE EXCEPTION 'SEC-01 1.5: Viewer besitzt unerwartet users.manage — Testannahme ungültig';
  END IF;
END
$do$;

-- ---------------------------------------------------------------------
-- Teil 2 — avkk_can_write: Fachmatrix (Vertrag D)
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  subj uuid;
  v_viewer boolean;
  v_eng_a boolean;
  v_eng_b boolean;
  v_lead boolean;
BEGIN
  SELECT id INTO subj FROM sec01_subject;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', '44444444-4444-4444-8444-000000000001', 'role', 'authenticated')::text, true);
  v_viewer := public.avkk_can_write(subj);

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', '44444444-4444-4444-8444-000000000002', 'role', 'authenticated')::text, true);
  v_eng_a := public.avkk_can_write(subj);

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', '44444444-4444-4444-8444-000000000003', 'role', 'authenticated')::text, true);
  v_eng_b := public.avkk_can_write(subj);

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', '44444444-4444-4444-8444-000000000004', 'role', 'authenticated')::text, true);
  v_lead := public.avkk_can_write(subj);

  IF v_viewer THEN
    RAISE EXCEPTION 'SEC-01 2.1: Viewer ohne avkk.edit erhält Schreibrecht';
  END IF;
  IF NOT v_eng_a THEN
    RAISE EXCEPTION 'SEC-01 2.2: Engineer verliert Schreibrecht am eigenen Sachverhalt';
  END IF;
  IF v_eng_b THEN
    RAISE EXCEPTION 'SEC-01 2.3: Fremder Engineer erhält Schreibrecht ohne Verantwortung';
  END IF;
  IF NOT v_lead THEN
    RAISE EXCEPTION 'SEC-01 2.4: Teamleitung mit avkk.edit verliert Schreibrecht';
  END IF;
END
$do$;

-- 2.5 Rekursionsnachweis: UPDATE auf avkk_subject wertet avkk_subject_update
--     aus, die avkk_can_write aufruft.
DO $do$
DECLARE
  subj uuid;
BEGIN
  SELECT id INTO subj FROM sec01_subject;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', '44444444-4444-4444-8444-000000000002', 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    UPDATE public.avkk_subject SET status = 'active' WHERE id = subj;
  EXCEPTION WHEN others THEN
    RESET ROLE;
    IF SQLERRM ILIKE '%infinite recursion%' THEN
      RAISE EXCEPTION 'SEC-01 2.5: RLS-Rekursion in avkk_subject_update aufgetreten';
    END IF;
    RAISE;
  END;
  RESET ROLE;
END
$do$;

-- ---------------------------------------------------------------------
-- Teil 3 — app_settings: Allowlist und Schreibschutz (Vertrag B)
-- ---------------------------------------------------------------------
INSERT INTO public.app_settings (key, value)
VALUES ('sec01.probe.private', '"nicht-fuer-clients"'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_settings (key, value)
VALUES ('idle_timeout_minutes', '5'::jsonb),
       ('avkk.risk_threshold', '{"missingCount":1,"partialCount":2}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3.1/3.2 Normal authenticated (Viewer): Allowlist sichtbar, Probe-Key nicht
DO $do$
DECLARE
  visible int;
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', '44444444-4444-4444-8444-000000000001', 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO visible FROM public.app_settings WHERE key = 'sec01.probe.private';
  IF visible <> 0 THEN
    RESET ROLE;
    RAISE EXCEPTION 'SEC-01 3.1: Nicht freigegebener Key ist für Viewer sichtbar';
  END IF;

  SELECT count(*) INTO visible
    FROM public.app_settings
   WHERE key IN ('idle_timeout_minutes', 'avkk.risk_threshold');
  IF visible <> 2 THEN
    RESET ROLE;
    RAISE EXCEPTION 'SEC-01 3.2: Freigegebene Keys sind für Viewer nicht lesbar (%)', visible;
  END IF;

  RESET ROLE;
END
$do$;

-- 3.3 Normal authenticated darf nicht schreiben (INSERT und UPDATE)
DO $do$
DECLARE
  denied boolean;
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', '44444444-4444-4444-8444-000000000001', 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  denied := false;
  BEGIN
    INSERT INTO public.app_settings (key, value) VALUES ('sec01.probe.viewer', '1'::jsonb);
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    denied := true;
  END;
  IF NOT denied THEN
    RESET ROLE;
    RAISE EXCEPTION 'SEC-01 3.3: Viewer konnte app_settings einfügen';
  END IF;

  denied := false;
  BEGIN
    UPDATE public.app_settings SET value = '999'::jsonb WHERE key = 'idle_timeout_minutes';
    IF NOT FOUND THEN
      denied := true; -- Policy filtert die Zeile heraus
    END IF;
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    denied := true;
  END;
  IF NOT denied THEN
    RESET ROLE;
    RAISE EXCEPTION 'SEC-01 3.4: Viewer konnte app_settings ändern';
  END IF;

  RESET ROLE;
END
$do$;

-- 3.5/3.6 users.manage: sieht Probe-Key und darf schreiben
DO $do$
DECLARE
  visible int;
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', '44444444-4444-4444-8444-000000000005', 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO visible FROM public.app_settings WHERE key = 'sec01.probe.private';
  IF visible <> 1 THEN
    RESET ROLE;
    RAISE EXCEPTION 'SEC-01 3.5: users.manage sieht den privaten Key nicht';
  END IF;

  UPDATE public.app_settings SET value = '"geaendert"'::jsonb WHERE key = 'sec01.probe.private';
  IF NOT FOUND THEN
    RESET ROLE;
    RAISE EXCEPTION 'SEC-01 3.6: users.manage kann app_settings nicht mehr schreiben';
  END IF;

  RESET ROLE;
END
$do$;

-- ---------------------------------------------------------------------
-- Teil 4 — avkk_people_directory: Laufzeitvertrag (Vertrag C)
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  cnt int;
  has_view boolean;
BEGIN
  -- 4.1 Benutzer ohne avkk.view erhält keine Zeilen
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', '44444444-4444-4444-8444-000000000001', 'role', 'authenticated')::text, true);
  has_view := public.has_permission('44444444-4444-4444-8444-000000000001', 'avkk.view');
  SELECT count(*) INTO cnt FROM public.avkk_people_directory();
  IF NOT has_view AND cnt <> 0 THEN
    RAISE EXCEPTION 'SEC-01 4.1: Benutzer ohne avkk.view erhält % Zeilen', cnt;
  END IF;

  -- 4.2 Benutzer mit avkk.view kann den minimalen Vertrag nutzen
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', '44444444-4444-4444-8444-000000000004', 'role', 'authenticated')::text, true);
  IF NOT public.has_permission('44444444-4444-4444-8444-000000000004', 'avkk.view') THEN
    RAISE EXCEPTION 'SEC-01 4.2: Teamlead besitzt kein avkk.view — Testannahme ungültig';
  END IF;
  PERFORM * FROM public.avkk_people_directory();
END
$do$;

-- 4.3 Kein anonymer Zugriff auf die Funktion
DO $do$
DECLARE
  denied boolean := false;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM * FROM public.avkk_people_directory();
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  RESET ROLE;
  IF NOT denied THEN
    RAISE EXCEPTION 'SEC-01 4.3: anon konnte avkk_people_directory ausführen';
  END IF;
END
$do$;

-- ---------------------------------------------------------------------
-- Teil 5 — Abschluss: keine Rückstände (Vertrag E)
-- ---------------------------------------------------------------------
ROLLBACK;
