/**
 * Rollen-Fixture: seedet vor jedem Test einen bekannten Benutzer mit
 * definierter Rolle in localStorage. Damit sind Rollen-abhängige Tests
 * deterministisch, ohne die produktive Benutzerverwaltung zu berühren.
 *
 * Trade-off: rein Client-seitiges Seeding – ausreichend für UI-Sichtbarkeit
 * (`PermissionGate`), aber KEIN Ersatz für serverseitige RBAC-Prüfung.
 * Backend-Denial wird in `specs/rbac/backend-denial.spec.ts` separat gegen
 * die tatsächlichen Endpunkte geprüft.
 */
import type { Page } from "@playwright/test";

export type SeedRole =
  | "systemadministrator"
  | "administrator"
  | "teamlead"
  | "projectmanager"
  | "engineer"
  | "customer"
  | "viewer";

export const ALL_SEED_ROLES: SeedRole[] = [
  "systemadministrator",
  "administrator",
  "teamlead",
  "projectmanager",
  "engineer",
  "customer",
  "viewer",
];

interface SeedUser {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  role: SeedRole;
  status: "active";
  mfaEnabled: false;
  createdAt: string;
  updatedAt: string;
}

function makeUser(role: SeedRole): SeedUser {
  const now = new Date("2026-07-13T00:00:00.000Z").toISOString();
  return {
    id: `e2e-${role}`,
    firstName: "E2E",
    lastName: role,
    displayName: `E2E ${role}`,
    email: `${role}@e2e.local`,
    phone: "",
    role,
    status: "active",
    mfaEnabled: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Muss VOR `page.goto` aufgerufen werden – der Init-Script läuft, bevor
 * die App das localStorage liest.
 */
export async function seedRole(page: Page, role: SeedRole): Promise<void> {
  const user = makeUser(role);
  await page.addInitScript(
    ({ user }: { user: SeedUser }) => {
      try {
        window.localStorage.setItem("northbit-users", JSON.stringify([user]));
        window.localStorage.setItem("northbit-active-user", user.id);
        window.localStorage.setItem("test:e2e-role", user.role);
      } catch {
        /* Quota / Storage disabled – der jeweilige Test entscheidet, ob das ein Fehler ist. */
      }
    },
    { user },
  );
}
