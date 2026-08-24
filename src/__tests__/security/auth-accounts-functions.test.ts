/**
 * Statische Absicherung der Admin-Serverfunktionen für Auth-Konten.
 *
 * Der Passwort-Reset ist eine privilegierte Auth-Operation. Diese Tests
 * verhindern, dass die Sicherheitsmerkmale (Rollenprüfung, kein privilegierter
 * Client im Browser, kein Setzen/Ausgeben von Passwörtern oder Tokens,
 * Audit-Eintrag) durch spätere Änderungen unbemerkt verloren gehen.
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

/** Handler-Rumpf einer exportierten Serverfunktion ausschneiden. */
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
];

describe("Admin-Serverfunktionen für Auth-Konten", () => {
  it("should_useCanonicalTanStackValidatorApi", () => {
    expect(FUNCTIONS).not.toContain(".inputValidator(");
    expect(FUNCTIONS.match(/\.validator\(/g)).toHaveLength(5);
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
    // Prüfung läuft im Benutzerkontext, nicht über den privilegierten Client.
    expect(HELPERS).toContain('_perm: "users.manage"');
    expect(HELPERS).toContain("context.supabase.rpc");
  });

  it("should_loadPrivilegedClientOnlyOnServer", () => {
    // Kein Top-Level-Import des privilegierten Clients im Serverfunktionsmodul.
    expect(FUNCTIONS).not.toMatch(/^import .*client\.server/m);
    expect(FUNCTIONS).toContain('await import("@/lib/admin/auth-accounts.server")');
    // Der Dialog (Browser) darf den privilegierten Pfad nie importieren.
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
    // Die Zieladresse stammt nicht aus der Client-Eingabe.
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
    // Kein Token-Wert im Audit-Payload (Kommentare bleiben unberührt).
    const payload = block.slice(block.indexOf('"auth.password_reset_requested"'));
    expect(payload).not.toMatch(/token/i);
  });

  it("should_notLogPasswordsOrSecrets", () => {
    expect(FUNCTIONS).not.toMatch(/console\.(log|info|warn|error)/);
    expect(HELPERS).not.toMatch(/console\.(log|info|warn|error)/);
  });
});
