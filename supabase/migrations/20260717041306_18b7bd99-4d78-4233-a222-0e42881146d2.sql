
-- ============================================================
-- Roles
-- ============================================================
CREATE TYPE public.app_role AS ENUM (
  'systemadministrator',
  'administrator',
  'teamlead',
  'projectmanager',
  'engineer',
  'customer',
  'viewer'
);

CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'locked', 'archived');

-- ============================================================
-- profiles
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  profile_image TEXT,
  status public.user_status NOT NULL DEFAULT 'active',
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_self_select" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- user_roles
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER checkers (must exist before policies reference them)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles));
$$;

-- Backend-mirror of the permission matrix (kept in sync via scripts/check-rbac.mjs)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _perm TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
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
          'backup.restore','users.manage','auditlog.view'
        )) OR
        (ur.role = 'teamlead' AND _perm IN (
          'dashboard.view','documentation.view','systemstatus.view',
          'project.edit','workpackage.edit','activity.edit','azure.export'
        )) OR
        (ur.role = 'projectmanager' AND _perm IN (
          'dashboard.view','documentation.view',
          'project.edit','workpackage.edit','activity.edit','azure.export'
        )) OR
        (ur.role = 'engineer' AND _perm IN (
          'dashboard.view','documentation.view','workpackage.edit','activity.edit'
        )) OR
        (ur.role = 'customer' AND _perm IN ('dashboard.view','documentation.view')) OR
        (ur.role = 'viewer' AND _perm IN ('dashboard.view','documentation.view'))
      )
  );
$$;

-- Policies on user_roles (now that has_role exists)
CREATE POLICY "user_roles_read_all_authenticated" ON public.user_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_sysadmin_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'systemadministrator'));
CREATE POLICY "user_roles_sysadmin_update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'systemadministrator'))
  WITH CHECK (public.has_role(auth.uid(), 'systemadministrator'));
CREATE POLICY "user_roles_sysadmin_delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'systemadministrator'));

-- Profiles: sysadmin/admin can see everyone (for the user-management UI)
CREATE POLICY "profiles_admins_select_all" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['systemadministrator','administrator']::public.app_role[]));
CREATE POLICY "profiles_admins_update_all" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['systemadministrator','administrator']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['systemadministrator','administrator']::public.app_role[]));

-- ============================================================
-- audit_log
-- ============================================================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  actor_role public.app_role,
  action TEXT NOT NULL,
  target TEXT,
  correlation_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB
);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_admins_read" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['systemadministrator','administrator']::public.app_role[]));
-- No insert/update/delete policy: only service_role (server) writes.

-- ============================================================
-- Signup trigger: create profile + assign bootstrap role
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  assigned_role := CASE WHEN is_first THEN 'systemadministrator'::public.app_role
                        ELSE 'viewer'::public.app_role END;
  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (NEW.id, assigned_role, NEW.id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- updated_at trigger for profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
