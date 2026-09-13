-- BSF-03 Prompt 1: Customer Responsibility Fundament (additiv)

-- 1) Tabelle
CREATE TABLE public.customer_responsibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  systemhouse_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'active',
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  note text NOT NULL DEFAULT '',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_responsibility_status_chk CHECK (status IN ('active','ended')),
  CONSTRAINT customer_responsibility_period_chk CHECK (valid_to IS NULL OR valid_to > valid_from),
  CONSTRAINT customer_responsibility_lifecycle_chk CHECK (
    (status = 'active' AND valid_to IS NULL) OR (status = 'ended' AND valid_to IS NOT NULL)
  ),
  CONSTRAINT customer_responsibility_customer_fk
    FOREIGN KEY (customer_id, systemhouse_id)
    REFERENCES public.customer (id, systemhouse_id)
);

-- Höchstens eine aktive Verantwortung je (systemhouse_id, customer_id)
CREATE UNIQUE INDEX customer_responsibility_one_active_uidx
  ON public.customer_responsibility (systemhouse_id, customer_id)
  WHERE status = 'active' AND valid_to IS NULL;

CREATE INDEX customer_responsibility_user_idx
  ON public.customer_responsibility (user_id, systemhouse_id, customer_id);

-- 2) Grants (Least Privilege; kein anon, kein DELETE)
GRANT SELECT, INSERT, UPDATE ON public.customer_responsibility TO authenticated;
GRANT ALL ON public.customer_responsibility TO service_role;

-- 3) RBAC: neue Permission customer.responsibility.manage
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
        (ur.role = 'systemadministrator') OR
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
        ))
      )
  );
$function$;

-- 4) Fachliche Helper (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.is_eligible_responsibility_holder(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
     AND public.is_account_active(_user_id)
     AND EXISTS (
       SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = _user_id
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
       WHERE ur.user_id = _user_id
         AND ur.role IN ('viewer'::public.app_role, 'customer'::public.app_role)
     );
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_customer_responsibility(_user_id uuid, _systemhouse_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
     AND _systemhouse_id IS NOT NULL
     AND public.has_active_systemhouse_membership(_user_id, _systemhouse_id)
     AND public.has_permission(_user_id, 'customer.responsibility.manage');
$function$;

CREATE OR REPLACE FUNCTION public.has_customer_responsibility(_user_id uuid, _systemhouse_id uuid, _customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.customer_responsibility cr
    WHERE cr.user_id = _user_id
      AND cr.systemhouse_id = _systemhouse_id
      AND cr.customer_id = _customer_id
      AND cr.status = 'active'
      AND cr.valid_to IS NULL
      AND (cr.valid_from IS NULL OR cr.valid_from <= now())
  );
$function$;

-- "Meine Kunden" = Responsibility ∩ Membership ∩ CustomerAccess ∩ dashboard.view
CREATE OR REPLACE FUNCTION public.is_my_customer(_user_id uuid, _systemhouse_id uuid, _customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT public.is_account_active(_user_id)
     AND public.has_permission(_user_id, 'dashboard.view')
     AND public.has_active_systemhouse_membership(_user_id, _systemhouse_id)
     AND public.has_customer_access(_user_id, _systemhouse_id, _customer_id, 'read')
     AND public.has_customer_responsibility(_user_id, _systemhouse_id, _customer_id);
$function$;

REVOKE EXECUTE ON FUNCTION public.is_eligible_responsibility_holder(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_customer_responsibility(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_customer_responsibility(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_my_customer(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_eligible_responsibility_holder(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_customer_responsibility(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_customer_responsibility(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_my_customer(uuid, uuid, uuid) TO authenticated;

-- 5) RLS
ALTER TABLE public.customer_responsibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own responsibility readable"
ON public.customer_responsibility
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  AND public.is_account_active(auth.uid())
  AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
);

CREATE POLICY "managers read scoped responsibility"
ON public.customer_responsibility
FOR SELECT
TO authenticated
USING (public.can_manage_customer_responsibility(auth.uid(), systemhouse_id));

CREATE POLICY "managers create scoped responsibility"
ON public.customer_responsibility
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_customer_responsibility(auth.uid(), systemhouse_id)
  AND public.is_eligible_responsibility_holder(user_id)
  AND public.has_active_systemhouse_membership(user_id, systemhouse_id)
  AND status = 'active'
  AND valid_to IS NULL
);

CREATE POLICY "managers update scoped responsibility"
ON public.customer_responsibility
FOR UPDATE
TO authenticated
USING (public.can_manage_customer_responsibility(auth.uid(), systemhouse_id))
WITH CHECK (
  public.can_manage_customer_responsibility(auth.uid(), systemhouse_id)
  AND public.is_eligible_responsibility_holder(user_id)
);

-- 6) Identitätsschutz + Audit
CREATE OR REPLACE FUNCTION public.customer_responsibility_identity_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.systemhouse_id IS DISTINCT FROM OLD.systemhouse_id
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'customer_responsibility_identity_immutable: systemhouse_id, customer_id and user_id cannot be changed';
  END IF;
  IF OLD.status = 'ended' THEN
    RAISE EXCEPTION 'customer_responsibility_history_immutable: ended responsibility cannot be modified';
  END IF;
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_responsibility_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.audit_log (action, target, actor_id, payload)
  VALUES (
    'customer_responsibility.' || lower(TG_OP),
    NEW.id::text,
    auth.uid(),
    jsonb_build_object(
      'systemhouse_id', NEW.systemhouse_id,
      'customer_id', NEW.customer_id,
      'user_id', NEW.user_id,
      'status', NEW.status,
      'valid_to', NEW.valid_to
    )
  );
  RETURN NEW;
END;
$function$;

CREATE TRIGGER customer_responsibility_set_updated_at
  BEFORE UPDATE ON public.customer_responsibility
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER customer_responsibility_identity_guard
  BEFORE UPDATE ON public.customer_responsibility
  FOR EACH ROW EXECUTE FUNCTION public.customer_responsibility_identity_guard();

CREATE TRIGGER customer_responsibility_audit
  AFTER INSERT OR UPDATE ON public.customer_responsibility
  FOR EACH ROW EXECUTE FUNCTION public.customer_responsibility_audit();