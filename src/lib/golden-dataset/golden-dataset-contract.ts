export const GOLDEN_SCHEMA_VERSION = "sysing.golden.v1" as const;
export const GOLDEN_DATASET_VERSION = "1.1.0" as const;
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

interface GoldenRelationSystemhouse {
  id: string;
}

interface GoldenRelationCustomer {
  id: string;
  systemhouseId: string;
}

interface GoldenRelationProject {
  id: string;
  systemhouseId: string;
  customerId: string;
}

interface GoldenRelationWorkPackage {
  id: string;
  systemhouseId: string;
  customerId: string;
  projectId: string;
}

interface GoldenRelationActivity {
  id: string;
  systemhouseId: string;
  customerId: string;
  projectId: string;
  workPackageId: string;
}

export interface GoldenRelationDataset {
  systemhouses: GoldenRelationSystemhouse[];
  customers: GoldenRelationCustomer[];
  projects: GoldenRelationProject[];
  workPackages: GoldenRelationWorkPackage[];
  activities: GoldenRelationActivity[];
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

export type GoldenRelationValidationError =
  | "golden_duplicate_id"
  | "golden_systemhouse_reference_missing"
  | "golden_customer_reference_missing"
  | "golden_project_reference_missing"
  | "golden_workpackage_reference_missing"
  | "golden_cross_customer_relation";

export type GoldenRelationValidationResult =
  | { ok: true }
  | { ok: false; error: GoldenRelationValidationError };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasDuplicateIds(collections: ReadonlyArray<ReadonlyArray<{ id: string }>>): boolean {
  const ids = new Set<string>();

  for (const collection of collections) {
    for (const item of collection) {
      if (ids.has(item.id)) return true;
      ids.add(item.id);
    }
  }

  return false;
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

export function validateGoldenDatasetRelations(
  dataset: GoldenRelationDataset,
): GoldenRelationValidationResult {
  const { systemhouses, customers, projects, workPackages, activities } = dataset;

  if (hasDuplicateIds([systemhouses, customers, projects, workPackages, activities])) {
    return { ok: false, error: "golden_duplicate_id" };
  }

  const systemhouseById = new Map(systemhouses.map((systemhouse) => [systemhouse.id, systemhouse]));
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const workPackageById = new Map(workPackages.map((workPackage) => [workPackage.id, workPackage]));

  for (const customer of customers) {
    if (!systemhouseById.has(customer.systemhouseId)) {
      return { ok: false, error: "golden_systemhouse_reference_missing" };
    }
  }

  for (const project of projects) {
    const customer = customerById.get(project.customerId);
    if (!systemhouseById.has(project.systemhouseId)) {
      return { ok: false, error: "golden_systemhouse_reference_missing" };
    }
    if (!customer) {
      return { ok: false, error: "golden_customer_reference_missing" };
    }
    if (customer.systemhouseId !== project.systemhouseId) {
      return { ok: false, error: "golden_cross_customer_relation" };
    }
  }

  for (const workPackage of workPackages) {
    const customer = customerById.get(workPackage.customerId);
    const project = projectById.get(workPackage.projectId);
    if (!systemhouseById.has(workPackage.systemhouseId)) {
      return { ok: false, error: "golden_systemhouse_reference_missing" };
    }
    if (!customer) {
      return { ok: false, error: "golden_customer_reference_missing" };
    }
    if (!project) {
      return { ok: false, error: "golden_project_reference_missing" };
    }
    if (
      customer.systemhouseId !== workPackage.systemhouseId ||
      project.systemhouseId !== workPackage.systemhouseId ||
      project.customerId !== workPackage.customerId
    ) {
      return { ok: false, error: "golden_cross_customer_relation" };
    }
  }

  for (const activity of activities) {
    const customer = customerById.get(activity.customerId);
    const project = projectById.get(activity.projectId);
    const workPackage = workPackageById.get(activity.workPackageId);
    if (!systemhouseById.has(activity.systemhouseId)) {
      return { ok: false, error: "golden_systemhouse_reference_missing" };
    }
    if (!customer) {
      return { ok: false, error: "golden_customer_reference_missing" };
    }
    if (!project) {
      return { ok: false, error: "golden_project_reference_missing" };
    }
    if (!workPackage) {
      return { ok: false, error: "golden_workpackage_reference_missing" };
    }
    if (
      customer.systemhouseId !== activity.systemhouseId ||
      project.systemhouseId !== activity.systemhouseId ||
      project.customerId !== activity.customerId ||
      workPackage.systemhouseId !== activity.systemhouseId ||
      workPackage.customerId !== activity.customerId ||
      workPackage.projectId !== activity.projectId
    ) {
      return { ok: false, error: "golden_cross_customer_relation" };
    }
  }

  return { ok: true };
}
