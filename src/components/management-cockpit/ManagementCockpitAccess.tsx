import { Fragment, type ReactNode } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canAny, type Permission } from "@/lib/rbac/permissions";

// Bestehende atomare Capabilities; keine zusätzliche Cockpit-Permission.
const MANAGEMENT_PERMISSIONS: readonly Permission[] = [
  "project.controlling.view",
  "avkk.management.view",
];

export function ManagementCockpitAccess({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const user = useCurrentUser();
  if (user?.status !== "active" || !canAny(user, MANAGEMENT_PERMISSIONS)) return <>{fallback}</>;

  // Konto-/Rollenwechsel verwirft auch laufende Reads und den bisherigen UI-Zustand.
  // Die abschließende Autorisierung bleibt in der Serverfunktion und in RLS.
  return <Fragment key={`${user.id}:${user.role}`}>{children}</Fragment>;
}
