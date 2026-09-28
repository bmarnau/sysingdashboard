import { describe, expect, it } from "vitest";
import { ROLE_PERMISSIONS } from "@/lib/rbac/permissions";

describe("AVKK management permission contract", () => {
  it("never grants avkk.management.view without avkk.view", () => {
    for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      if (!permissions.includes("avkk.management.view")) continue;
      expect(permissions, role).toContain("avkk.view");
    }
  });
});
