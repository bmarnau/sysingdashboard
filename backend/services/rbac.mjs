/**
 * RBAC — Backend-Spiegel der Frontend-Matrix.
 *
 * MUSS zeichengenau identisch zu `src/lib/rbac/permissions.ts` (Felder
 * ROLE_PERMISSIONS + ROLE_PRIORITY) bleiben. `scripts/check-rbac.mjs`
 * erzwingt das in CI.
 */

export const ALL_ROLES = [
  "systemadministrator",
  "administrator",
  "teamlead",
  "projectmanager",
  "engineer",
  "customer",
  "viewer",
];

export const ALL_PERMISSIONS = [
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
];

export const ROLE_PERMISSIONS = {
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
  engineer: [
    "dashboard.view",
    "documentation.view",
    "workpackage.edit",
    "activity.edit",
  ],
  customer: ["dashboard.view", "documentation.view"],
  viewer: ["dashboard.view", "documentation.view"],
};

export const ROLE_PRIORITY = [
  "systemadministrator",
  "administrator",
  "teamlead",
  "projectmanager",
  "engineer",
  "customer",
  "viewer",
];

export function can(role, perm) {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  return Array.isArray(perms) && perms.includes(perm);
}

export function requirePermission(role, perm) {
  if (!can(role, perm)) {
    const err = new Error(`Permission denied: ${perm}`);
    err.code = "PERMISSION_DENIED";
    throw err;
  }
}
