/**
 * Restore-Szenarien: leerer/bestehender Zustand, Modus-Grenzen, Rollback,
 * Actor-/Herkunftsfelder, Restore-Protokoll. Prompt 2A.6.
 */
import "../env/test-instance";
import { describe, expect, it, beforeEach } from "vitest";
import {
  clearRestoreLog,
  restoreFromZip,
  restoreLog,
} from "@/lib/backup-service";
import { buildValidBackupZip } from "../fixtures/backup";

beforeEach(() => {
  window.localStorage.clear();
  clearRestoreLog();
});

describe("BackupService.restoreFromZip", () => {
  it("stellt auf leeren Zustand wieder her (Modus 'empty')", async () => {
    const zip = buildValidBackupZip();
    const res = await restoreFromZip(zip, { actor: "alice", mode: "empty" });
    expect(res.ok).toBe(true);
    expect(res.counts.keysWritten).toBeGreaterThan(0);
    expect(window.localStorage.getItem("engineer-dashboard:profile")).toContain("Alice");
    expect(res.rollback).toBe(false);
    expect(res.actor).toBe("alice");
  });

  it("verweigert Modus 'empty' bei vorhandenen App-Keys", async () => {
    window.localStorage.setItem(
      "engineer-dashboard:profile",
      JSON.stringify({ name: "Existing" }),
    );
    const zip = buildValidBackupZip();
    const res = await restoreFromZip(zip, { actor: "alice", mode: "empty" });
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/empty|leer/i);
  });

  it("überschreibt bestehende Werte (Modus 'overwrite')", async () => {
    window.localStorage.setItem(
      "engineer-dashboard:profile",
      JSON.stringify({ name: "Existing" }),
    );
    const zip = buildValidBackupZip();
    const res = await restoreFromZip(zip, { actor: "bob", mode: "overwrite" });
    expect(res.ok).toBe(true);
    expect(window.localStorage.getItem("engineer-dashboard:profile")).toContain("Alice");
  });

  it("erhält zusätzliche lokale App-Keys im Modus 'merge'", async () => {
    window.localStorage.setItem("engineer-dashboard:extra", "keep-me");
    const zip = buildValidBackupZip();
    const res = await restoreFromZip(zip, { actor: "bob", mode: "merge" });
    expect(res.ok).toBe(true);
    expect(window.localStorage.getItem("engineer-dashboard:extra")).toBe("keep-me");
  });

  it("Restore-Ergebnis enthält Actor, Modus, runId und Zeitstempel", async () => {
    const zip = buildValidBackupZip();
    const res = await restoreFromZip(zip, { actor: "carol", mode: "overwrite" }, { fileName: "b.zip" });
    expect(res.actor).toBe("carol");
    expect(res.mode).toBe("overwrite");
    expect(res.runId).toMatch(/^restore-/);
    expect(res.startedAt).toBeTruthy();
    expect(res.finishedAt).toBeTruthy();
    expect(res.fileName).toBe("b.zip");
  });

  it("schreibt jeden Restore ins Protokoll (neueste oben)", async () => {
    const zip = buildValidBackupZip();
    await restoreFromZip(zip, { actor: "a1", mode: "empty" });
    window.localStorage.clear();
    await restoreFromZip(zip, { actor: "a2", mode: "empty" });
    const log = restoreLog();
    expect(log.length).toBeGreaterThanOrEqual(2);
    expect(log[0].actor).toBe("a2");
  });

  it("lehnt ältere MAJOR-Versionen ab, wenn nicht erlaubt", async () => {
    const zip = buildValidBackupZip({ version: 0 });
    const res = await restoreFromZip(zip, {
      actor: "x",
      mode: "empty",
      allowOlderMinor: false,
    });
    expect(res.ok).toBe(false);
  });

  it("verweigert Restore, wenn im Backup ein sensibler Key auftaucht (kein Teilzustand)", async () => {
    window.localStorage.setItem("engineer-dashboard:profile", JSON.stringify({ name: "Keep" }));
    // Backup mit sensiblem Key
    const { injectDataFile } = await import("../fixtures/backup");
    const zip = injectDataFile(buildValidBackupZip(), "app:access_token", { t: "x" });
    const before = window.localStorage.getItem("engineer-dashboard:profile");
    const res = await restoreFromZip(zip, { actor: "d", mode: "overwrite" });
    expect(res.ok).toBe(false);
    // Alter Zustand unverändert
    expect(window.localStorage.getItem("engineer-dashboard:profile")).toBe(before);
  });
});
