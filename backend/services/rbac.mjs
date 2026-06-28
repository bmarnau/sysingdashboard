/**
 * Backend-RBAC — gespiegelte Matrix.
 *
 * Single Source of Truth bleibt `src/lib/rbac/permissions.ts` (Frontend).
 * Dieses Modul mirror't die Matrix bewusst manuell, weil Frontend-TS nicht
 * direkt aus Node-ESM importierbar ist. `scripts/check-rbac.mjs` vergleicht
 * beide Quellen bei jedem CI-Lauf und failed bei Drift.
 */

export const ALL_ROLES = Object.freeze([
  "systemadministrator",
  "administrator",
  "teamlead",
  "projectmanager",
  "engineer",
  "customer",
  "viewer",
]);

export const ALL_PERMISSIONS = Object.freeze([
  "dashboard.view",
  "documentation.view",
  "systemstatus.view",
  "project.edit",
  "workpackage.edit",
  "activity.edit",
  "azure.connection.test",
  "azure.export",
  "azure.import",
  "azure.database.build",
  "backup.restore",
  "users.manage",
  "roles.manage",
  "auditlog.view",
]);

export const ROLE_PERMISSIONS = Object.freeze({
  systemadministrator: [
    "dashboard.view",
    "documentation.view",
    "systemstatus.view",
    "project.edit",
    "workpackage.edit",
    "activity.edit",
    "azure.connection.test",
    "azure.export",
    "azure.import",
    "azure.database.build",
    "backup.restore",
    "users.manage",
    "roles.manage",
    "auditlog.view",
  ],
  administrator: [
    "dashboard.view",
    "documentation.view",
    "systemstatus.view",
    "project.edit",
    "workpackage.edit",
    "activity.edit",
    "azure.connection.test",
    "azure.export",
    "azure.import",
    "backup.restore",
    "users.manage",
    "auditlog.view",
  ],
  teamlead: [
    "dashboard.view",
    "documentation.view",
    "systemstatus.view",
    "project.edit",
    "workpackage.edit",
    "activity.edit",
    "azure.export",
  ],
  projectmanager: [
    "dashboard.view",
    "documentation.view",
    "project.edit",
    "workpackage.edit",
    "activity.edit",
    "azure.export",
  ],
  engineer: ["dashboard.view", "documentation.view", "workpackage.edit", "activity.edit"],
  customer: ["dashboard.view", "documentation.view"],
  viewer: ["dashboard.view", "documentation.view"],
});

/** Prüft, ob die Rolle eine bestimmte Permission besitzt. */
export function roleCan(role, perm) {
  const list = ROLE_PERMISSIONS[role];
  return Array.isArray(list) && list.includes(perm);
}

/** Generisches Guard für Server Route Handler. Wirft 403-ähnlichen Fehler. */
export function requirePermission(role, perm) {
  if (!roleCan(role, perm)) {
    const err = new Error(`Permission denied: ${perm}`);
    err.status = 403;
    throw err;
  }
}

/** Liefert sortierte Permission-Liste der Rolle (oder leer). */
export function permissionsOf(role) {
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}
