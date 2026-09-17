-- =====================================================================
-- BSF-KIOSK-01 — DB-Vertrag fuer kiosk / kiosk.view
-- Nur disposable/local/staging Testdatenbank. Alles endet mit ROLLBACK.
-- =====================================================================

\set ON_ERROR_STOP on

BEGIN;

-- T00: KIOSK-01 darf den bestehenden Security-Invoker-Vertrag der zentralen
-- Permission-Funktion nicht auf SECURITY DEFINER zuruecksetzen.
DO $do$
DECLARE
  v_prosecdef boolean;
BEGIN
  SELECT p.prosecdef
  INTO v_prosecdef
  FROM pg_proc p
  WHERE p.oid = 'public.has_permission(uuid,text)'::regprocedure;

  IF v_prosecdef THEN
    RAISE EXCEPTION 'FAIL T00: has_permission ist unerwartet SECURITY DEFINER';
  END IF;
END
$do$;

-- Eine komplett leere, aus Migrationen rekonstruierte Datenbank weist dem
-- ersten auth.users-Datensatz absichtlich systemadministrator zu. Dieser
-- synthetische Guard bleibt waehrend des Vertrags bestehen, damit die
-- eigentlichen Kiosk-Testkonten gefahrlos auf ihre Rollen neutralisiert
-- werden koennen, ohne den Last-Sysadmin-Schutz zu umgehen.
INSERT INTO auth.users (id, email, aud, role, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
VALUES
  ('66666666-6666-4666-8666-000000000000', 'kiosk-guard-sysadmin@example.invalid',
   'authenticated', 'authenticated', now(), now(), '{}'::jsonb, '{}'::jsonb);

INSERT INTO auth.users (id, email, aud, role, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
VALUES
  ('66666666-6666-4666-8666-000000000001', 'kiosk-role@example.invalid',
   'authenticated', 'authenticated', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('66666666-6666-4666-8666-000000000002', 'normal-role@example.invalid',
   'authenticated', 'authenticated', now(), now(), '{}'::jsonb, '{}'::jsonb);

-- Bootstrap-Trigger vergibt nach dem Guard viewer. Fuer den Vertragsaufbau neutralisieren.
DELETE FROM public.user_roles
WHERE user_id IN (
  '66666666-6666-4666-8666-000000000001'::uuid,
  '66666666-6666-4666-8666-000000000002'::uuid
);

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('66666666-6666-4666-8666-000000000001', 'kiosk'::public.app_role),
  ('66666666-6666-4666-8666-000000000002', 'engineer'::public.app_role);

-- T01/T02: Kiosk besitzt exakt die neue Sicht, nicht das normale Dashboard.
DO $do$
BEGIN
  IF NOT public.has_permission(
    '66666666-6666-4666-8666-000000000001'::uuid,
    'kiosk.view'
  ) THEN
    RAISE EXCEPTION 'FAIL T01: kiosk.view fehlt fuer kiosk';
  END IF;

  IF public.has_permission(
    '66666666-6666-4666-8666-000000000001'::uuid,
    'dashboard.view'
  ) THEN
    RAISE EXCEPTION 'FAIL T02: kiosk besitzt unerwartet dashboard.view';
  END IF;
END
$do$;

-- T03: Bestehende Rollen erhalten kiosk.view nicht, auch Sysadmin nicht.
DO $do$
DECLARE
  v_role public.app_role;
BEGIN
  FOREACH v_role IN ARRAY ARRAY[
    'systemadministrator'::public.app_role,
    'administrator'::public.app_role,
    'teamlead'::public.app_role,
    'projectmanager'::public.app_role,
    'engineer'::public.app_role,
    'customer'::public.app_role,
    'viewer'::public.app_role
  ]
  LOOP
    DELETE FROM public.user_roles
    WHERE user_id = '66666666-6666-4666-8666-000000000002'::uuid;

    INSERT INTO public.user_roles (user_id, role)
    VALUES ('66666666-6666-4666-8666-000000000002'::uuid, v_role);

    IF public.has_permission(
      '66666666-6666-4666-8666-000000000002'::uuid,
      'kiosk.view'
    ) THEN
      RAISE EXCEPTION 'FAIL T03: Rolle % besitzt unerwartet kiosk.view', v_role;
    END IF;
  END LOOP;
END
$do$;

-- T04: Neben einer Kiosk-Rolle darf keine zweite Rolle existieren.
DO $do$
BEGIN
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
      '66666666-6666-4666-8666-000000000001'::uuid,
      'viewer'::public.app_role
    );
    RAISE EXCEPTION 'FAIL T04: zweite Rolle neben kiosk wurde akzeptiert';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM = 'FAIL T04: zweite Rolle neben kiosk wurde akzeptiert' THEN
        RAISE;
      END IF;
      IF SQLERRM <> 'KIOSK_ROLE_MUST_BE_EXCLUSIVE' THEN
        RAISE EXCEPTION 'FAIL T04: falscher Fehler: %', SQLERRM;
      END IF;
  END;
END
$do$;

-- T05: Kiosk darf nicht zu einem bereits normal berollten Konto hinzukommen.
DELETE FROM public.user_roles
WHERE user_id = '66666666-6666-4666-8666-000000000002'::uuid;
INSERT INTO public.user_roles (user_id, role)
VALUES ('66666666-6666-4666-8666-000000000002', 'viewer'::public.app_role);

DO $do$
BEGIN
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
      '66666666-6666-4666-8666-000000000002'::uuid,
      'kiosk'::public.app_role
    );
    RAISE EXCEPTION 'FAIL T05: kiosk neben bestehender Rolle wurde akzeptiert';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM = 'FAIL T05: kiosk neben bestehender Rolle wurde akzeptiert' THEN
        RAISE;
      END IF;
      IF SQLERRM <> 'KIOSK_ROLE_MUST_BE_EXCLUSIVE' THEN
        RAISE EXCEPTION 'FAIL T05: falscher Fehler: %', SQLERRM;
      END IF;
  END;
END
$do$;

ROLLBACK;

-- T06: Der Rollenvertrag muss auch bei konkurrierenden Transaktionen gelten.
-- Der Shell-Test nutzt ausschließlich die disposable lokale CI-Datenbank.
\! bash supabase/tests/bsf-kiosk-01-role-concurrency.sh
\if :SHELL_ERROR
  \echo 'FAIL T06: concurrent kiosk role exclusivity regression'
  SELECT 1 / 0;
\endif
