-- BSF-KIOSK-01: Rollenexklusivitaet auch bei konkurrierenden Transaktionen
-- erzwingen. Jeder INSERT/UPDATE auf user_roles serialisiert pro Zielbenutzer,
-- bevor der bestehende Kiosk-Konfliktvertrag ausgewertet wird.
CREATE OR REPLACE FUNCTION public.enforce_kiosk_role_exclusive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_conflict boolean;
BEGIN
  -- Zwei parallele Rollenschreibvorgaenge duerfen den sichtbarkeitsbasierten
  -- Konflikttest nicht gleichzeitig passieren. Der transaktionsgebundene,
  -- benutzerspezifische Advisory Lock wird beim COMMIT/ROLLBACK freigegeben.
  PERFORM pg_advisory_xact_lock(
    hashtext('kiosk_role_exclusive'),
    hashtext(NEW.user_id::text)
  );

  IF NEW.role = 'kiosk'::public.app_role THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = NEW.user_id
        AND ur.id IS DISTINCT FROM NEW.id
    ) INTO v_conflict;
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = NEW.user_id
        AND ur.role = 'kiosk'::public.app_role
        AND ur.id IS DISTINCT FROM NEW.id
    ) INTO v_conflict;
  END IF;

  IF v_conflict THEN
    RAISE EXCEPTION 'KIOSK_ROLE_MUST_BE_EXCLUSIVE';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_kiosk_role_exclusive() FROM PUBLIC, anon, authenticated;
