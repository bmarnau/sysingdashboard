
-- Convert RBAC helper functions from SECURITY DEFINER to SECURITY INVOKER.
-- They read only from public.user_roles / public.profiles, which are already
-- protected by RLS policies granting the caller access to their own row
-- (user_roles_read_own, profiles_self_select) and admin read policies.
-- Running them as INVOKER removes the linter-flagged privilege elevation
-- surface while preserving all existing call sites (RLS policies and RPC
-- from the authenticated client, which only pass their own auth.uid()).

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.is_account_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status = 'active' FROM public.profiles WHERE id = _user_id),
    false
  );
$$;

-- Re-assert EXECUTE grants (CREATE OR REPLACE preserves them, but be explicit).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_account_active(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_account_active(uuid) TO authenticated;

-- Explicit intent for the two "no INSERT policy" lint warnings:
-- Neither table is written from the client. Adding restrictive INSERT
-- policies that block every authenticated write makes the intent explicit
-- and shuts the linter warning. Trigger-driven writes from SECURITY DEFINER
-- functions (handle_new_user, audit_user_roles_change) bypass RLS and
-- continue to work.

CREATE POLICY profiles_block_client_insert
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY audit_log_block_client_insert
  ON public.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (false);
