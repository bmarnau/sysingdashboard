/**
 * Security-Suite – Manipulationsversuche.
 *
 * Wichtig: Auth ist aktiv. Die Tests hier dokumentieren zwei Klassen von Ergebnissen:
 *  1. Erwartungen, die DURCH den Code sichergestellt sind (Zod-Reject,
 *     scope-Prüfung, Sensitive-Field-Stripping).
 *  2. Regressionsschutz gegen historische Lücken — z. B. dass ein
 *     manipulierter `northbit-active-user` keine Session-/Rollenautorität
 *     mehr besitzt (SEC-CRIT-002).
 */
import { describe, expect, it, afterEach } from "vitest";
import "../env/test-instance";
import { render, screen, cleanup } from "@testing-library/react";

import { PermissionGate } from "@/components/PermissionGate";
import { can } from "@/lib/rbac/permissions";
import { evaluateAccess } from "@/lib/rbac/access";
import { SCOPE_ROOT, type RoleAssignment } from "@/lib/rbac/types";
import { DashboardJsonExportSchema, stripSensitiveFields } from "@/lib/json-schema";
import {
  saveUsers,
  setActiveUserId,
  bootstrap,
  type UserProfile,
  type UserRole,
} from "@/lib/user-management";

afterEach(() => cleanup());

function seedAs(role: UserRole): UserProfile {
  const now = "2026-06-01T00:00:00.000Z";
  const u: UserProfile = {
    id: `usr-${role}`,
    firstName: role,
    lastName: "X",
    displayName: role,
    email: `${role}@t.local`,
    phone: "",
    role,
    status: "active",
    mfaEnabled: false,
    createdAt: now,
    updatedAt: now,
  };
  saveUsers([u]);
  setActiveUserId(u.id);
  return u;
}

describe("Manipulation – localStorage-Tampering (SEC-CRIT-002 behoben)", () => {
  it("should_ignoreForgedLocalStorage_when_deriveRoleFromSession", () => {
    // Vorher: `northbit-active-user` im localStorage verlieh sofort Sysadmin-Rechte.
    // Seit v1.39.0 leitet `useCurrentUser()` die Rolle ausschließlich aus der
    // Auth-Session + `public.user_roles` ab. Ohne Session ist der User null,
    // `can()` liefert false, und PermissionGate rendert den Fallback.
    seedAs("systemadministrator"); // wird jetzt vollständig ignoriert
    render(
      <PermissionGate permission="roles.manage" fallback={<span>denied</span>}>
        <span>allowed</span>
      </PermissionGate>,
    );
    expect(screen.getByText("denied")).toBeInTheDocument();
  });


  it("should_denyUiGate_when_activeUserRoleIsViewer", () => {
    seedAs("viewer");
    render(
      <PermissionGate permission="roles.manage" fallback={<span>denied</span>}>
        <span>allowed</span>
      </PermissionGate>,
    );
    expect(screen.getByText("denied")).toBeInTheDocument();
  });

  it("should_resetBootstrap_when_activeUserPointsToUnknownId", () => {
    seedAs("viewer");
    setActiveUserId("attacker-forged-id");
    const restored = bootstrap();
    expect(restored.role).toBe("viewer");
  });
});

describe("Manipulation – Assignment-Injection (Import-Pipeline)", () => {
  it("should_rejectImport_when_envelopeHasWrongShape", () => {
    const evil = { schemaVersion: "1.0.0" }; // Pflichtfelder fehlen
    const parsed = DashboardJsonExportSchema.safeParse(evil);
    expect(parsed.success).toBe(false);
  });

  it("should_stripSensitiveFields_when_importPayloadContainsThem", () => {
    const payload = {
      user: { id: "u1", token: "eyJabcdef.ghi.jkl", password: "p", displayName: "x" },
      nested: [{ apiKey: "k", ok: true }],
    };
    const clean = stripSensitiveFields(payload) as {
      user: Record<string, unknown>;
      nested: Array<Record<string, unknown>>;
    };
    expect(clean.user).not.toHaveProperty("token");
    expect(clean.user).not.toHaveProperty("password");
    expect(clean.nested[0]).not.toHaveProperty("apiKey");
    expect(clean.user.displayName).toBe("x");
    expect(clean.nested[0].ok).toBe(true);
  });

  it("should_notInterpretUserSuppliedAssignments_when_envelopeHasNoAssignmentsField", () => {
    const raw = {
      schemaVersion: "1.0.0",
      exportType: "full",
      exportedAt: "2026-01-01T00:00:00Z",
      exportedBy: "attacker",
      dashboardVersion: "0.0.0",
      users: [],
      assignments: [{ role: "systemadministrator", scope: "*" }],
    };
    const parsed = DashboardJsonExportSchema.parse(raw);
    expect(parsed).not.toHaveProperty("assignments");
  });
});

describe("Manipulation – Replay abgelaufener / manipulierter Assignments", () => {
  const REF_NOW = Date.parse("2026-06-01T00:00:00Z");
  const anyUser: UserProfile = seedAs("engineer");

  const base: RoleAssignment = {
    id: "a-1",
    principalId: anyUser.id,
    principalType: "user",
    role: "administrator",
    scope: SCOPE_ROOT,
    source: "local",
    grantedAt: "2026-01-01T00:00:00Z",
    grantedBy: "test",
  };

  it("should_denyAccess_when_replayingExpiredAssignment", () => {
    const expired: RoleAssignment = { ...base, expiresAt: "2026-05-01T00:00:00Z" };
    expect(
      evaluateAccess(anyUser, "users.manage", {
        assignments: [expired],
        scope: "*",
        now: REF_NOW,
      }),
    ).toBe(false);
  });

  it("should_denyAccess_when_scopePayloadMismatch", () => {
    const wrongScope: RoleAssignment = { ...base, scope: "tenant:foreign" };
    expect(
      evaluateAccess(anyUser, "users.manage", {
        assignments: [wrongScope],
        scope: "tenant:home",
        now: REF_NOW,
      }),
    ).toBe(false);
  });

  it("should_documentPurePermissionHelperBoundary_when_calledWithForgedRole", () => {
    const forged: UserProfile = { ...anyUser, role: "systemadministrator" };
    // `can()` ist eine reine Matrix-Funktion und validiert keine Identität.
    // Der Fix für SEC-CRIT-002 liegt davor: `useCurrentUser()` bezieht die
    // Rolle aus Session + `user_roles`, nicht aus localStorage/Payload.
    expect(can(forged, "roles.manage")).toBe(true);
  });
});
