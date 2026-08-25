-- SEC-01 / Issue #89 — expliziter Negativtest für avkk_people_directory()
--
-- Hintergrund:
-- Die Rolle `viewer` besitzt in der geltenden RBAC-Matrix `avkk.view` und
-- eignet sich daher nicht als Negativrolle. Dieser ergänzende Test verwendet
-- bewusst `customer`, für den `avkk.view` nicht vergeben ist.
--
-- Nur in einer disposable/local/staging Testdatenbank ausführen.
-- Eine Transaktion mit ROLLBACK hinterlässt keine Testdaten.

\set ON_ERROR_STOP on

BEGIN;
SET LOCAL client_min_messages = warning;

-- Ein separater Anchor-User verhindert in einer vollständig leeren
-- Wegwerfumgebung, dass der eigentliche Negativbenutzer der Bootstrap-
-- Systemadministrator wird. Der Anchor wird durch ROLLBACK wieder entfernt.
INSERT INTO auth.users (
  id, email, aud, role, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
VALUES (
  '55555555-5555-4555-8555-000000000001'::uuid,
  'sec01+anchor@example.invalid',
  'authenticated', 'authenticated', now(), now(), '{}'::jsonb, '{}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (
  id, email, aud, role, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
VALUES (
  '55555555-5555-4555-8555-000000000002'::uuid,
  'sec01+customer-no-avkk@example.invalid',
  'authenticated', 'authenticated', now(), now(), '{}'::jsonb, '{}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, first_name, last_name, display_name, email, status)
VALUES (
  '55555555-5555-4555-8555-000000000002'::uuid,
  'SEC01', 'Customer', 'SEC01 Customer No AVKK',
  'sec01+customer-no-avkk@example.invalid',
  'active'::public.user_status
)
ON CONFLICT (id) DO UPDATE SET status = 'active'::public.user_status;

DELETE FROM public.user_roles
WHERE user_id = '55555555-5555-4555-8555-000000000002'::uuid;

INSERT INTO public.user_roles (user_id, role)
VALUES (
  '55555555-5555-4555-8555-000000000002'::uuid,
  'customer'::public.app_role
)
ON CONFLICT DO NOTHING;

DO $do$
DECLARE
  customer_id constant uuid := '55555555-5555-4555-8555-000000000002'::uuid;
  visible_rows integer;
BEGIN
  IF public.has_permission(customer_id, 'avkk.view') THEN
    RAISE EXCEPTION 'SEC-01 no-view: customer besitzt unerwartet avkk.view; Testannahme ungueltig';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', customer_id::text, 'role', 'authenticated')::text,
    true
  );

  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO visible_rows FROM public.avkk_people_directory();
  RESET ROLE;

  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'SEC-01 no-view: customer ohne avkk.view erhaelt % Verzeichniszeilen', visible_rows;
  END IF;
END
$do$;

ROLLBACK;
