/**
 * F-18 — Local-First-CRUD an die bestehende RBAC-Matrix binden.
 *
 * Kein neues Berechtigungskonzept: die Zuordnung Fachobjekt → bestehende
 * Permission wird hier nur einmal zentral benannt, damit UI-Gating und
 * defensive Handler-Prüfung dieselbe Quelle verwenden.
 */
import type { UserProfile } from "@/lib/user-management";
import { can, type Permission } from "@/lib/rbac/permissions";

export type CrudEntity = "project" | "workpackage" | "activity";

export const CRUD_PERMISSION: Record<CrudEntity, Permission> = {
  project: "project.edit",
  workpackage: "workpackage.edit",
  activity: "activity.edit",
};

/** Darf der Benutzer das Fachobjekt anlegen/ändern/löschen? */
export function canMutate(user: UserProfile | null, entity: CrudEntity): boolean {
  return can(user, CRUD_PERMISSION[entity]);
}

/** Darf der Benutzer mindestens ein Fachobjekt anlegen? (globales „+ Neu“) */
export function canCreateAny(user: UserProfile | null): boolean {
  return (Object.keys(CRUD_PERMISSION) as CrudEntity[]).some((e) => canMutate(user, e));
}
