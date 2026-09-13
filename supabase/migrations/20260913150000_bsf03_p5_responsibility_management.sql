-- BSF-03 P5 — Customer Responsibility Management
-- Additiver, datenminimierter Managementpfad. Keine bestehende RLS-Policy wird verbreitert.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

-- Gemeinsame fail-closed Scope-Prüfung. SECURITY DEFINER nur für den minimalen
-- Fremdread, search_path leer und fachliche Autorisierung explizit über auth.uid().
CREATE OR REPLACE FUNCTION private.assert_customer_responsibility_management_scope(
  _systemhouse_id uuid,
  _customer_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL
     OR NOT public.can_manage_customer_responsibility(auth.uid(), _systemhouse_id) THEN
    RAISE EXCEPTION 'customer_responsibility_management_denied'
      USING ERRCODE = '42501';
  END IF;

  IF _customer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM public.customer c
     WHERE c.systemhouse_id = _systemhouse_id
       AND c.id = _customer_id
  ) THEN
    RAISE EXCEPTION 'customer_responsibility_management_denied'
      USING ERRCODE = '42501';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION private.customer_responsibility_management_overview(
  _systemhouse_id uuid
)
RETURNS TABLE (
  customer_id uuid,
  customer_name text,
  customer_status text,
  responsibility_id uuid,
  responsible_user_id uuid,
  responsible_display_name text,
  responsible_since timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  PERFORM private.assert_customer_responsibility_management_scope(_systemhouse_id, NULL);

  RETURN QUERY
  SELECT c.id,
         c.name,
         c.status,
         cr.id,
         cr.user_id,
         CASE WHEN cr.user_id IS NULL THEN NULL
              ELSE COALESCE(NULLIF(btrim(p.display_name), ''), 'Benutzer ' || left(cr.user_id::text, 8))
          END,
         cr.valid_from
    FROM public.customer c
    LEFT JOIN public.customer_responsibility cr
      ON cr.systemhouse_id = c.systemhouse_id
     AND cr.customer_id = c.id
     AND cr.status = 'active'
     AND cr.valid_to IS NULL
     AND cr.valid_from <= now()
    LEFT JOIN public.profiles p ON p.id = cr.user_id
   WHERE c.systemhouse_id = _systemhouse_id
   ORDER BY c.name, c.id;
END;
$function$;

CREATE OR REPLACE FUNCTION private.customer_responsibility_management_candidates(
  _systemhouse_id uuid
)
RETURNS TABLE (
  user_id uuid,
  display_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  PERFORM private.assert_customer_responsibility_management_scope(_systemhouse_id, NULL);

  RETURN QUERY
  SELECT x.user_id, x.display_name
  FROM (
    SELECT DISTINCT p.id AS user_id,
           COALESCE(NULLIF(btrim(p.display_name), ''), 'Benutzer ' || left(p.id::text, 8)) AS display_name
      FROM public.profiles p
      JOIN public.systemhouse_membership m
        ON m.user_id = p.id
       AND m.systemhouse_id = _systemhouse_id
       AND m.status = 'active'
       AND (m.valid_from IS NULL OR m.valid_from <= now())
       AND (m.valid_to IS NULL OR m.valid_to > now())
     WHERE p.status = 'active'::public.user_status
       AND EXISTS (
         SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = p.id
            AND ur.role IN (
              'systemadministrator'::public.app_role,
              'administrator'::public.app_role,
              'teamlead'::public.app_role,
              'projectmanager'::public.app_role,
              'engineer'::public.app_role
            )
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = p.id
            AND ur.role IN ('viewer'::public.app_role, 'customer'::public.app_role)
       )
  ) x
  ORDER BY x.display_name, x.user_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION private.assert_customer_responsibility_management_scope(uuid, uuid)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.customer_responsibility_management_overview(uuid)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.customer_responsibility_management_candidates(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.assert_customer_responsibility_management_scope(uuid, uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.customer_responsibility_management_overview(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.customer_responsibility_management_candidates(uuid)
  TO authenticated;

-- Data-API-Vertrag: öffentliche Wrapper bleiben SECURITY INVOKER. Das private
-- Schema ist nicht exponiert; jeder private Helper prüft zusätzlich auth.uid().
CREATE OR REPLACE FUNCTION public.customer_responsibility_management_overview(
  _systemhouse_id uuid
)
RETURNS TABLE (
  customer_id uuid,
  customer_name text,
  customer_status text,
  responsibility_id uuid,
  responsible_user_id uuid,
  responsible_display_name text,
  responsible_since timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT * FROM private.customer_responsibility_management_overview(_systemhouse_id);
$function$;

CREATE OR REPLACE FUNCTION public.customer_responsibility_management_candidates(
  _systemhouse_id uuid
)
RETURNS TABLE (
  user_id uuid,
  display_name text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT * FROM private.customer_responsibility_management_candidates(_systemhouse_id);
$function$;

-- Atomarer Wechsel/Zuweisung. SECURITY INVOKER: bestehende Manager-RLS und
-- customer_responsibility_target_guard bleiben autoritativ.
CREATE OR REPLACE FUNCTION public.set_customer_responsibility(
  _systemhouse_id uuid,
  _customer_id uuid,
  _target_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  current_id uuid;
  current_user_id uuid;
  new_id uuid;
  ts timestamptz := clock_timestamp();
BEGIN
  PERFORM private.assert_customer_responsibility_management_scope(_systemhouse_id, _customer_id);

  SELECT cr.id, cr.user_id
    INTO current_id, current_user_id
    FROM public.customer_responsibility cr
   WHERE cr.systemhouse_id = _systemhouse_id
     AND cr.customer_id = _customer_id
     AND cr.status = 'active'
     AND cr.valid_to IS NULL
   FOR UPDATE;

  IF current_id IS NOT NULL AND current_user_id = _target_user_id THEN
    RETURN current_id;
  END IF;

  IF current_id IS NOT NULL THEN
    UPDATE public.customer_responsibility
       SET status = 'ended', valid_to = ts
     WHERE id = current_id;
  END IF;

  INSERT INTO public.customer_responsibility (
    systemhouse_id, customer_id, user_id, status, valid_from, created_by, updated_by
  ) VALUES (
    _systemhouse_id, _customer_id, _target_user_id, 'active', ts, auth.uid(), auth.uid()
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.end_customer_responsibility(
  _systemhouse_id uuid,
  _customer_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  current_id uuid;
BEGIN
  PERFORM private.assert_customer_responsibility_management_scope(_systemhouse_id, _customer_id);

  SELECT cr.id
    INTO current_id
    FROM public.customer_responsibility cr
   WHERE cr.systemhouse_id = _systemhouse_id
     AND cr.customer_id = _customer_id
     AND cr.status = 'active'
     AND cr.valid_to IS NULL
   FOR UPDATE;

  IF current_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.customer_responsibility
     SET status = 'ended', valid_to = clock_timestamp()
   WHERE id = current_id;

  RETURN true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.customer_responsibility_management_overview(uuid)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.customer_responsibility_management_candidates(uuid)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_customer_responsibility(uuid, uuid, uuid)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.end_customer_responsibility(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_responsibility_management_overview(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_responsibility_management_candidates(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_customer_responsibility(uuid, uuid, uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_customer_responsibility(uuid, uuid)
  TO authenticated;
