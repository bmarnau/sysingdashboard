-- BSF-03 P1: Customer Responsibility – Target Validation serverseitig (trigger-intern)
--
-- Ursache: Die INSERT-/UPDATE-Policies prueften die ZIELPERSON ueber SECURITY-INVOKER-Helper
-- (is_eligible_responsibility_holder, has_active_systemhouse_membership). Diese lesen
-- profiles / user_roles / systemhouse_membership, die fuer normale Benutzer bewusst
-- Self-only-RLS-geschuetzt sind. Ein Teamlead mit customer.responsibility.manage konnte
-- deshalb fremde Zielpersonen nicht validieren -> 42501 auch im eigenen Scope (R15b).
--
-- Reparatur (minimal):
--   * Autorisierung des HANDELNDEN Benutzers bleibt vollstaendig in RLS
--     (can_manage_customer_responsibility(auth.uid(), systemhouse_id), unveraendert streng).
--   * Integritaet der ZIELPERSON wandert in einen nicht exponierten BEFORE-Trigger
--     (SECURITY DEFINER, search_path = '', vollstaendig schemaqualifiziert, kein EXECUTE
--     fuer PUBLIC/anon/authenticated). Es entsteht KEINE neue Lesesicht auf fremde
--     Profile/Rollen/Memberships: die Funktion liefert nur "ok" oder eine Exception.
--   * Lifecycle: active -> ended verlangt KEINE erneute Target-Eligibility, damit ungueltig
--     gewordene Verantwortungen bereinigt werden koennen. Neuanlage / active -> active
--     erhaelt die vollstaendige Target-Validation.
--
-- Vorbild fuer den Definer-Trigger ohne eigenes Schema: public.customer_responsibility_audit()
-- (bereits SECURITY DEFINER, EXECUTE fuer PUBLIC/anon/authenticated entzogen).

-- 1) Interne Target-Validation (nicht exponiert)
CREATE OR REPLACE FUNCTION public.customer_responsibility_target_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Nur fuer eine (weiterhin) AKTIVE Verantwortung wird die Zielperson geprueft.
  -- active -> ended: Autorisierung des Managers (RLS) + Identity-Guard genuegen.
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  -- 1) Zielperson existiert und ist aktiv.
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id = NEW.user_id
       AND p.status = 'active'::public.user_status
  ) THEN
    RAISE EXCEPTION 'customer_responsibility_target_invalid: target user missing or not active'
      USING ERRCODE = '42501';
  END IF;

  -- 2) Mindestens eine zulaessige interne Rolle.
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = NEW.user_id
       AND ur.role IN (
         'systemadministrator'::public.app_role,
         'administrator'::public.app_role,
         'teamlead'::public.app_role,
         'projectmanager'::public.app_role,
         'engineer'::public.app_role
       )
  ) THEN
    RAISE EXCEPTION 'customer_responsibility_target_invalid: target has no eligible internal role'
      USING ERRCODE = '42501';
  END IF;

  -- 3) viewer / customer sind niemals zulaessige Traeger.
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = NEW.user_id
       AND ur.role IN ('viewer'::public.app_role, 'customer'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'customer_responsibility_target_invalid: viewer/customer cannot hold responsibility'
      USING ERRCODE = '42501';
  END IF;

  -- 4) Aktuell aktive Membership im selben Systemhouse.
  IF NOT EXISTS (
    SELECT 1 FROM public.systemhouse_membership m
     WHERE m.user_id = NEW.user_id
       AND m.systemhouse_id = NEW.systemhouse_id
       AND m.status = 'active'
       AND (m.valid_from IS NULL OR m.valid_from <= now())
       AND (m.valid_to IS NULL OR m.valid_to > now())
  ) THEN
    RAISE EXCEPTION 'customer_responsibility_target_invalid: target has no active membership in systemhouse'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.customer_responsibility_target_guard() FROM PUBLIC, anon, authenticated;

-- Trigger-Reihenfolge (alphabetisch): identity_guard -> set_updated_at -> target_guard.
CREATE TRIGGER customer_responsibility_target_guard
  BEFORE INSERT OR UPDATE ON public.customer_responsibility
  FOR EACH ROW EXECUTE FUNCTION public.customer_responsibility_target_guard();

-- 2) RLS: Target-Eligibility aus den Policies entfernen; Manager-Scope unveraendert streng.
DROP POLICY "managers create scoped responsibility" ON public.customer_responsibility;
CREATE POLICY "managers create scoped responsibility"
ON public.customer_responsibility
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_customer_responsibility(auth.uid(), systemhouse_id)
  AND status = 'active'
  AND valid_to IS NULL
);

DROP POLICY "managers update scoped responsibility" ON public.customer_responsibility;
CREATE POLICY "managers update scoped responsibility"
ON public.customer_responsibility
FOR UPDATE
TO authenticated
USING (public.can_manage_customer_responsibility(auth.uid(), systemhouse_id))
WITH CHECK (public.can_manage_customer_responsibility(auth.uid(), systemhouse_id));