-- BSF-KIOSK-01: kiosk.view ausschliesslich fuer die technische Rolle kiosk
-- und DB-seitige Rollenexklusivitaet fuer Kiosk-Konten.

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND (
        (ur.role = 'systemadministrator' AND _perm <> 'kiosk.view') OR
        (ur.role = 'administrator' AND _perm IN (
          'dashboard.view','documentation.view','systemstatus.view',
          'project.edit','workpackage.edit','activity.edit',
          'azure.connection.test','azure.export','azure.import',
          'backup.restore','users.manage','auditlog.view',
          'avkk.view','avkk.edit','avkk.responsibility.assign',
          'avkk.management.view','referencedata.view','referencedata.manage',
          'customer.responsibility.manage'
        )) OR
        (ur.role = 'teamlead' AND _perm IN (
          'dashboard.view','documentation.view','systemstatus.view',
          'project.edit','workpackage.edit','activity.edit','azure.export',
          'avkk.view','avkk.edit','avkk.responsibility.assign',
          'avkk.management.view','referencedata.view',
          'customer.responsibility.manage'
        )) OR
        (ur.role = 'projectmanager' AND _perm IN (
          'dashboard.view','documentation.view',
          'project.edit','workpackage.edit','activity.edit','azure.export',
          'avkk.view','avkk.edit','avkk.responsibility.assign',
          'avkk.management.view','referencedata.view'
        )) OR
        (ur.role = 'engineer' AND _perm IN (
          'dashboard.view','documentation.view','workpackage.edit','activity.edit',
          'avkk.view','avkk.edit','referencedata.view'
        )) OR
        (ur.role = 'customer' AND _perm IN (
          'dashboard.view','documentation.view','referencedata.view'
        )) OR
        (ur.role = 'viewer' AND _perm IN (
          'dashboard.view','documentation.view','avkk.view','referencedata.view'
        )) OR
        (ur.role = 'kiosk' AND _perm = 'kiosk.view')
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.enforce_kiosk_role_exclusive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_conflict boolean;
BEGIN
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

DROP TRIGGER IF EXISTS trg_enforce_kiosk_role_exclusive ON public.user_roles;
CREATE TRIGGER trg_enforce_kiosk_role_exclusive
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_kiosk_role_exclusive();

REVOKE ALL ON FUNCTION public.enforce_kiosk_role_exclusive() FROM PUBLIC, anon, authenticated;
