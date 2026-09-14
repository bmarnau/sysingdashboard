import { describe, expect, it } from "vitest";
import { ALL_PERMISSIONS, ROLE_PERMISSIONS, permissionsOf } from "@/lib/rbac/permissions";
import type { UserRole } from "@/lib/user-management";

// TDD RED verified on CI #681; subsequent type-exhaustiveness fixes do not change this contract.
const EXISTING_ROLES = [
  "systemadministrator",
  "administrator",
  "teamlead",
  "projectmanager",
  "engineer",
  "customer",
  "viewer",
] as const;

describe("kiosk RBAC contract", () => {
  it("grants kiosk exactly kiosk.view", () => {
    expect(permissionsOf("kiosk" as UserRole)).toEqual(["kiosk.view"]);
  });

  it("registers kiosk.view without granting it to existing roles", () => {
    expect(ALL_PERMISSIONS as readonly string[]).toContain("kiosk.view");

    for (const role of EXISTING_ROLES) {
      expect(ROLE_PERMISSIONS[role] as readonly string[]).not.toContain("kiosk.view");
    }
  });
});
