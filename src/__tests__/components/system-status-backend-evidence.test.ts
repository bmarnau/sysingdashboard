import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DIALOG = readFileSync(
  resolve(process.cwd(), "src/components/SystemStatusDialog.tsx"),
  "utf8",
);
const STATUS_SERVICE = readFileSync(
  resolve(process.cwd(), "backend/services/statusService.mjs"),
  "utf8",
);

describe("Systemstatus — Backend-Evidenz", () => {
  it("should_gateProtectedBackendCheck_withUsersManage", () => {
    expect(DIALOG).toContain('const canManageUsers = can(currentUser, "users.manage")');

    const start = DIALOG.indexOf("const refreshAdminBackend");
    const end = DIALOG.indexOf("useEffect", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = DIALOG.slice(start, end);

    expect(block).toContain("if (!canManageUsers)");
    expect(block).toContain("await getAuthBackendStatus()");
    expect(DIALOG).not.toContain("listAuthAccounts");
  });

  it("should_showSecretFreeSupabaseEvidence_withoutPretendingCommitConfiguration", () => {
    expect(DIALOG).toContain('label="MVP-Datenplattform" value="Supabase"');
    expect(DIALOG).toContain('label="Auth-Konfiguration"');
    expect(DIALOG).toContain('label="Backend-Verbindung"');
    expect(DIALOG).toContain("erreichbar — geschützte Admin-Prüfung");
    expect(DIALOG).toContain("nicht geprüft — users.manage erforderlich");
    expect(DIALOG).toContain("vom Hosting nicht bereitgestellt");
  });

  it("should_reportSupabaseAsMvpAuthProvider_whenNoOverrideExists", () => {
    expect(STATUS_SERVICE).toContain('authMode: envOrNull("AUTH_PROVIDER") || "supabase"');
    expect(STATUS_SERVICE).not.toContain('authMode: envOrNull("AUTH_PROVIDER") || "local"');
  });
});
