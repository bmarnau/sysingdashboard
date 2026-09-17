import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GOLDEN_DATASET_VERSION,
  GOLDEN_REFERENCE_TIME,
  GOLDEN_SCHEMA_VERSION,
  validateGoldenManifest,
} from "@/lib/golden-dataset/golden-dataset-contract";

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
  it("exposes the fixed Golden V1 constants", () => {
    expect(GOLDEN_SCHEMA_VERSION).toBe("sysing.golden.v1");
    expect(GOLDEN_DATASET_VERSION).toBe("1.0.0");
    expect(GOLDEN_REFERENCE_TIME).toBe("2026-09-14T00:00:00Z");
  });

  it("uses the fixed schema, dataset version, synthetic flag and reference time", async () => {
    const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as Record<string, unknown>;

    expect(manifest.schemaVersion).toBe(GOLDEN_SCHEMA_VERSION);
    expect(manifest.datasetVersion).toBe(GOLDEN_DATASET_VERSION);
    expect(manifest.synthetic).toBe(true);
    expect(manifest.referenceTime).toBe(GOLDEN_REFERENCE_TIME);
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

  it("rejects a non-synthetic dataset", () => {
    const result = validateGoldenManifest({
      schemaVersion: GOLDEN_SCHEMA_VERSION,
      datasetVersion: GOLDEN_DATASET_VERSION,
      synthetic: false,
      referenceTime: GOLDEN_REFERENCE_TIME,
      files: GOLDEN_V1_FILES,
    });

    expect(result).toEqual({ ok: false, error: "golden_dataset_must_be_synthetic" });
  });

  it.each([
    ["schemaVersion", "sysing.golden.v2", "golden_schema_version_mismatch"],
    ["datasetVersion", "1.1.0", "golden_dataset_version_mismatch"],
    ["referenceTime", "2026-09-17T00:00:00Z", "golden_reference_time_mismatch"],
  ] as const)("rejects an invalid %s", (field, value, error) => {
    const manifest = {
      schemaVersion: GOLDEN_SCHEMA_VERSION,
      datasetVersion: GOLDEN_DATASET_VERSION,
      synthetic: true,
      referenceTime: GOLDEN_REFERENCE_TIME,
      files: GOLDEN_V1_FILES,
      [field]: value,
    };

    expect(validateGoldenManifest(manifest)).toEqual({ ok: false, error });
  });
});
