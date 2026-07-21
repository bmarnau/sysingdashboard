
-- 1) Lock down SECURITY DEFINER functions: revoke from PUBLIC/anon; grant only where actually needed.

-- Trigger-only functions: no direct EXECUTE by any client role.
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_last_sysadmin_roles() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_last_sysadmin_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_user_roles_change() FROM PUBLIC, anon, authenticated;

-- RBAC helpers: revoke from PUBLIC and anon; grant EXECUTE only to authenticated
-- (required because RLS policies invoke them as the caller role).
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated;

REVOKE ALL ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.is_account_active(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_account_active(uuid) TO authenticated;

-- 2) Tighten user_roles read policy: don't expose the full role map to every signed-in user.
DROP POLICY IF EXISTS user_roles_read_all_authenticated ON public.user_roles;

CREATE POLICY user_roles_read_own
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY user_roles_read_admins
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['systemadministrator'::public.app_role, 'administrator'::public.app_role]));
