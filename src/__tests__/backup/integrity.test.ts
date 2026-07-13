/**
 * Backup-Integrität: beschädigte / unvollständige Backups werden abgewiesen.
 * Prompt 2A.6.
 */
import "../env/test-instance";
import { describe, expect, it } from "vitest";
import { restoreFromZip } from "@/lib/backup-service";
import {
  buildValidBackupZip,
  corruptZip,
  stripEntry,
  replaceManifest,
  injectDataFile,
} from "../fixtures/backup";

describe("Backup-Integrität", () => {
  it("erkennt beschädigtes ZIP", async () => {
    const bytes = corruptZip(buildValidBackupZip());
    const res = await restoreFromZip(bytes, { actor: "test", mode: "overwrite" });
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/entpackt|ZIP/i);
  });

  it("lehnt Backup ohne Manifest ab", async () => {
    const bytes = stripEntry(buildValidBackupZip(), "manifest.json");
    const res = await restoreFromZip(bytes, { actor: "test", mode: "overwrite" });
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/manifest/i);
  });

  it("lehnt Backup mit falschem Projektnamen ab", async () => {
    const bytes = replaceManifest(buildValidBackupZip(), (m) => ({ ...m, project: "other-app" }));
    const res = await restoreFromZip(bytes, { actor: "test", mode: "overwrite" });
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/Projekt/);
  });

  it("verweigert neuere Schema-Major-Version standardmäßig", async () => {
    const bytes = replaceManifest(buildValidBackupZip(), (m) => ({ ...m, version: 99 }));
    const res = await restoreFromZip(bytes, { actor: "test", mode: "overwrite" });
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/MAJOR|Schema/i);
  });

  it("akzeptiert neuere Version mit expliziter Freigabe", async () => {
    const bytes = replaceManifest(buildValidBackupZip(), (m) => ({ ...m, version: 99 }));
    const res = await restoreFromZip(bytes, {
      actor: "test",
      mode: "overwrite",
      allowNewer: true,
    });
    expect(res.ok).toBe(true);
  });

  it("weist Backups mit sensiblen Feldnamen ab", async () => {
    const bytes = injectDataFile(buildValidBackupZip(), "app:auth_token", {
      token: "sk_live_XYZ",
    });
    const res = await restoreFromZip(bytes, { actor: "test", mode: "overwrite" });
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/[Ss]ensibl/);
  });

  it("weist leere Backups ab", async () => {
    const res = await restoreFromZip(new Uint8Array(0), { actor: "test", mode: "overwrite" });
    expect(res.ok).toBe(false);
  });

  it("weist Backup ohne data/-Einträge ab", async () => {
    // Nur manifest + readme, keine data-Dateien
    const bytes = buildValidBackupZip({ extraData: {} });
    // extraData leer heißt: nur die Default-Fixtures. Wir entfernen alle data/ Einträge:
    const zip = (await import("fflate")).unzipSync(bytes);
    for (const p of Object.keys(zip)) if (p.startsWith("data/")) delete zip[p];
    const rebuilt = (await import("fflate")).zipSync(zip);
    const res = await restoreFromZip(rebuilt, { actor: "test", mode: "overwrite" });
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/data\//);
  });
});
