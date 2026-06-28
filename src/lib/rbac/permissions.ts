/**
 * RBAC — Berechtigungsmodell (Single Source of Truth, Frontend)
 *
 * Die Matrix lebt hier; `backend/services/rbac.mjs` hält eine identische
 * Kopie und wird durch `scripts/check-rbac.mjs` automatisch verifiziert.
 *
 * Sicherheitsdisclaimer: Solange keine echte Authentifizierung aktiv ist,
 * ist dieser Layer UI-Komfort + Vorbereitung — KEINE Sicherheitsgarantie.
 * Mit Entra ID / OAuth2 wandert `can()` zusätzlich in
 * Server-Function-Middleware (Belt-and-Suspenders auf Server-Seite).
 *
 * Konvention: in Komponenten NIE `user.role === '…'` prüfen, immer
 * `can(user, 'permission')` oder `<PermissionGate permission='…'>`.
 * Bei neuer Rolle müssen sonst überall Checks angefasst werden.
 *
 * Ownership-Vertrag: `engineer.workpackage.edit` und `engineer.activity.edit`
 * sind im Sinne der Matrix erlaubt, gelten aber semantisch nur für
 * Datensätze des aktiven Benutzers (`ownerId`-Feld). Server-seitiges
 * Owner-Filter folgt mit echter Auth-Aktivierung.
 */

import type { UserProfile, UserRole } from "@/lib/user-management";

/** Atomare Berechtigungen. */
export type Permission =
  | "dashboard.view"
  | "documentation.view"
  | "systemstatus.view"
  | "project.edit"
  | "workpackage.edit"
  | "activity.edit"
  | "azure.connection.test"
  | "azure.export"
  | "azure.import"
  | "azure.database.build"
  | "backup.restore"
  | "users.manage"
  | "roles.manage"
  | "auditlog.view";

export const ALL_PERMISSIONS: readonly Permission[] = [
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
] as const;

export const PERMISSION_LABEL: Record<Permission, string> = {
  "dashboard.view": "Dashboard ansehen",
  "documentation.view": "Dokumentation ansehen",
  "systemstatus.view": "Systemstatus ansehen",
  "project.edit": "Projekte bearbeiten",
  "workpackage.edit": "Arbeitspakete bearbeiten",
  "activity.edit": "Tätigkeiten bearbeiten",
  "azure.connection.test": "Azure-Verbindung testen",
  "azure.export": "Nach Azure exportieren",
  "azure.import": "Aus Azure importieren",
  "azure.database.build": "Azure-Datenbank aufbauen",
  "backup.restore": "Lokales Backup wiederherstellen",
  "users.manage": "Benutzer verwalten",
  "roles.manage": "Rollen verwalten",
  "auditlog.view": "Audit Logs ansehen",
};

/**
 * Berechtigungsmatrix. Invarianten (geprüft in `scripts/check-rbac.mjs`):
 *  - `azure.database.build` ⊆ {systemadministrator}
 *  - `azure.import` ⊆ {systemadministrator, administrator}
 *  - Träger(`azure.import`) ⊆ Träger(`azure.export`)
 *  - `users.manage`, `auditlog.view`, `backup.restore` ⊆ {sysadmin, admin}
 *  - `roles.manage` ⊆ {systemadministrator}
 *  - `viewer` hat keine *.edit / azure.* / *.manage / backup.* Permission
 *  - `customer` hat zusätzlich keine systemstatus.view
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
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

/** Privileg-Rangordnung (hoch → niedrig). Für Entra-Mapping bei Mehrfachgruppen. */
export const ROLE_PRIORITY: readonly UserRole[] = [
  "systemadministrator",
  "administrator",
  "teamlead",
  "projectmanager",
  "engineer",
  "customer",
  "viewer",
];

/** Hauptcheck. `null` (nicht angemeldet) → `false`. */
export function can(user: UserProfile | null, perm: Permission): boolean {
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role]?.includes(perm) ?? false;
}

export function canAny(user: UserProfile | null, perms: readonly Permission[]): boolean {
  return perms.some((p) => can(user, p));
}

export function canAll(user: UserProfile | null, perms: readonly Permission[]): boolean {
  return perms.every((p) => can(user, p));
}

/** Wirft `Permission denied: <perm>`. Defensive Aktionspfade. */
export function requirePermission(user: UserProfile | null, perm: Permission): void {
  if (!can(user, perm)) {
    throw new Error(`Permission denied: ${perm}`);
  }
}

export function permissionsOf(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
