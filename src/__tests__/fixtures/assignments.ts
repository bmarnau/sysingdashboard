import type { RoleAssignment } from "@/lib/rbac/types";

export function makeAssignment(overrides: Partial<RoleAssignment> = {}): RoleAssignment {
  return {
    id: overrides.id ?? "asg-test-1",
    principalId: overrides.principalId ?? "usr-test-1",
    principalType: overrides.principalType ?? "user",
    role: overrides.role ?? "engineer",
    scope: overrides.scope ?? "*",
    source: overrides.source ?? "local",
    grantedAt: overrides.grantedAt ?? "2026-01-01T00:00:00.000Z",
    grantedBy: overrides.grantedBy ?? "usr-sysadmin",
    ...overrides,
  };
}

export const testAssignments: RoleAssignment[] = [
  makeAssignment(),
  makeAssignment({
    id: "asg-test-2",
    role: "administrator",
    scope: "tenant:northbit",
    principalId: "usr-test-2",
  }),
];
