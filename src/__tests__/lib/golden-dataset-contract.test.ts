import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const GOLDEN_ROOT = resolve("docs/examples/golden-dataset/v1");
const MANIFEST_PATH = resolve(GOLDEN_ROOT, "manifest.json");

const GOLDEN_V1_FILES = [
  "systemhouse.json",
  "customers.json",
  "projects.json",
  "work-packages.json",
  "activities.json",
  "reference-data.json",
  "kiosk.json",
  "expected/project-controlling.json",
  "expected/kiosk-summary.json",
];

describe("GDS-01 Golden Dataset V1 contract", () => {
  it("uses the fixed schema, dataset version, synthetic flag and reference time", async () => {
    const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as Record<string, unknown>;

    expect(manifest.schemaVersion).toBe("sysing.golden.v1");
    expect(manifest.datasetVersion).toBe("1.0.0");
    expect(manifest.synthetic).toBe(true);
    expect(manifest.referenceTime).toBe("2026-09-14T00:00:00Z");
  });

  it("declares every canonical Golden V1 file", async () => {
    const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as { files?: unknown };

    expect(manifest.files).toEqual(GOLDEN_V1_FILES);
  });

  it("contains every file declared by the Golden V1 manifest", async () => {
    for (const file of GOLDEN_V1_FILES) {
      await expect(readFile(resolve(GOLDEN_ROOT, file), "utf8")).resolves.toBeTruthy();
    }
  });
});
