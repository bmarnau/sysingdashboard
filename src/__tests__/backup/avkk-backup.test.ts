/**
 * Sprint 08B: AVKK-Nutzdaten in Backup/Restore.
 *
 * Geprüft werden Roundtrip (Archiv → Restore-Bericht), Quarantäne bei
 * fehlendem Aufgabenbezug sowie die Negativfälle beschädigter AVKK-Daten.
 */
import "../env/test-instance";
import { describe, expect, it, beforeEach } from "vitest";
import { unzipSync, strToU8, zipSync } from "fflate";
import { restoreFromZip } from "@/lib/backup-service";
import { validateAvkkPayload } from "@/lib/backup/avkk-payload";
import { avkkFixture, buildValidBackupZipV2 } from "../fixtures/backup";

beforeEach(() => {
  window.localStorage.clear();
});

/** Ersetzt eine Datei im Archiv und zieht die Manifest-Prüfsumme nach. */
async function replaceFile(bytes: Uint8Array, path: string, content: unknown): Promise<Uint8Array> {
  const zip = unzipSync(bytes);
  const next = strToU8(JSON.stringify(content, null, 2));
  zip[path] = next;
  const manifest = JSON.parse(new TextDecoder().decode(zip["manifest.json"])) as {
    entries: Array<{ path: string; checksum: string; size: number }>;
  };
  const digest = await crypto.subtle.digest("SHA-256", next.slice().buffer);
  const hex =
    "sha256:" +
    Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  for (const e of manifest.entries) {
    if (e.path === path) {
      e.checksum = hex;
      e.size = next.length;
    }
  }
  zip["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));
  return zipSync(zip, { level: 6 });
}

describe("AVKK im Backup-Archiv", () => {
  it("prüft AVKK-Daten beim Restore, schreibt sie aber nicht zurück", async () => {
    const zip = await buildValidBackupZipV2({ version: "2.0" });
    const res = await restoreFromZip(zip, {
      actor: "a",
      mode: "overwrite",
      knownSubjects: new Set(["workpackage:wp-1"]),
    });
    expect(res.ok).toBe(true);
    expect(res.avkk.present).toBe(true);
    expect(res.avkk.validated).toBe(true);
    expect(res.avkk.counts).toEqual({
      subjects: 1,
      responsibilities: 1,
      competences: 1,
      consequences: 1,
    });
    expect(res.avkk.quarantine).toHaveLength(0);
    expect(res.avkk.messages.join(" ")).toMatch(/nicht in die Datenbank/i);
  });

  it("stellt verwaiste AVKK-Datensätze unter Quarantäne", async () => {
    const zip = await buildValidBackupZipV2({ version: "2.0" });
    const res = await restoreFromZip(zip, {
      actor: "a",
      mode: "overwrite",
      knownSubjects: new Set<string>(),
    });
    expect(res.ok).toBe(true);
    expect(res.avkk.quarantine).toHaveLength(1);
    expect(res.warnings.join(" ")).toMatch(/Quarantäne/);
  });

  it("weist ein Archiv mit unbekanntem Katalogwert ab", async () => {
    const fixture = avkkFixture();
    (fixture.avkk.responsibilities as Array<{ roleKey: string }>)[0].roleKey = "does-not-exist";
    const base = await buildValidBackupZipV2({ version: "2.0", avkk: fixture });
    const zip = await replaceFile(base, "avkk.json", fixture.avkk);
    const res = await restoreFromZip(zip, { actor: "a", mode: "overwrite" });
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/Katalogwert/);
  });

  it("weist ein Archiv ohne zugehörigen Katalogstand ab", async () => {
    const base = await buildValidBackupZipV2({ version: "2.0" });
    const zip = unzipSync(base);
    delete zip["reference-data.json"];
    const manifest = JSON.parse(new TextDecoder().decode(zip["manifest.json"])) as {
      entries: Array<{ logicalName: string }>;
    };
    manifest.entries = manifest.entries.filter((e) => e.logicalName !== "reference-data");
    zip["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));
    const res = await restoreFromZip(zipSync(zip, { level: 6 }), {
      actor: "a",
      mode: "overwrite",
    });
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/unvollständig/i);
  });

  it("bleibt kompatibel zu Archiven ohne AVKK-Daten", async () => {
    const zip = await buildValidBackupZipV2({ version: "2.0", avkk: null });
    const res = await restoreFromZip(zip, { actor: "a", mode: "overwrite" });
    expect(res.ok).toBe(true);
    expect(res.avkk.present).toBe(false);
  });
});

describe("validateAvkkPayload", () => {
  it("erkennt doppelte IDs und unbekannte Subjektbezüge", () => {
    const f = avkkFixture();
    const subjects = f.avkk.subjects as unknown[];
    subjects.push({ ...(subjects[0] as object) });
    (f.avkk.competences as Array<{ subjectRef: string }>)[0].subjectRef = "unbekannt";
    const res = validateAvkkPayload(f.avkk, f.referenceData);
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/doppelte AVKK-ID/);
    expect(res.errors.join(" ")).toMatch(/unbekanntes AVKK-Subjekt/);
  });

  it("erkennt einen ungültigen Aufgabentyp", () => {
    const f = avkkFixture();
    (f.avkk.subjects as Array<{ subjectType: string }>)[0].subjectType = "unfug";
    const res = validateAvkkPayload(f.avkk, f.referenceData);
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/Aufgabentyp/);
  });

  it("meldet abweichende Katalogversionen als Warnung, nicht als Fehler", () => {
    const f = avkkFixture();
    (f.avkk.catalogRefs as Array<{ version: number }>)[0].version = 99;
    const res = validateAvkkPayload(f.avkk, f.referenceData, {
      knownSubjects: new Set(["workpackage:wp-1"]),
    });
    expect(res.ok).toBe(true);
    expect(res.warnings.join(" ")).toMatch(/Version 99/);
  });

  it("lehnt eine neuere Nutzdatenversion ab", () => {
    const f = avkkFixture();
    f.avkk.payloadVersion = 99;
    const res = validateAvkkPayload(f.avkk, f.referenceData);
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/Version 99/);
  });
});
