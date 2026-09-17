import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GOLDEN_DATASET_VERSION,
  GOLDEN_REFERENCE_TIME,
  GOLDEN_SCHEMA_VERSION,
  type GoldenRelationDataset,
  validateGoldenDatasetRelations,
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

type GoldenActivityRelation = GoldenRelationDataset["activities"][number];

async function readGoldenJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(await readFile(resolve(GOLDEN_ROOT, relativePath), "utf8")) as T;
}

async function loadPositiveRelations(): Promise<GoldenRelationDataset> {
  const [systemhouses, customers, projects, workPackages, activities] = await Promise.all([
    readGoldenJson<{ systemhouses: GoldenRelationDataset["systemhouses"] }>("systemhouse.json"),
    readGoldenJson<{ customers: GoldenRelationDataset["customers"] }>("customers.json"),
    readGoldenJson<{ projects: GoldenRelationDataset["projects"] }>("projects.json"),
    readGoldenJson<{ workPackages: GoldenRelationDataset["workPackages"] }>(
      "work-packages.json",
    ),
    readGoldenJson<{ activities: GoldenRelationDataset["activities"] }>("activities.json"),
  ]);

  return {
    systemhouses: systemhouses.systemhouses,
    customers: customers.customers,
    projects: projects.projects,
    workPackages: workPackages.workPackages,
    activities: activities.activities,
  };
}

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

  it("keeps the foreign systemhouse fixture isolated from positive expected results", async () => {
    const foreign = await readGoldenJson<GoldenRelationDataset>("negative/cross-systemhouse.json");
    const expected = await readFile(
      resolve(GOLDEN_ROOT, "expected/project-controlling.json"),
      "utf8",
    );

    expect(validateGoldenDatasetRelations(foreign)).toEqual({ ok: true });
    expect(expected).not.toContain("golden-systemhouse-foreign");
    expect(expected).not.toContain("golden-customer-foreign");
  });

  it("rejects a cross-customer activity relation fail-closed", async () => {
    const positive = await loadPositiveRelations();
    const fixture = await readGoldenJson<{ activities: GoldenActivityRelation[] }>(
      "negative/cross-customer.json",
    );

    expect(
      validateGoldenDatasetRelations({
        ...positive,
        activities: [...positive.activities, ...fixture.activities],
      }),
    ).toEqual({ ok: false, error: "golden_cross_customer_relation" });
  });

  it("rejects missing project and work-package references with stable errors", async () => {
    const positive = await loadPositiveRelations();
    const fixture = await readGoldenJson<{
      missingProjectActivity: GoldenActivityRelation;
      missingWorkPackageActivity: GoldenActivityRelation;
    }>("negative/invalid-relations.json");

    expect(
      validateGoldenDatasetRelations({
        ...positive,
        activities: [...positive.activities, fixture.missingProjectActivity],
      }),
    ).toEqual({ ok: false, error: "golden_project_reference_missing" });

    expect(
      validateGoldenDatasetRelations({
        ...positive,
        activities: [...positive.activities, fixture.missingWorkPackageActivity],
      }),
    ).toEqual({ ok: false, error: "golden_workpackage_reference_missing" });
  });

  it("rejects duplicate IDs with a stable error", async () => {
    const positive = await loadPositiveRelations();
    const fixture = await readGoldenJson<{ duplicateActivities: GoldenActivityRelation[] }>(
      "negative/invalid-relations.json",
    );

    expect(
      validateGoldenDatasetRelations({
        ...positive,
        activities: [...positive.activities, ...fixture.duplicateActivities],
      }),
    ).toEqual({ ok: false, error: "golden_duplicate_id" });
  });
});
