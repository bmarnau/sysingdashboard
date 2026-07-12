/**
 * RBAC v2 — Access Evaluation (zukünftiger Ersatz für `can()`).
 *
 * Wichtig: solange keine Aufrufseite v2 nutzt, delegiert diese Funktion für
 * jede Prüfung ohne konkreten Scope an die klassische v1-Matrix aus
 * `permissions.ts`. Damit ist der Umbau **rein additiv** (kein Breaking
 * Change). Sobald echte Auth + Assignments existieren, wird die Delegation
 * schrittweise abgelöst — die Aufruferseite ändert sich dabei nicht.
 */

import { can, type Permission } from "@/lib/rbac/permissions";
import { scopeIncludes } from "@/lib/rbac/scope";
import type { AccessContext, PermissionV2, ResourceScope } from "@/lib/rbac/types";
import type { UserProfile } from "@/lib/user-management";

/**
 * v2-Auswertung: Prüft, ob mindestens ein aktives Assignment im Kontext
 * die geforderte Permission auf einem einschließenden Scope besitzt.
 *
 * Vereinfachung: Die eigentliche Rolle-→-Permission-Auflösung erfolgt heute
 * noch über die v1-Matrix — dazu muss der Aufrufer den User zusätzlich
 * mitgeben. Für reine Assignment-Prüfungen genügt die Existenz eines
 * gültigen Assignments auf passendem Scope.
 */
export function evaluateAccess(
  user: UserProfile | null,
  permission: Permission,
  ctx?: AccessContext,
): boolean {
  // Fallback ohne Kontext: klassische v1-Matrix.
  if (!ctx || ctx.assignments.length === 0) {
    return can(user, permission);
  }

  const now = ctx.now ?? Date.now();
  const targetScope: ResourceScope = ctx.scope ?? "*";

  // Aktives Assignment mit passendem Scope AND passender v1-Permission
  // (Rollen-basiert — Assignment liefert Rolle, `can()` prüft Permission).
  return ctx.assignments.some((a) => {
    if (a.expiresAt && Date.parse(a.expiresAt) <= now) return false;
    if (!scopeIncludes(a.scope, targetScope)) return false;
    const pseudoUser: UserProfile = { ...(user as UserProfile), role: a.role };
    return can(pseudoUser, permission);
  });
}

/**
 * v2-Native Prüfung (Assignment-only, ohne v1-Delegation).
 * Nutzt das `resource:action`-Format direkt und ignoriert die v1-Matrix.
 * Für spätere Migrationen; heute nicht im Hot-Path.
 */
export function evaluateAccessV2(
  permissionV2: PermissionV2,
  assignments: readonly import("@/lib/rbac/types").RoleAssignment[],
  scope: ResourceScope = "*",
  rolePermissions: (role: import("@/lib/user-management").UserRole) => readonly PermissionV2[],
  now: number = Date.now(),
): boolean {
  return assignments.some((a) => {
    if (a.expiresAt && Date.parse(a.expiresAt) <= now) return false;
    if (!scopeIncludes(a.scope, scope)) return false;
    return rolePermissions(a.role).includes(permissionV2);
  });
}
