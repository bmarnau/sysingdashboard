import { describe, expect, it } from "vitest";
import { evaluateAccess } from "@/lib/rbac/access";
import type { RoleAssignment } from "@/lib/rbac/types";
import { makeUser } from "../../fixtures/users";

const asg = (over: Partial<RoleAssignment>): RoleAssignment => ({
  id: "asg-x",
  principalId: "usr-1",
  principalType: "user",
  role: "engineer",
  scope: "*",
  source: "local",
  grantedAt: "2026-01-01T00:00:00Z",
  grantedBy: "usr-sysadmin",
  ...over,
});

describe("evaluateAccess (v2 with v1 fallback)", () => {
  it("should_delegateToV1_when_noAssignments", () => {
    expect(evaluateAccess(makeUser("engineer"), "workpackage.edit")).toBe(true);
    expect(evaluateAccess(makeUser("engineer"), "users.manage")).toBe(false);
  });

  it("should_grantAccess_when_assignmentScopeIncludesTarget", () => {
    const user = makeUser("viewer");
    const assignments = [asg({ role: "administrator", scope: "tenant:northbit" })];
    const ok = evaluateAccess(user, "users.manage", {
      assignments,
      scope: "tenant:northbit/customer:acme",
    });
    expect(ok).toBe(true);
  });

  it("should_denyAccess_when_scopeDisjoint", () => {
    const user = makeUser("viewer");
    const assignments = [asg({ role: "administrator", scope: "tenant:other" })];
    const ok = evaluateAccess(user, "users.manage", {
      assignments,
      scope: "tenant:northbit",
    });
    expect(ok).toBe(false);
  });

  it("should_denyAccess_when_assignmentExpired", () => {
    const assignments = [
      asg({ role: "administrator", scope: "*", expiresAt: "2020-01-01T00:00:00Z" }),
    ];
    const ok = evaluateAccess(makeUser("viewer"), "users.manage", {
      assignments,
      now: Date.parse("2026-07-12T00:00:00Z"),
    });
    expect(ok).toBe(false);
  });

  it("should_denyByDefault_when_roleLacksPermissionEvenWithScope", () => {
    const assignments = [asg({ role: "viewer", scope: "*" })];
    const ok = evaluateAccess(makeUser("viewer"), "users.manage", { assignments });
    expect(ok).toBe(false);
  });
});
