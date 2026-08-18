/**
 * Statische Absicherung der administrativen Passwortsetzung.
 *
 * Geprüft werden die Sicherheitsmerkmale, die durch spätere Änderungen nicht
 * verloren gehen dürfen: Authentifizierung, Berechtigung, Eigenkonto- und
 * Systemadministratorschutz, Drosselung, kein Passwort in Rückgabe, Logs
 * oder Prüfprotokoll.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FUNCTIONS = readFileSync(
  resolve(process.cwd(), "src/lib/admin/auth-accounts.functions.ts"),
  "utf8",
);
const HELPERS = readFileSync(
  resolve(process.cwd(), "src/lib/admin/auth-accounts.server.ts"),
  "utf8",
);
const DIALOG = readFileSync(
  resolve(process.cwd(), "src/components/admin/SetPasswordDialog.tsx"),
  "utf8",
);

const BLOCK = (() => {
  const start = FUNCTIONS.indexOf("export const setAccountPassword =");
  expect(start).toBeGreaterThan(-1);
  const next = FUNCTIONS.indexOf("\nexport const ", start + 10);
  return FUNCTIONS.slice(start, next === -1 ? undefined : next);
})();

describe("Administrative Passwortsetzung", () => {
  it("should_requireAuthenticatedSessionAndUsersManage", () => {
    expect(BLOCK).toContain(".middleware([requireSupabaseAuth])");
    expect(BLOCK).toContain("assertUserManage");
    expect(HELPERS).toContain('_perm: "users.manage"');
  });

  it("should_protectOwnAccount", () => {
    expect(BLOCK).toContain("data.userId === context.userId");
    expect(BLOCK).toContain("eigenen Kontos");
  });

  it("should_protectSystemAdministratorTargets", () => {
    expect(BLOCK).toContain("isSystemAdministrator(admin, data.userId)");
    expect(BLOCK).toContain("isSystemAdministrator(admin, context.userId)");
  });

  it("should_enforcePasswordPolicyAndMaxLength", () => {
    expect(BLOCK).toContain("password.length < 8");
    expect(BLOCK).toContain("password.length > 200");
  });

  it("should_throttleViaExistingAuditData", () => {
    expect(BLOCK).toContain("tooManyRecentPasswordSets");
    expect(HELPERS).toContain('.eq("action", "auth_account.password_set")');
    expect(HELPERS).toContain('.gte("occurred_at", since)');
  });

  it("should_notReturnOrAuditThePassword", () => {
    expect(BLOCK).toContain('"auth_account.password_set"');
    expect(BLOCK).toContain('result: error ? "failed" : "updated"');
    const audit = BLOCK.slice(BLOCK.indexOf('"auth_account.password_set"'));
    expect(audit).not.toMatch(/password/i);
    expect(BLOCK).toContain("Promise<{ ok: true }>");
    expect(BLOCK).not.toMatch(/return \{ ok: true, password/);
  });

  it("should_loadPrivilegedClientOnlyOnServer", () => {
    expect(FUNCTIONS).not.toMatch(/^import .*client\.server/m);
    expect(BLOCK).toContain('await import("@/lib/admin/auth-accounts.server")');
    expect(DIALOG).not.toMatch(/client\.server|auth-accounts\.server/);
  });

  it("should_notLogOrPersistThePasswordInTheBrowser", () => {
    expect(FUNCTIONS).not.toMatch(/console\.(log|info|warn|error)/);
    expect(DIALOG).not.toMatch(/console\.(log|info|warn|error)/);
    expect(DIALOG).not.toMatch(/localStorage|sessionStorage/);
  });

  it("should_notPromiseAnEnforcedPasswordChange", () => {
    expect(DIALOG).not.toMatch(/Temporäres Passwort/i);
    expect(DIALOG).toContain("sollte der Benutzer nach der nächsten Anmeldung selbst ändern");
  });

  it("should_notTouchIdentityProfileRoleOrAvkkAssignments", () => {
    // Es wird ausschließlich das Passwort des bestehenden Kontos aktualisiert.
    expect(BLOCK).toContain("auth.admin.updateUserById(data.userId, {");
    expect(BLOCK).not.toMatch(/deleteUser|createUser|from\("profiles"\)|from\("user_roles"\)\s*\n?\s*\.(insert|update|delete)|avkk_/);
  });
});
