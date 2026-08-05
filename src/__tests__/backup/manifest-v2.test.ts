/**
 * Backupformat 2.0 — manifestbasierte Zuordnung (Sprint 06A).
 *
 * Prüft, dass die Wiederherstellung ausschließlich über `entries[]` arbeitet,
 * Manipulationen der Zuordnungstabelle erkannt werden und Altformate (v1)
 * weiterhin lesbar bleiben.
 */
import "../env/test-instance";
import { beforeEach, describe, expect, it } from "vitest";
import { restoreFromZip } from "@/lib/backup-service";
import {
  buildValidBackupZip,
  buildValidBackupZipV2,
  patchManifestEntries,
  readZipEntries,
} from "../fixtures/backup";

beforeEach(() => {
  window.localStorage.clear();
});

describe("Restore mit Manifest 2.0", () => {
  it("stellt Keys aus entries[] her, obwohl Dateinamen bedeutungslos sind", async () => {
    const zip = await buildValidBackupZipV2();
    // Speicheradressen tragen keine fachliche Information mehr.
    expect(Object.keys(readZipEntries(zip))).toContain("data/blob-1.json");

    const res = await restoreFromZip(zip, { actor: "alice", mode: "empty" });
    expect(res.ok).toBe(true);
    // Originalschlüssel inkl. Doppelpunkt wird exakt wiederhergestellt.
    expect(window.localStorage.getItem("engineer-dashboard:profile")).toContain("Alice");
    expect(window.localStorage.getItem("engineer-dashboard:settings")).toContain("de");
  });

  it("liest Altformat v1 weiter und meldet die Migration als Warnung", async () => {
    const res = await restoreFromZip(buildValidBackupZip(), { actor: "bob", mode: "empty" });
    expect(res.ok).toBe(true);
    expect(res.warnings.join(" ")).toMatch(/migriert|abgeleitet/i);
    // Bestandsschutz: v1 kennt nur den maskierten Namen.
    expect(window.localStorage.getItem("engineer-dashboard_profile")).toContain("Alice");
  });

  it("lehnt leere entries[] ab", async () => {
    const zip = patchManifestEntries(await buildValidBackupZipV2(), () => []);
    const res = await restoreFromZip(zip, { actor: "t", mode: "overwrite" });
    expect(res.ok).toBe(false);
  });

  it("lehnt doppelte Storage-Keys ab", async () => {
    const zip = patchManifestEntries(await buildValidBackupZipV2(), (e) => {
      const data = e.filter((x) => x.storageKey !== null);
      return [...e, { ...data[1], storageKey: data[0].storageKey }];
    });
    const res = await restoreFromZip(zip, { actor: "t", mode: "overwrite" });
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/Storage-Key/i);
  });

  it("lehnt doppelte logische Namen ab", async () => {
    const zip = patchManifestEntries(await buildValidBackupZipV2(), (e) => [
      ...e,
      { ...e[1], logicalName: e[0].logicalName },
    ]);
    const res = await restoreFromZip(zip, { actor: "t", mode: "overwrite" });
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/logischer Name/i);
  });

  it("lehnt falsche Prüfsummen ab", async () => {
    const zip = patchManifestEntries(await buildValidBackupZipV2(), (e) =>
      e.map((x) => (x.storageKey ? { ...x, checksum: "sha256:" + "0".repeat(64) } : x)),
    );
    const res = await restoreFromZip(zip, { actor: "t", mode: "overwrite" });
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/Prüfsumme/i);
  });

  it("lehnt falsche Größenangaben ab", async () => {
    const zip = patchManifestEntries(await buildValidBackupZipV2(), (e) =>
      e.map((x) => (x.storageKey ? { ...x, size: x.size + 5 } : x)),
    );
    const res = await restoreFromZip(zip, { actor: "t", mode: "overwrite" });
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/Größe/i);
  });

  it("lehnt unplausible Dateitypen ab", async () => {
    const zip = patchManifestEntries(await buildValidBackupZipV2(), (e) =>
      e.map((x) => (x.storageKey ? { ...x, contentType: "image/png" } : x)),
    );
    const res = await restoreFromZip(zip, { actor: "t", mode: "overwrite" });
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/Dateityp/i);
  });

  it("lehnt Manifest-Einträge ohne zugehörige Datei ab", async () => {
    const zip = patchManifestEntries(await buildValidBackupZipV2(), (e) => [
      ...e,
      { ...e[e.length - 1], logicalName: "storage:ghost", path: "data/ghost.json" },
    ]);
    const res = await restoreFromZip(zip, { actor: "t", mode: "overwrite" });
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/fehlt im Archiv/i);
  });

  it("lehnt Dateien ohne Manifest-Eintrag ab", async () => {
    const zip = patchManifestEntries(await buildValidBackupZipV2(), (e) =>
      e.filter((x) => x.path !== "README.md"),
    );
    const res = await restoreFromZip(zip, { actor: "t", mode: "overwrite" });
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/ohne Manifest-Eintrag/i);
  });

  it("verweigert unbekannte MAJOR-Version standardmäßig", async () => {
    const zip = await buildValidBackupZipV2({ version: 99 as unknown as number });
    const res = await restoreFromZip(zip, { actor: "t", mode: "overwrite" });
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/MAJOR/);
  });
});
