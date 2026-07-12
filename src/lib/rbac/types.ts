/**
 * RBAC v2 — Typen (additiv, vorbereitend).
 *
 * Diese Datei ist bewusst rein deklarativ und wird von der heutigen
 * `permissions.ts` (v1-Matrix) **nicht** aufgerufen. Sie definiert die
 * Datenformen, auf die spätere Iterationen aufsetzen:
 *
 *  - **Resource Types** — Ressourcenhierarchie inklusive späterer Azure-
 *    Ressourcen und Multi-Customer.
 *  - **ResourceScope** — hierarchische Zeichenkette der Form
 *    `tenant:{id}/customer:{id}/project:{id}/...`; Wildcards mit `*`.
 *  - **Permission v2** — `resource:action`-Format, koexistent mit den
 *    heutigen flachen v1-Strings (siehe ADR-0007 Migrationspfad).
 *  - **PermissionGroup** — benannte Bündel für UI-Auswahl und Entra-
 *    Gruppen-Mapping.
 *  - **RoleAssignment** — Prinzipal (User/Gruppe/Service) × Rolle × Scope
 *    × Herkunft. Ersetzt später den impliziten „eine Rolle pro User"-Wert
 *    aus `UserProfile.role`.
 *  - **AccessContext** — Auswertungs-Input für `evaluateAccess()`.
 *
 * Sicherheitsdisclaimer bleibt: solange keine echte Auth aktiv ist, sind
 * alle Prüfungen UI-Komfort und keine Sicherheitsgrenze (siehe ADR-0002).
 */

import type { UserRole } from "@/lib/user-management";

/** Ressourcentypen der Hierarchie. Reihenfolge = Vererbungsrichtung. */
export type ResourceType =
  | "tenant"
  | "customer"
  | "project"
  | "workpackage"
  | "activity"
  | "azure.subscription"
  | "azure.resourceGroup"
  | "system";

export const ALL_RESOURCE_TYPES: readonly ResourceType[] = [
  "tenant",
  "customer",
  "project",
  "workpackage",
  "activity",
  "azure.subscription",
  "azure.resourceGroup",
  "system",
] as const;

/**
 * Kanonische Aktionen. Nicht jede Aktion ist auf jeder Ressource sinnvoll —
 * die Matrix in `docs/RBAC-MATRIX.md` dokumentiert die zulässigen Kombinationen.
 */
export type Action =
  | "view"
  | "edit"
  | "create"
  | "delete"
  | "import"
  | "export"
  | "test"
  | "build"
  | "restore"
  | "manage";

/** Permission im v2-Format `resource:action` (z. B. `project:edit`). */
export type PermissionV2 = `${ResourceType}:${Action}`;

/**
 * Hierarchische Scope-Kennung.
 *
 * Format:  `tenant:{id}[/customer:{id}[/project:{id}[/workpackage:{id}[/activity:{id}]]]]`
 * Wildcard: `*` an einer beliebigen Ebene (`tenant:acme/customer:*`).
 * Root:     `*` bedeutet globaler Zugriff (system-weit).
 *
 * Beispiele:
 *  - `tenant:acme`                                → gesamter Mandant Acme
 *  - `tenant:acme/customer:c-42`                  → Kunde c-42 in Acme
 *  - `tenant:acme/customer:*`                     → alle Kunden in Acme
 *  - `azure.subscription:sub-01`                  → einzelne Azure-Subscription
 */
export type ResourceScope = string;

/** Root-Scope (globaler Zugriff). */
export const SCOPE_ROOT: ResourceScope = "*";

/** Benannte Permission Group — UI-Bündel + späteres Entra-Mapping. */
export interface PermissionGroup {
  id: string;
  label: string;
  description: string;
  permissions: readonly PermissionV2[];
}

/** Prinzipal-Typ eines Assignments. */
export type PrincipalType = "user" | "group" | "service";

/** Herkunft eines Assignments. */
export type AssignmentSource = "local" | "entra";

/**
 * Zuweisung einer Rolle an einen Prinzipal auf einem bestimmten Scope.
 * Ersetzt später `UserProfile.role`. Bewusst als Array pflegbar
 * (`principalId × scope`), damit Multi-Customer-Nutzer je Kunde eigene
 * Rollen tragen können.
 */
export interface RoleAssignment {
  id: string;
  principalId: string;
  principalType: PrincipalType;
  role: UserRole;
  scope: ResourceScope;
  source: AssignmentSource;
  /** ISO-Timestamp. */
  grantedAt: string;
  /** Actor-Id des Grantors (`system` bei automatischen Grants). */
  grantedBy: string;
  /** Optional. ISO-Timestamp; abgelaufene Assignments zählen nicht. */
  expiresAt?: string;
}

/** Auswertungs-Kontext für `evaluateAccess()`. */
export interface AccessContext {
  /** Alle Assignments des aktiven Prinzipals (bereits gefiltert). */
  assignments: readonly RoleAssignment[];
  /** Optionaler Ziel-Scope. Fehlt = globale Aktion (system). */
  scope?: ResourceScope;
  /** Referenz-Zeitstempel für Ablauf. Default `Date.now()`. */
  now?: number;
}
