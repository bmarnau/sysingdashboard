/**
 * QS-06 (F-QS6-ENG-02, Gate G09): Das JSON-Backup aus dem Exportdialog enthält
 * ohne `billing.view` keinen `hourlyRate`. Der JSON-Import liest das Feld
 * weiterhin (Rückwärtskompatibilität mit älteren Dateien).
 * Ausschließlich synthetische Daten.
 */
import "../env/test-instance";
import { beforeEach, describe, expect, it } from "vitest";
import { buildJsonBackupPayload } from "@/lib/export-data";
import { JsonImportService } from "@/lib/json-import-service";
import { JSON_SCHEMA_VERSION } from "@/lib/json-schema";
import { can } from "@/lib/rbac/permissions";
import { userScopedKey, type UserRole } from "@/lib/user-management";
import { BackupService } from "@/lib/backup-service";
import { makeUser } from "../fixtures/users";
import { readZipEntries } from "../fixtures/backup";
import { makeActivity, makeEngineer, makeProject, makeWorkPackage } from "../fixtures/activities";

const ALLOW: UserRole[] = ["systemadministrator", "administrator", "teamlead", "projectmanager"];
const DENY: UserRole[] = ["engineer", "viewer", "customer", "kiosk"];
const RATE = 137.5;

function backupFor(role: UserRole) {
  const includeBilling = can(makeUser(role), "billing.view");
  return buildJsonBackupPayload(
    {
      projects: [makeProject({ id: "p-1" })],
      workPackages: [makeWorkPackage({ id: "wp-1", projectId: "p-1" })],
      activities: [
        makeActivity({ id: "a-1", workPackageId: "wp-1", hourlyRate: RATE }),
        makeActivity({ id: "a-2", billable: false, billingStatus: "nicht_abrechenbar" }),
      ],
      engineer: makeEngineer(),
    },
    { includeBilling },
    "2026-01-31T00:00:00.000Z",
  );
}

describe("G09 JSON-Backup", () => {
  it.each(DENY)("%s: kein hourlyRate im Backup", (role) => {
    const payload = backupFor(role);
    expect(payload.activities).toHaveLength(2);
    for (const a of payload.activities) expect("hourlyRate" in a).toBe(false);
    const json = JSON.stringify(payload);
    expect(json).not.toContain("hourlyRate");
    expect(json).not.toContain(String(RATE));
    // Übrige Felder bleiben erhalten.
    expect(payload.activities[0]).toMatchObject({ id: "a-1", duration: 8, billable: true });
  });

  it.each(ALLOW)("%s: hourlyRate bleibt im Backup", (role) => {
    const payload = backupFor(role);
    expect(payload.activities[0].hourlyRate).toBe(RATE);
  });

  it("verändert die Eingabedaten nicht", () => {
    const activities = [makeActivity({ id: "a-x", hourlyRate: RATE })];
    buildJsonBackupPayload(
      { projects: [], workPackages: [], activities, engineer: makeEngineer() },
      { includeBilling: false },
    );
    expect(activities[0].hourlyRate).toBe(RATE);
  });
});

describe("G09 Import liest hourlyRate weiter", () => {
  beforeEach(() => window.localStorage.clear());

  it("Datei mit hourlyRate: Satz kommt im Importplan an", async () => {
    const doc = {
      schemaVersion: JSON_SCHEMA_VERSION,
      exportType: "full",
      exportedAt: "2026-01-01T00:00:00.000Z",
      exportedBy: "test",
      dashboardVersion: "1.0.0",
      projects: [{ id: "p1", name: "Projekt A", client: "Kunde A", status: "on_track" }],
      workPackages: [
        { id: "w1", title: "AP 1", projectId: "p1", status: "offen", priority: "mittel" },
      ],
      activities: [
        {
          id: "a1",
          title: "Task",
          workPackageId: "w1",
          date: "2026-01-05",
          duration: 4,
          hourlyRate: RATE,
          billable: true,
          billingStatus: "offen",
        },
      ],
    };
    const file = new File([JSON.stringify(doc)], "import.json", { type: "application/json" });
    const { doc: parsed, validation } = await JsonImportService.readFile(file);
    expect(validation.schemaValid).toBe(true);
    const plan = JsonImportService.buildPlan(parsed!, { strategy: "merge" });
    expect(plan.diffs.activities[0].incoming.hourlyRate).toBe(RATE);
  });
});

/* ------------------------------------------------------------------------
 * A37-Hinweis: `hourlyRate` hat keine Datenbankspalte. Das App-Backup ist die
 * einzige Sicherung des Werts; der automatische Tageslauf läuft für jede Rolle.
 * ---------------------------------------------------------------------- */

describe("G09 Sicherung bewahrt Stundensätze", () => {
  beforeEach(async () => {
    await BackupService.clear();
    BackupService.clearLog();
    window.localStorage.clear();
  }, 30_000);

  it("ZIP 2.0 (auch Tageslauf, rollenunabhängig) enthält hourlyRate in Rohdaten und dashboard.json", async () => {
    window.localStorage.setItem(
      userScopedKey("northbit-dashboard-v2"),
      JSON.stringify({
        projects: [{ id: "p1", name: "Projekt A", client: "Kunde A", status: "on_track" }],
        workPackages: [],
        activities: [makeActivity({ id: "a-zip", hourlyRate: RATE })],
      }),
    );
    const res = await BackupService.createBackup({ manual: false });
    expect(res.ok).toBe(true);
    const rec = await BackupService.get(res.record!.id);
    const entries = readZipEntries(new Uint8Array(await rec!.blob.arrayBuffer()));
    const raw = Object.entries(entries).find(
      ([p, c]) => p !== "dashboard.json" && c.includes('"a-zip"'),
    );
    expect(raw, "Rohdaten des Dashboards im ZIP").toBeTruthy();
    expect(raw![1]).toContain("hourlyRate");
    expect(raw![1]).toContain(String(RATE));
    const dash = JSON.parse(entries["dashboard.json"]);
    const act = dash.activities.find((a: { id: string }) => a.id === "a-zip");
    expect(act.hourlyRate).toBe(RATE);
  }, 30_000);
});

describe("G09 Restore aus Sicherung ohne hourlyRate", () => {
  beforeEach(() => window.localStorage.clear());

  it("Import einer Datei ohne hourlyRate wird abgewiesen und überschreibt keine Sätze", async () => {
    const key = userScopedKey("northbit-dashboard-v2");
    const state = {
      projects: [{ id: "p1", name: "Projekt A", client: "Kunde A", status: "on_track" }],
      workPackages: [],
      activities: [makeActivity({ id: "a1", hourlyRate: RATE })],
    };
    window.localStorage.setItem(key, JSON.stringify(state));
    // Wie ein Backup eines Engineers: Tätigkeit ohne hourlyRate.
    const engineerBackup = backupFor("engineer");
    const doc = {
      schemaVersion: JSON_SCHEMA_VERSION,
      exportType: "full",
      exportedAt: "2026-01-01T00:00:00.000Z",
      exportedBy: "engineer",
      dashboardVersion: "1.0.0",
      projects: state.projects,
      workPackages: [],
      activities: engineerBackup.activities.map((a) => ({ ...a, id: "a1" })).slice(0, 1),
    };
    const file = new File([JSON.stringify(doc)], "engineer.json", { type: "application/json" });
    const { doc: parsed, validation } = await JsonImportService.readFile(file);
    expect(validation.schemaValid).toBe(false);
    expect(parsed).toBeNull();
    const after = JSON.parse(window.localStorage.getItem(key)!);
    expect(after.activities[0].hourlyRate).toBe(RATE);
  });
});
