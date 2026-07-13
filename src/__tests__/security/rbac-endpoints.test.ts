/**
 * Security-Suite: prüft, dass RBAC-Matrix und Endpoint-Schemas den in
 * ADR-0002 / ADR-0007 definierten Grenzen entsprechen.
 */
import { describe, expect, it } from "vitest";
import "../env/test-instance";
import { ROLE_PERMISSIONS } from "@/lib/rbac/permissions";

describe("Security – RBAC-Grenzen", () => {
  it("should_notAllowRoleManage_when_notSystemAdministrator", () => {
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      if (role === "systemadministrator") continue;
      expect(perms, `Rolle ${role} darf 'roles.manage' NICHT haben`).not.toContain("roles.manage");
    }
  });

  it("should_notAllowAzureDatabaseBuild_when_notSystemAdministrator", () => {
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      if (role === "systemadministrator") continue;
      expect(perms).not.toContain("azure.database.build");
    }
  });
});
