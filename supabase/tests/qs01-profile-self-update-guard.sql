-- =====================================================================
-- QS-01 Migration A — DB-Vertrag fuer den Schutz des Profil-Selbstupdates
-- Nur disposable/local/staging Testdatenbank. Alles endet mit ROLLBACK.
--
-- T01 Funktion ist SECURITY INVOKER und fuer anon/authenticated nicht ausfuehrbar
-- T02 Nutzer darf Anzeigefelder des eigenen Profils aendern
-- T03 Nutzer darf status des eigenen Profils nicht aendern
-- T04 Nutzer darf email, mfa_enabled und created_at nicht aendern
-- T05 deaktiviertes Konto darf das eigene Profil nicht mehr aendern
-- T06 Nutzer darf fremdes Profil nicht aendern
-- T07 Administrator darf status eines fremden Profils weiterhin aendern
-- T08 privilegierte Rolle (postgres) bleibt unbeschraenkt
-- =====================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Der erste auth.users-Datensatz wird per Bootstrap Systemadministrator und dient
-- als Last-Sysadmin-Guard fuer die folgenden Testkonten.
INSERT INTO auth.users (id, email, aud, role, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
VALUES
  ('77777777-7777-4777-8777-000000000000', 'qs01-guard@example.invalid',
   'authenticated', 'authenticated', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('77777777-7777-4777-8777-000000000001', 'qs01-viewer-a@example.invalid',
   'authenticated', 'authenticated', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('77777777-7777-4777-8777-000000000002', 'qs01-admin@example.invalid',
   'authenticated', 'authenticated', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('77777777-7777-4777-8777-000000000003', 'qs01-viewer-b@example.invalid',
   'authenticated', 'authenticated', now(), now(), '{}'::jsonb, '{}'::jsonb);

DELETE FROM public.user_roles
WHERE user_id = '77777777-7777-4777-8777-000000000002'::uuid;
INSERT INTO public.user_roles (user_id, role)
VALUES ('77777777-7777-4777-8777-000000000002', 'administrator'::public.app_role);

-- T01
DO $do$
DECLARE
  v_secdef boolean;
BEGIN
  SELECT p.prosecdef INTO v_secdef
  FROM pg_proc p
  WHERE p.oid = 'public.guard_profile_self_update()'::regprocedure;

  IF v_secdef THEN
    RAISE EXCEPTION 'FAIL T01: guard_profile_self_update ist SECURITY DEFINER';
  END IF;

  IF has_function_privilege('anon', 'public.guard_profile_self_update()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.guard_profile_self_update()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL T01: guard_profile_self_update ist fuer anon/authenticated ausfuehrbar';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.profiles'::regclass
      AND tgname = 'trg_profiles_guard_self_update'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'FAIL T01: Trigger trg_profiles_guard_self_update fehlt';
  END IF;
END
$do$;

-- Ab hier als authentifizierter Nutzer A (viewer)
SELECT set_config('request.jwt.claims',
  '{"sub":"77777777-7777-4777-8777-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

-- T02
DO $do$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.profiles
  SET display_name = 'QS01 Anzeige', phone = '+49 000', first_name = 'Q', last_name = 'S'
  WHERE id = '77777777-7777-4777-8777-000000000001';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'FAIL T02: Anzeigefelder des eigenen Profils nicht aenderbar (% Zeilen)', v_rows;
  END IF;
END
$do$;

-- T03
DO $do$
BEGIN
  BEGIN
    UPDATE public.profiles SET status = 'locked'
    WHERE id = '77777777-7777-4777-8777-000000000001';
    RAISE EXCEPTION 'FAIL T03: Selbstaenderung von status wurde akzeptiert';
  EXCEPTION
    WHEN insufficient_privilege THEN
      IF SQLERRM <> 'profile_self_update_forbidden_columns' THEN
        RAISE EXCEPTION 'FAIL T03: falscher Fehler: %', SQLERRM;
      END IF;
  END;
END
$do$;

-- T04
DO $do$
DECLARE
  v_col text;
  v_sql text;
BEGIN
  FOREACH v_col IN ARRAY ARRAY['email', 'mfa_enabled', 'created_at']
  LOOP
    v_sql := CASE v_col
      WHEN 'email' THEN $q$UPDATE public.profiles SET email = 'x@example.invalid' WHERE id = '77777777-7777-4777-8777-000000000001'$q$
      WHEN 'mfa_enabled' THEN $q$UPDATE public.profiles SET mfa_enabled = true WHERE id = '77777777-7777-4777-8777-000000000001'$q$
      ELSE $q$UPDATE public.profiles SET created_at = now() - interval '1 year' WHERE id = '77777777-7777-4777-8777-000000000001'$q$
    END;
    BEGIN
      EXECUTE v_sql;
      RAISE EXCEPTION 'FAIL T04: Selbstaenderung von % wurde akzeptiert', v_col;
    EXCEPTION
      WHEN insufficient_privilege THEN
        IF SQLERRM <> 'profile_self_update_forbidden_columns' THEN
          RAISE EXCEPTION 'FAIL T04: falscher Fehler fuer %: %', v_col, SQLERRM;
        END IF;
    END;
  END LOOP;
END
$do$;

-- T06: fremdes Profil
DO $do$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.profiles SET display_name = 'Fremd'
  WHERE id = '77777777-7777-4777-8777-000000000003';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN
    RAISE EXCEPTION 'FAIL T06: fremdes Profil wurde geaendert (% Zeilen)', v_rows;
  END IF;
END
$do$;

RESET ROLE;

-- T05: Konto deaktivieren (privilegiert), danach darf Nutzer A nichts mehr aendern
UPDATE public.profiles SET status = 'inactive'
WHERE id = '77777777-7777-4777-8777-000000000001';

SELECT set_config('request.jwt.claims',
  '{"sub":"77777777-7777-4777-8777-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $do$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.profiles SET display_name = 'Inaktiv'
  WHERE id = '77777777-7777-4777-8777-000000000001';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN
    RAISE EXCEPTION 'FAIL T05: deaktiviertes Konto konnte das eigene Profil aendern (% Zeilen)', v_rows;
  END IF;
END
$do$;

RESET ROLE;

-- T07: Administrator aendert status eines fremden Profils
SELECT set_config('request.jwt.claims',
  '{"sub":"77777777-7777-4777-8777-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $do$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.profiles SET status = 'locked', display_name = 'Von Admin'
  WHERE id = '77777777-7777-4777-8777-000000000003';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'FAIL T07: Administrator konnte fremdes Profil nicht aendern (% Zeilen)', v_rows;
  END IF;
END
$do$;

RESET ROLE;

-- T08: privilegierte Rolle bleibt unbeschraenkt
DO $do$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.profiles SET status = 'active', email = 'neu@example.invalid'
  WHERE id = '77777777-7777-4777-8777-000000000001';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'FAIL T08: privilegierte Rolle ist eingeschraenkt (% Zeilen)', v_rows;
  END IF;
END
$do$;

SELECT 'PASS qs01-profile-self-update-guard T01-T08' AS result;

ROLLBACK;
