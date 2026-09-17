export const GOLDEN_SCHEMA_VERSION = "sysing.golden.v1" as const;
export const GOLDEN_DATASET_VERSION = "1.0.0" as const;
export const GOLDEN_REFERENCE_TIME = "2026-09-14T00:00:00Z" as const;

export interface GoldenManifest {
  schemaVersion: typeof GOLDEN_SCHEMA_VERSION;
  datasetVersion: typeof GOLDEN_DATASET_VERSION;
  synthetic: true;
  referenceTime: typeof GOLDEN_REFERENCE_TIME;
  files: string[];
}

export interface GoldenSummary {
  activities: number;
  customers: number;
  projects: number;
  workPackages: number;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  billableQuotePercent: number;
}

export type GoldenManifestValidationError =
  | "golden_manifest_invalid"
  | "golden_schema_version_mismatch"
  | "golden_dataset_version_mismatch"
  | "golden_dataset_must_be_synthetic"
  | "golden_reference_time_mismatch";

export type GoldenManifestValidationResult =
  | { ok: true; value: GoldenManifest }
  | { ok: false; error: GoldenManifestValidationError };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateGoldenManifest(input: unknown): GoldenManifestValidationResult {
  if (
    !isRecord(input) ||
    !Array.isArray(input.files) ||
    !input.files.every((item) => typeof item === "string" && item.length > 0)
  ) {
    return { ok: false, error: "golden_manifest_invalid" };
  }

  if (input.schemaVersion !== GOLDEN_SCHEMA_VERSION) {
    return { ok: false, error: "golden_schema_version_mismatch" };
  }

  if (input.datasetVersion !== GOLDEN_DATASET_VERSION) {
    return { ok: false, error: "golden_dataset_version_mismatch" };
  }

  if (input.synthetic !== true) {
    return { ok: false, error: "golden_dataset_must_be_synthetic" };
  }

  if (input.referenceTime !== GOLDEN_REFERENCE_TIME) {
    return { ok: false, error: "golden_reference_time_mismatch" };
  }

  return {
    ok: true,
    value: {
      schemaVersion: GOLDEN_SCHEMA_VERSION,
      datasetVersion: GOLDEN_DATASET_VERSION,
      synthetic: true,
      referenceTime: GOLDEN_REFERENCE_TIME,
      files: [...input.files],
    },
  };
}
