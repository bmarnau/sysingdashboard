/**
 * Regressionen aus der manuellen F-11-Runtime-Abnahme vom 23.08.2026.
 *
 * Sichert den aktuellen user-scoped Local-First-Vertrag ab und verhindert,
 * dass Backup/Restore formal grün sind, während der echte Dashboardzustand
 * fehlt.
 */
import "../env/test-instance";
import { beforeEach, describe, expect, it } from "vitest";
import { BackupService, restoreFromZip } from "@/lib/backup-service";
import { runDailyBackupIfDue } from "@/lib/backup/create-backup";
import { readZipEntries } from "../fixtures/backup";

const CURRENT_KEY = "northbit-dashboard-v2::usr-current";
const TARGET_KEY = "northbit-target-time-models::usr-current";
const CURRENT_STATE = {
  engineer: { id: "eng-1", name: "Alice" },
  projects: [{ id: "p-1", title: "Backup-Test" }],
  workPackages: [{ id: "wp-1", projectId: "p-1", title: "Arbeitspaket" }],
  activities: [{ id: "a-1", workPackageId: "wp-1", title: "Tätigkeit" }],
};

beforeEach(async () => {
  window.localStorage.clear();
  BackupService.clearLog();
  await BackupService.clear();
});

describe("Backup aktueller Local-First-Speichervertrag", () => {
  it("sichert und restauriert den user-scoped Dashboardzustand unter demselben Key", async () => {
    window.localStorage.setItem(CURRENT_KEY, JSON.stringify(CURRENT_STATE));
    window.localStorage.setItem(TARGET_KEY, JSON.stringify([{ id: "target-1", hours: 8 }]));
    window.localStorage.setItem("northbit-users", JSON.stringify([{ id: "usr-current" }]));

    const created = await BackupService.createBackup({ manual: true });
    expect(created.ok).toBe(true);
    expect(created.record).toBeDefined();
    expect(created.log.consistency.messages.join(" ")).not.toMatch(
      /Keine typischen App-Schlüssel/,
    );

    const record = await BackupService.get(created.record!.id);
    const bytes = new Uint8Array(await record!.blob.arrayBuffer());
    const entries = readZipEntries(bytes);
    const manifest = JSON.parse(entries["manifest.json"]);
    const storageKeys = manifest.entries
      .map((entry: { storageKey: string | null }) => entry.storageKey)
      .filter((key: string | null): key is string => key !== null);

    expect(storageKeys).toContain(CURRENT_KEY);
    expect(storageKeys).toContain(TARGET_KEY);
    expect(storageKeys).not.toContain("northbit-users");

    window.localStorage.removeItem(CURRENT_KEY);
    window.localStorage.removeItem(TARGET_KEY);

    const restored = await restoreFromZip(bytes, { actor: "regression", mode: "overwrite" });
    expect(restored.ok).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(CURRENT_KEY)!)).toEqual(CURRENT_STATE);
    expect(JSON.parse(window.localStorage.getItem(TARGET_KEY)!)).toEqual([
      { id: "target-1", hours: 8 },
    ]);
  });

  it("ändert den letzten Auto-Zeitpunkt nur bei automatischen Backups", async () => {
    window.localStorage.setItem(CURRENT_KEY, JSON.stringify(CURRENT_STATE));

    const manual = await BackupService.createBackup({ manual: true });
    expect(manual.ok).toBe(true);
    expect(BackupService.lastAuto()).toBeNull();

    const automatic = await BackupService.createBackup({ manual: false });
    expect(automatic.ok).toBe(true);
    expect(BackupService.lastAuto()).toBe(automatic.record?.createdAt ?? null);
  });

  it("unterdrückt parallele und weitere automatische Tagesläufe", async () => {
    window.localStorage.setItem(CURRENT_KEY, JSON.stringify(CURRENT_STATE));

    const [first, second] = await Promise.all([runDailyBackupIfDue(), runDailyBackupIfDue()]);
    expect([first, second].filter(Boolean)).toHaveLength(1);

    const afterParallelStart = await BackupService.list();
    expect(afterParallelStart).toHaveLength(1);
    expect(afterParallelStart[0].manual).toBe(false);

    const anotherRun = await runDailyBackupIfDue();
    expect(anotherRun).toBe(false);
    expect(await BackupService.list()).toHaveLength(1);
  });
});
