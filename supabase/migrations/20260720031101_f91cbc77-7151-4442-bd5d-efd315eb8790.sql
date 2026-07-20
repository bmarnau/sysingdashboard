
-- 1. Race-safe Bootstrap für den ersten Systemadministrator
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first BOOLEAN;
  assigned_role public.app_role;
  first_name TEXT;
  last_name TEXT;
  display_name TEXT;
BEGIN
  first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  last_name  := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NULLIF(TRIM(first_name || ' ' || last_name), ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, first_name, last_name, display_name, email)
  VALUES (NEW.id, first_name, last_name, display_name, COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;

  -- Serialisiert konkurrierende Erstregistrierungen: genau ein Sysadmin.
  PERFORM pg_advisory_xact_lock(hashtext('sysadmin_bootstrap'));

  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'systemadministrator'::public.app_role
  ) INTO is_first;

  assigned_role := CASE WHEN is_first
                        THEN 'systemadministrator'::public.app_role
                        ELSE 'viewer'::public.app_role END;

  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (NEW.id, assigned_role, NEW.id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.audit_log (action, target, actor_id, actor_role, payload)
  VALUES (
    'auth.bootstrap',
    NEW.id::text,
    NEW.id,
    assigned_role,
    jsonb_build_object('assigned_role', assigned_role, 'was_first', is_first)
  );

  RETURN NEW;
END;
$$;

-- 2. Statusprüfung
CREATE OR REPLACE FUNCTION public.is_account_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status = 'active' FROM public.profiles WHERE id = _user_id),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_account_active(uuid) TO authenticated;

-- 3. Lockout-Trigger: letzter aktiver Sysadmin darf nicht wegfallen
CREATE OR REPLACE FUNCTION public.protect_last_sysadmin_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_sysadmins_after INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role <> 'systemadministrator'::public.app_role THEN
      RETURN OLD;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role <> 'systemadministrator'::public.app_role
       OR NEW.role = 'systemadministrator'::public.app_role THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT count(*) INTO active_sysadmins_after
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'systemadministrator'::public.app_role
    AND p.status = 'active'
    AND ur.user_id <> OLD.user_id;

  IF active_sysadmins_after < 1 THEN
    RAISE EXCEPTION 'last_sysadmin_locked: cannot remove or demote the last active systemadministrator';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_last_sysadmin_roles ON public.user_roles;
CREATE TRIGGER trg_protect_last_sysadmin_roles
BEFORE UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_last_sysadmin_roles();

CREATE OR REPLACE FUNCTION public.protect_last_sysadmin_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_sysadmins_after INT;
  is_sysadmin BOOLEAN;
BEGIN
  IF NEW.status = 'active' OR OLD.status <> 'active' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = OLD.id AND role = 'systemadministrator'::public.app_role
  ) INTO is_sysadmin;

  IF NOT is_sysadmin THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO active_sysadmins_after
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'systemadministrator'::public.app_role
    AND p.status = 'active'
    AND ur.user_id <> OLD.id;

  IF active_sysadmins_after < 1 THEN
    RAISE EXCEPTION 'last_sysadmin_locked: cannot deactivate the last active systemadministrator';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_last_sysadmin_profile ON public.profiles;
CREATE TRIGGER trg_protect_last_sysadmin_profile
BEFORE UPDATE OF status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_last_sysadmin_profile();

-- 4. Audit-Log-Trigger für Rollenänderungen
CREATE OR REPLACE FUNCTION public.audit_user_roles_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := auth.uid();
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (action, target, actor_id, payload)
    VALUES ('user_roles.insert', NEW.user_id::text, actor,
            jsonb_build_object('role', NEW.role));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (action, target, actor_id, payload)
    VALUES ('user_roles.update', NEW.user_id::text, actor,
            jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (action, target, actor_id, payload)
    VALUES ('user_roles.delete', OLD.user_id::text, actor,
            jsonb_build_object('role', OLD.role));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles_change();
