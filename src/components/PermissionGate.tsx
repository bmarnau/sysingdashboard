import type { ReactNode } from "react";
import { useAnyPermission } from "@/hooks/usePermission";
import type { Permission } from "@/lib/rbac/permissions";

interface PermissionGateProps {
  /** Eine oder mehrere Permissions. Bei Array reicht eine davon (OR). */
  permission: Permission | readonly Permission[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Rendert `children` nur, wenn der aktive Benutzer mindestens eine der
 * geforderten Permissions besitzt. Reines UI-Gating — Aktionspfade müssen
 * serverseitig zusätzlich geprüft werden, sobald echte Auth aktiv ist.
 */
export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const perms = Array.isArray(permission)
    ? (permission as readonly Permission[])
    : ([permission] as readonly Permission[]);
  const granted = useAnyPermission(perms);
  return <>{granted ? children : fallback}</>;
}
