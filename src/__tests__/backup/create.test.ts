/**
 * Backup-Erzeugung: Struktur, Manifest, Version, Vollständigkeit, Log-Regel.
 * Prompt 2A.6.
 */
import "../env/test-instance";
import { describe, expect, it, beforeEach } from "vitest";
import { BackupService } from "@/lib/backup-service";
import { readZipEntries } from "../fixtures/backup";

async function seedLocalStorage() {
  window.localStorage.setItem(
    "engineer-dashboard:profile",
    JSON.stringify({ name: "Alice", role: "Systemingenieur" }),
  );
  window.localStorage.setItem(
    "engineer-dashboard:settings",
    JSON.stringify({ locale: "de", period: "month" }),
  );
  // RBAC-Assignments (rein via Storage-Key, damit ohne Abhängigkeit vom RBAC-Store testbar)
  window.localStorage.setItem(
    "user-management:assignments",
    JSON.stringify([{ userId: "u1", role: "administrator", scope: "*" }]),
  );
}

describe("BackupService.createBackup", () => {
  beforeEach(async () => {
    await BackupService.clear();
    BackupService.clearLog();
    window.localStorage.clear();
    await seedLocalStorage();
  });

  it("erzeugt ein valides ZIP mit allen Pflichtdateien", async () => {
    const res = await BackupService.createBackup({ manual: true });
    expect(res.ok).toBe(true);
    expect(res.record).toBeDefined();
    const rec = await BackupService.get(res.record!.id);
    expect(rec?.blob).toBeInstanceOf(Blob);
    const buf = new Uint8Array(await rec!.blob.arrayBuffer());
    const entries = readZipEntries(buf);
    for (const req of ["manifest.json", "README.md", "INSTALL.md", ".env.example"]) {
      expect(entries[req], `${req} muss vorhanden sein`).toBeTruthy();
    }
    const manifest = JSON.parse(entries["manifest.json"]);
    expect(manifest.project).toBe("dashboard");
    expect(manifest.version).toBe(1);
    expect(typeof manifest.createdAt).toBe("string");
    expect(manifest.keyCount).toBeGreaterThanOrEqual(3);
  });

  it("sichert RBAC-Assignments als eigenen Data-Eintrag", async () => {
    const res = await BackupService.createBackup({ manual: true });
    expect(res.ok).toBe(true);
    const rec = await BackupService.get(res.record!.id);
    const buf = new Uint8Array(await rec!.blob.arrayBuffer());
    const entries = readZipEntries(buf);
    const rbacFile = Object.keys(entries).find((p) =>
      p.startsWith("data/") && p.includes("user-management_assignments"),
    );
    expect(rbacFile, "RBAC-Assignments-Datei fehlt").toBeTruthy();
  });

  it("hält sich an die Log-Regel: max. 100 Einträge, neueste oben", async () => {
    for (let i = 0; i < 3; i++) {
      await BackupService.createBackup({ manual: false });
    }
    const log = BackupService.log();
    expect(log.length).toBeGreaterThanOrEqual(3);
    expect(log.length).toBeLessThanOrEqual(100);
    // Neueste oben — timestamps monoton fallend
    for (let i = 1; i < log.length; i++) {
      expect(log[i - 1].timestamp >= log[i].timestamp).toBe(true);
    }
  });

  it("meldet Backup als ok, wenn keine sensiblen Werte gefunden werden", async () => {
    const res = await BackupService.createBackup({ manual: true });
    expect(res.ok).toBe(true);
    expect(res.record?.status).not.toBe("failed");
  });

  it("fügt kein 'password'-Feld ins ZIP ein, wenn ein sensibler Storage-Key existiert", async () => {
    window.localStorage.setItem("engineer-dashboard:password_token", "eyJabc.def.ghi");
    const res = await BackupService.createBackup({ manual: true });
    expect(res.ok).toBe(true);
    const rec = await BackupService.get(res.record!.id);
    const buf = new Uint8Array(await rec!.blob.arrayBuffer());
    const entries = readZipEntries(buf);
    const sensitiveHit = Object.keys(entries).some((p) =>
      p.toLowerCase().includes("password"),
    );
    expect(sensitiveHit).toBe(false);
    const manifest = JSON.parse(entries["manifest.json"]);
    expect(manifest.excludedKeys).toContain("engineer-dashboard:password_token");
  });
});
