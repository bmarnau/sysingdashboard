import { describe, expect, it } from "vitest";
import {
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  can,
  canAll,
  canAny,
  permissionsOf,
  requirePermission,
} from "@/lib/rbac/permissions";
import { makeUser } from "../fixtures/users";

describe("can()", () => {
  it("should_returnFalse_when_userIsNull", () => {
    expect(can(null, "dashboard.view")).toBe(false);
  });

  it("should_returnTrue_when_roleHasPermission", () => {
    expect(can(makeUser("systemadministrator"), "azure.database.build")).toBe(true);
  });

  it("should_returnFalse_when_roleLacksPermission", () => {
    expect(can(makeUser("viewer"), "project.edit")).toBe(false);
  });
});

describe("RBAC matrix invariants", () => {
  it("should_restrictAzureDatabaseBuild_when_notSysAdmin", () => {
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      if (role !== "systemadministrator") {
        expect(perms).not.toContain("azure.database.build");
      }
    }
  });

  it("should_ensureAzureImportImpliesExport_when_roleHasImport", () => {
    for (const perms of Object.values(ROLE_PERMISSIONS)) {
      if (perms.includes("azure.import")) {
        expect(perms).toContain("azure.export");
      }
    }
  });

  it("should_denyEditAndAzurePermissions_when_viewerOrCustomer", () => {
    for (const role of ["viewer", "customer"] as const) {
      const perms = ROLE_PERMISSIONS[role];
      expect(perms.every((p) => !p.endsWith(".edit"))).toBe(true);
      expect(perms.every((p) => !p.startsWith("azure."))).toBe(true);
      expect(perms.every((p) => !p.endsWith(".manage"))).toBe(true);
    }
  });

  it("should_denySystemStatusView_when_customer", () => {
    expect(ROLE_PERMISSIONS.customer).not.toContain("systemstatus.view");
  });

  it("should_restrictRolesManage_when_notSysAdmin", () => {
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      if (role !== "systemadministrator") {
        expect(perms).not.toContain("roles.manage");
      }
    }
  });
});

describe("canAny / canAll / requirePermission", () => {
  it("should_returnTrue_when_userHasAnyOfList", () => {
    const user = makeUser("engineer");
    expect(canAny(user, ["azure.import", "activity.edit"])).toBe(true);
  });

  it("should_returnFalse_when_userMissingOneOfAllList", () => {
    const user = makeUser("engineer");
    expect(canAll(user, ["activity.edit", "users.manage"])).toBe(false);
  });

  it("should_throw_when_requirePermissionFails", () => {
    expect(() => requirePermission(makeUser("viewer"), "users.manage")).toThrow(
      /Permission denied/,
    );
  });

  it("should_exposeAllPermissionsInMatrix_when_iteratingAllPermissions", () => {
    // Sanity: jede Permission ist mindestens einer Rolle zugeordnet.
    for (const p of ALL_PERMISSIONS) {
      const found = Object.values(ROLE_PERMISSIONS).some((perms) => perms.includes(p));
      expect(found, `Permission ${p} ist keiner Rolle zugeordnet`).toBe(true);
    }
  });

  it("should_returnRolePermissions_when_permissionsOfCalled", () => {
    expect(permissionsOf("engineer")).toEqual(ROLE_PERMISSIONS.engineer);
  });
});
