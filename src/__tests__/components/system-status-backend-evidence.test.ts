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
    expect(DIALOG).toContain(
      'label="MVP-Datenplattform" value="Supabase — Architektur-/Betriebsmodell"',
    );
    expect(DIALOG).toContain('label="Supabase Client-Konfiguration"');
    expect(DIALOG).toContain('label="Backend-Verbindung"');
    expect(DIALOG).toContain("erreichbar — geschützte Admin-Prüfung");
    expect(DIALOG).toContain("nicht geprüft — users.manage erforderlich");
    expect(DIALOG).toContain("vom Hosting nicht bereitgestellt");
  });

  it("should_distinguishBuildMetadata_fromLiveGithubMain", () => {
    expect(DIALOG).toContain('label="Build branch"');
    expect(DIALOG).toContain('label="Build commit"');
    expect(DIALOG).toContain('label="GitHub main HEAD"');
    expect(DIALOG).toContain('label="Synchronisationsstatus"');
    expect(DIALOG).toContain('"Zuletzt gegen GitHub geprüft"');
    expect(DIALOG).toContain('"Letzter erfolgreicher GitHub-Nachweis"');
    expect(DIALOG).toContain("resolveGitSyncState(ghCommit, ghMainCommit, ghEvidenceCurrent)");
    expect(DIALOG).toContain("NICHT PRÜFBAR — Status-API nicht erreichbar");
    expect(DIALOG).toContain("zuletzt bekannt:");
    expect(DIALOG).toContain("NICHT PRÜFBAR");
  });

  it("should_notPresentConfigurationAsOperationalProof", () => {
    expect(DIALOG).toContain("kein Live-Health-Nachweis");
    expect(DIALOG).toContain("kein Credential-Nachweis");
    expect(DIALOG).toContain("keine Verbindungsprüfung");
    expect(DIALOG).toContain("kein externer Secret-Store-Nachweis");
    expect(DIALOG).toContain("kein Betriebsnachweis");
    expect(DIALOG).toContain("hier nicht live abgefragt");
    expect(DIALOG).toContain("Laufzeitprobe PASS");
  });

  it("should_reportSupabaseAsMvpAuthProvider_whenNoOverrideExists", () => {
    expect(STATUS_SERVICE).toContain("function resolveAuthProvider()");
    expect(STATUS_SERVICE).toContain('envOrNull("AUTH_PROVIDER") || "supabase"');
    expect(STATUS_SERVICE).toContain("const authMode = resolveAuthProvider();");
    expect(STATUS_SERVICE).not.toContain('envOrNull("AUTH_PROVIDER") || "local"');
  });
});
