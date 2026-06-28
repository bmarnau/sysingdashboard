import { useCurrentUser } from "@/hooks/useCurrentUser";
import { can, canAny, type Permission } from "@/lib/rbac/permissions";

/** Reaktiver Boolean-Check: hat der aktive Benutzer die Permission? */
export function usePermission(perm: Permission): boolean {
  const user = useCurrentUser();
  return can(user, perm);
}

/** Reaktiver Boolean-Check: hat der aktive Benutzer mindestens eine? */
export function useAnyPermission(perms: readonly Permission[]): boolean {
  const user = useCurrentUser();
  return canAny(user, perms);
}
