/**
 * Security-Suite – RBAC v2 (Scopes, Assignments, evaluateAccess).
 *
 * Reine Logik-Tests der additiven v2-Schicht (`src/lib/rbac/access.ts`,
 * `src/lib/rbac/scope.ts`). Assignments sind heute nicht produktiv im
 * Auth-Pfad — der Test verifiziert, dass die Bausteine trag­fähig sind.
 */
import { describe, expect, it } from "vitest";
import "../env/test-instance";

import { parseScope, serializeScope, scopeIncludes, narrowestScope } from "@/lib/rbac/scope";
import { evaluateAccess, evaluateAccessV2 } from "@/lib/rbac/access";
import { SCOPE_ROOT, type RoleAssignment } from "@/lib/rbac/types";
import type { UserProfile } from "@/lib/user-management";

const REF_NOW = Date.parse("2026-06-01T00:00:00Z");

function mkAssignment(patch: Partial<RoleAssignment>): RoleAssignment {
  return {
    id: patch.id ?? "a-1",
    principalId: "usr-1",
    principalType: "user",
    role: "engineer",
    scope: SCOPE_ROOT,
    source: "local",
    grantedAt: "2026-01-01T00:00:00Z",
    grantedBy: "test",
    ...patch,
  };
}

const anyUser: UserProfile = {
  id: "usr-1", firstName: "T", lastName: "U", displayName: "TU", email: "", phone: "",
  role: "engineer", status: "active", mfaEnabled: false,
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
};

describe("RBAC v2 – Scope-Utilities", () => {
  it.each([
    ["*", []],
    ["tenant:acme", [{ type: "tenant", id: "acme" }]],
    ["tenant:acme/customer:c-42", [
      { type: "tenant", id: "acme" },
      { type: "customer", id: "c-42" },
    ]],
  ])("should_parseAndRoundtrip_when_scopeIs_%s", (scope, expected) => {
    expect(parseScope(scope)).toEqual(expected);
    expect(serializeScope(expected as never)).toBe(scope);
  });

  it("should_throw_when_scopeSegmentIsMalformed", () => {
    expect(() => parseScope("tenant-acme")).toThrow(/Invalid scope/);
  });

  it("should_matchWithWildcardsAndInheritance_when_scopeIncludesEvaluated", () => {
    expect(scopeIncludes("*", "tenant:a/customer:c")).toBe(true);
    expect(scopeIncludes("tenant:a", "tenant:a/customer:c")).toBe(true);
    expect(scopeIncludes("tenant:a/customer:*", "tenant:a/customer:c1")).toBe(true);
    expect(scopeIncludes("tenant:a/customer:c1", "tenant:a")).toBe(false);
    expect(scopeIncludes("tenant:a", "tenant:b")).toBe(false);
    expect(scopeIncludes("tenant:a", "customer:c")).toBe(false); // Typ-Mismatch
  });

  it("should_returnNarrowerOrNull_when_narrowestScopeIsChecked", () => {
    expect(narrowestScope("tenant:a", "tenant:a/customer:c")).toBe("tenant:a/customer:c");
    expect(narrowestScope("tenant:a", "tenant:b")).toBeNull();
  });

  it.each([
    "customer:c-42",
    "azure.subscription:sub-01",
    "azure.resourceGroup:rg-prod",
  ])("should_acceptFixtureScope_when_parsingRealWorldExample_%s", (scope) => {
    expect(() => parseScope(scope)).not.toThrow();
  });
});

describe("RBAC v2 – Assignment-Auswertung", () => {
  it("should_denyExpiredAssignment_when_evaluateAccessRunsAfterExpiry", () => {
    const expired = mkAssignment({
      role: "administrator",
      expiresAt: "2026-05-01T00:00:00Z",
    });
    const ok = evaluateAccess(anyUser, "users.manage", {
      assignments: [expired], scope: "*", now: REF_NOW,
    });
    expect(ok).toBe(false);
  });

  it("should_allowActiveAssignment_when_scopeMatches", () => {
    const active = mkAssignment({ role: "administrator", scope: "tenant:a" });
    const ok = evaluateAccess(anyUser, "users.manage", {
      assignments: [active], scope: "tenant:a/customer:c", now: REF_NOW,
    });
    expect(ok).toBe(true);
  });

  it("should_denyAssignment_when_scopeDoesNotInclude", () => {
    const foreign = mkAssignment({ role: "administrator", scope: "tenant:b" });
    const ok = evaluateAccess(anyUser, "users.manage", {
      assignments: [foreign], scope: "tenant:a", now: REF_NOW,
    });
    expect(ok).toBe(false);
  });

  it("should_supportMultipleAssignments_when_oneMatches", () => {
    const a1 = mkAssignment({ id: "a1", role: "viewer", scope: "tenant:a" });
    const a2 = mkAssignment({ id: "a2", role: "administrator", scope: "tenant:a" });
    const ok = evaluateAccess(anyUser, "users.manage", {
      assignments: [a1, a2], scope: "tenant:a", now: REF_NOW,
    });
    expect(ok).toBe(true);
  });

  it.each(["local", "entra"] as const)(
    "should_treatSourceAsInformational_when_sourceIs_%s",
    (source) => {
      const a = mkAssignment({ role: "administrator", source });
      const ok = evaluateAccess(anyUser, "users.manage", {
        assignments: [a], scope: "*", now: REF_NOW,
      });
      expect(ok).toBe(true);
    },
  );

  it("should_delegateToV1_when_noAssignmentsGiven", () => {
    // Ohne Assignments greift die klassische v1-Matrix (anyUser=engineer).
    expect(evaluateAccess(anyUser, "dashboard.view")).toBe(true);
    expect(evaluateAccess(anyUser, "users.manage")).toBe(false);
  });
});

describe("RBAC v2 – evaluateAccessV2 (native)", () => {
  const rolePerms = (role: string): readonly `${string}:${string}`[] =>
    role === "administrator" ? ["project:edit", "workpackage:edit"] : [];

  it("should_denyRevokedOrExpired_when_evaluateAccessV2Runs", () => {
    const revoked = mkAssignment({
      role: "administrator",
      expiresAt: "2026-01-01T00:00:00Z", // vor REF_NOW
    });
    expect(
      evaluateAccessV2("project:edit", [revoked], "*", rolePerms as never, REF_NOW),
    ).toBe(false);
  });

  it("should_grant_when_assignmentHasMatchingPermissionAndScope", () => {
    const a = mkAssignment({ role: "administrator", scope: "tenant:a" });
    expect(
      evaluateAccessV2("project:edit", [a], "tenant:a/customer:c", rolePerms as never, REF_NOW),
    ).toBe(true);
  });
});

describe("RBAC v2 – Sysadmin-Schutz kann nicht via v2 umgangen werden", () => {
  it("should_stillRespectV1MatrixForRoleManage_when_assignmentGrantsEngineerRole", () => {
    // Ein Engineer-Assignment darf niemals `roles.manage` erlauben,
    // auch wenn Scope = Root. v2 delegiert an v1 → v1 sagt Nein.
    const a = mkAssignment({ role: "engineer", scope: SCOPE_ROOT });
    const ok = evaluateAccess(anyUser, "roles.manage", {
      assignments: [a], scope: SCOPE_ROOT, now: REF_NOW,
    });
    expect(ok).toBe(false);
  });
});
