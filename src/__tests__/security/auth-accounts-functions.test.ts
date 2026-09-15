/**
 * Statische Absicherung der Admin-Serverfunktionen für Auth-Konten.
 *
 * Privilegierte Auth-Operationen bleiben serverseitig abgesichert. Kiosk-
 * Provisionierung benötigt zusätzlich `roles.manage` und darf Passwortdaten
 * weder protokollieren noch zurückgeben.
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
  resolve(process.cwd(), "src/components/BackendAdminDialog.tsx"),
  "utf8",
);

function fnBlock(name: string): string {
  const start = FUNCTIONS.indexOf(`export const ${name} =`);
  expect(start).toBeGreaterThan(-1);
  const next = FUNCTIONS.indexOf("\nexport const ", start + 10);
  return FUNCTIONS.slice(start, next === -1 ? undefined : next);
}

const PRIVILEGED_FNS = [
  "getAuthBackendStatus",
  "listAuthAccounts",
  "confirmAuthAccount",
  "resendConfirmation",
  "requestPasswordReset",
  "deleteAuthAccount",
  "createKioskAuthAccount",
];

describe("Admin-Serverfunktionen für Auth-Konten", () => {
  it("should_useCanonicalTanStackValidatorApi", () => {
    expect(FUNCTIONS).not.toContain(".inputValidator(");
    expect(FUNCTIONS.match(/\.validator\(/g)).toHaveLength(6);
  });

  it("should_requireAuthenticatedSession_forEveryFunction", () => {
    for (const name of PRIVILEGED_FNS) {
      expect(fnBlock(name), `${name} ohne requireSupabaseAuth`).toContain(
        ".middleware([requireSupabaseAuth])",
      );
    }
  });

  it("should_requireUsersManagePermission_forEveryFunction", () => {
    for (const name of PRIVILEGED_FNS) {
      expect(fnBlock(name), `${name} ohne Berechtigungsprüfung`).toContain("assertUserManage");
    }
    expect(HELPERS).toContain('assertPermission(context, "users.manage")');
    expect(HELPERS).toContain("_perm: permission");
    expect(HELPERS).toContain("context.supabase.rpc");
  });

  it("should_requireRolesManageAdditionally_forKioskProvisioning", () => {
    const block = fnBlock("createKioskAuthAccount");
    expect(block).toContain("assertRolesManage");
    expect(HELPERS).toContain('assertPermission(context, "roles.manage")');
    expect(HELPERS).toContain("_perm: permission");
  });

  it("should_provisionExclusiveKioskRole_and_compensatePartialFailure", () => {
    const block = fnBlock("createKioskAuthAccount");
    expect(block).toContain("createKioskAccount");
    expect(HELPERS).toContain('role: "kiosk"');
    expect(HELPERS).toContain("auth.admin.deleteUser");
  });

  it("should_neverAuditOrReturnKioskPassword", () => {
    const block = fnBlock("createKioskAuthAccount");
    expect(block).toContain('"auth_account.kiosk_create"');
    const auditPart = block.slice(block.indexOf('"auth_account.kiosk_create"'));
    expect(auditPart).not.toMatch(/password\s*:/i);
    expect(auditPart).not.toMatch(/return[^;]*password/i);
  });

  it("should_loadPrivilegedClientOnlyOnServer", () => {
    expect(FUNCTIONS).not.toMatch(/^import .*client\.server/m);
    expect(FUNCTIONS).toContain('await import("@/lib/admin/auth-accounts.server")');
    expect(DIALOG).not.toMatch(/client\.server|auth-accounts\.server/);
  });

  it("should_keepBackendStatusMinimal_and_resolveOnlyCurrentAccount", () => {
    const block = fnBlock("getAuthBackendStatus");
    expect(block).toContain("auth.admin.getUserById(context.userId)");
    expect(block).toContain('return { provider: "supabase", connected: true }');
    expect(block).not.toMatch(
      /email|access_token|refresh_token|recovery_token|service_role|projectId|repositoryUrl|publishableKey|metadata/i,
    );
  });

  it("should_resolveTargetAccountServerSide_and_handleUnknownAccount", () => {
    const block = fnBlock("requestPasswordReset");
    expect(block).toContain("auth.admin.getUserById");
    expect(block).toContain("Konto wurde nicht gefunden.");
    expect(block).not.toMatch(/input\??\.email|data\.email/);
  });

  it("should_useRecoveryFlow_and_neverSetOrReturnPasswords", () => {
    const block = fnBlock("requestPasswordReset");
    expect(block).toContain("auth.resetPasswordForEmail");
    expect(block).not.toMatch(/password:\s|generateLink|updateUserById/);
    expect(block).not.toMatch(/access_token|refresh_token|recovery_token|service_role/i);
  });

  it("should_writeAuditEntryWithoutTokens", () => {
    const block = fnBlock("requestPasswordReset");
    expect(block).toContain('"auth.password_reset_requested"');
    expect(block).toContain('result: error ? "failed" : "sent"');
    const payload = block.slice(block.indexOf('"auth.password_reset_requested"'));
    expect(payload).not.toMatch(/token/i);
  });

  it("should_notLogPasswordsOrSecrets", () => {
    expect(FUNCTIONS).not.toMatch(/console\.(log|info|warn|error)/);
    expect(HELPERS).not.toMatch(/console\.(log|info|warn|error)/);
  });
});
