/**
 * QS-06 — Permission `billing.view` (Befund M4, Test T9)
 *
 * Abrechnungsdaten (Umsatz, Satz, Betrag, Abrechnungsstatus) dürfen nur
 * Systemadministrator, Administrator, Teamlead und Projektmanager sehen.
 * Engineer sieht nur Stunden; Customer, Viewer und Kiosk sehen keine Beträge.
 * Ausschließlich synthetische Daten.
 */
import { describe, expect, it } from "vitest";
import {
  ALL_PERMISSIONS,
  PERMISSION_LABEL,
  ROLE_PERMISSIONS,
  can,
  type Permission,
} from "@/lib/rbac/permissions";
import type { UserProfile, UserRole } from "@/lib/user-management";

const PERM = "billing.view" as Permission;
const ALLOW: UserRole[] = ["systemadministrator", "administrator", "teamlead", "projectmanager"];
const DENY: UserRole[] = ["engineer", "viewer", "customer", "kiosk"];

const userOf = (role: UserRole): UserProfile =>
  ({ id: `u-${role}`, role }) as unknown as UserProfile;

describe("QS-06 Permission billing.view", () => {
  it("ist registriert und beschriftet", () => {
    expect(ALL_PERMISSIONS).toContain(PERM);
    expect(PERMISSION_LABEL[PERM]).toBeTruthy();
  });

  it.each(ALLOW)("ALLOW für %s", (role) => {
    expect(ROLE_PERMISSIONS[role]).toContain(PERM);
    expect(can(userOf(role), PERM)).toBe(true);
  });

  it.each(DENY)("DENY für %s", (role) => {
    expect(ROLE_PERMISSIONS[role]).not.toContain(PERM);
    expect(can(userOf(role), PERM)).toBe(false);
  });

  it("Backend-RBAC ist deckungsgleich", async () => {
    const backend = (await import("../../../backend/services/rbac.mjs")) as {
      ALL_PERMISSIONS: readonly string[];
      ROLE_PERMISSIONS: Record<string, readonly string[]>;
    };
    expect(backend.ALL_PERMISSIONS).toContain(PERM);
    for (const role of ALLOW) expect(backend.ROLE_PERMISSIONS[role]).toContain(PERM);
    for (const role of DENY) expect(backend.ROLE_PERMISSIONS[role] ?? []).not.toContain(PERM);
  });
});
