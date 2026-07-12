/**
 * RBAC v2 — Permission Groups.
 *
 * Bündel für die UI-Auswahl in einem späteren Rollen-Editor und für das
 * Mapping von Entra-ID-Gruppen (Object-Ids) auf Berechtigungssätze.
 * Rollen bleiben die primäre Zuweisung; Groups sind ein sekundärer
 * Composer, der auf Permissions herunterprojiziert wird.
 */

import type { PermissionGroup, PermissionV2 } from "@/lib/rbac/types";
import type { UserRole } from "@/lib/user-management";

export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    id: "readonly.basic",
    label: "Nur Lesen (Basis)",
    description: "Dashboard und Dokumentation lesen; keine Änderungen möglich.",
    permissions: ["project:view", "workpackage:view", "activity:view", "system:view"],
  },
  {
    id: "project.manage",
    label: "Projekte pflegen",
    description: "Projekte, Arbeitspakete und Tätigkeiten anlegen und bearbeiten.",
    permissions: [
      "project:view",
      "project:edit",
      "workpackage:view",
      "workpackage:edit",
      "activity:view",
      "activity:edit",
    ],
  },
  {
    id: "azure.readonly",
    label: "Azure lesen",
    description: "Azure-Verbindung testen und Daten exportieren.",
    permissions: ["azure.subscription:test", "azure.subscription:export"],
  },
  {
    id: "azure.operate",
    label: "Azure betreiben",
    description: "Azure exportieren, importieren und Ressourcengruppen bauen.",
    permissions: [
      "azure.subscription:test",
      "azure.subscription:export",
      "azure.subscription:import",
      "azure.resourceGroup:build",
    ],
  },
  {
    id: "admin.users",
    label: "Benutzer verwalten",
    description: "Benutzerkonten anlegen, bearbeiten und archivieren.",
    permissions: ["system:manage"],
  },
  {
    id: "admin.system",
    label: "System administrieren",
    description: "Rollenzuweisungen, Audit-Logs, Restore.",
    permissions: ["system:manage", "system:restore", "system:view"],
  },
] as const;

/**
 * Vorschlagsmapping Rolle → Groups. Wird von `evaluateAccess()` **noch nicht**
 * ausgewertet (v1-Matrix bleibt gültig); dient als Ausgangspunkt für den
 * Rollen-Editor und die Entra-Gruppen-Zuordnung.
 */
export const ROLE_TO_GROUPS: Record<UserRole, readonly string[]> = {
  systemadministrator: ["admin.system", "admin.users", "azure.operate", "project.manage"],
  administrator: ["admin.users", "azure.operate", "project.manage"],
  teamlead: ["azure.readonly", "project.manage"],
  projectmanager: ["azure.readonly", "project.manage"],
  engineer: ["project.manage"],
  customer: ["readonly.basic"],
  viewer: ["readonly.basic"],
};

/** Löst eine Group-Id in ihre Permissions auf. Unbekannte Ids → leer. */
export function permissionsForGroup(groupId: string): readonly PermissionV2[] {
  return PERMISSION_GROUPS.find((g) => g.id === groupId)?.permissions ?? [];
}
