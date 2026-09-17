import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const GOLDEN_ROOT = resolve("docs/examples/golden-dataset/v1");
const GOLDEN_SCHEMA_VERSION = "sysing.golden.v1";
const GOLDEN_DATASET_VERSION = "1.0.0";
const GOLDEN_REFERENCE_TIME = "2026-09-14T00:00:00Z";
const EXPECTED_UNKNOWN_CATEGORY = "unknown-golden-category";
const CANONICAL_FILES = [
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

function fail(code, detail) {
  throw new Error(detail ? `${code}:${detail}` : code);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(GOLDEN_ROOT, relativePath), "utf8"));
}

function requireArray(document, key) {
  if (!document || typeof document !== "object" || !Array.isArray(document[key])) {
    fail("golden_document_invalid", key);
  }
  return document[key];
}

function requireUniqueIds(collections) {
  const ids = new Set();
  for (const collection of collections) {
    for (const item of collection) {
      if (!item || typeof item.id !== "string" || item.id.length === 0) {
        fail("golden_document_invalid", "id");
      }
      if (ids.has(item.id)) {
        fail("golden_duplicate_id", item.id);
      }
      ids.add(item.id);
    }
  }
}

function byId(items) {
  return new Map(items.map((item) => [item.id, item]));
}

async function main() {
  const manifest = await readJson("manifest.json");

  if (manifest.schemaVersion !== GOLDEN_SCHEMA_VERSION) {
    fail("golden_schema_version_mismatch");
  }
  if (manifest.datasetVersion !== GOLDEN_DATASET_VERSION) {
    fail("golden_dataset_version_mismatch");
  }
  if (manifest.synthetic !== true) {
    fail("golden_dataset_must_be_synthetic");
  }
  if (manifest.referenceTime !== GOLDEN_REFERENCE_TIME) {
    fail("golden_reference_time_mismatch");
  }
  if (JSON.stringify(manifest.files) !== JSON.stringify(CANONICAL_FILES)) {
    fail("golden_manifest_files_mismatch");
  }

  for (const relativePath of CANONICAL_FILES) {
    await access(resolve(GOLDEN_ROOT, relativePath));
  }

  const systemhouses = requireArray(await readJson("systemhouse.json"), "systemhouses");
  const customers = requireArray(await readJson("customers.json"), "customers");
  const projects = requireArray(await readJson("projects.json"), "projects");
  const workPackages = requireArray(await readJson("work-packages.json"), "workPackages");
  const activities = requireArray(await readJson("activities.json"), "activities");
  const catalogs = requireArray(await readJson("reference-data.json"), "catalogs");

  requireUniqueIds([systemhouses, customers, projects, workPackages, activities]);

  const systemhouseById = byId(systemhouses);
  const customerById = byId(customers);
  const projectById = byId(projects);
  const workPackageById = byId(workPackages);

  for (const customer of customers) {
    if (!systemhouseById.has(customer.systemhouseId)) {
      fail("golden_systemhouse_reference_missing", customer.id);
    }
  }

  for (const project of projects) {
    const customer = customerById.get(project.customerId);
    if (!systemhouseById.has(project.systemhouseId)) {
      fail("golden_systemhouse_reference_missing", project.id);
    }
    if (!customer) {
      fail("golden_customer_reference_missing", project.id);
    }
    if (customer.systemhouseId !== project.systemhouseId) {
      fail("golden_cross_customer_relation", project.id);
    }
  }

  const categoryKeys = new Set();
  for (const catalog of catalogs) {
    if (!systemhouseById.has(catalog.systemhouseId)) {
      fail("golden_systemhouse_reference_missing", catalog.catalogKey);
    }
    if (catalog.catalogKey !== "workpackage.category" || !Array.isArray(catalog.values)) {
      continue;
    }
    for (const value of catalog.values) {
      if (typeof value.key !== "string" || categoryKeys.has(value.key)) {
        fail("golden_duplicate_id", value.key);
      }
      categoryKeys.add(value.key);
    }
  }

  for (const workPackage of workPackages) {
    const customer = customerById.get(workPackage.customerId);
    const project = projectById.get(workPackage.projectId);
    if (!systemhouseById.has(workPackage.systemhouseId)) {
      fail("golden_systemhouse_reference_missing", workPackage.id);
    }
    if (!customer) {
      fail("golden_customer_reference_missing", workPackage.id);
    }
    if (!project) {
      fail("golden_project_reference_missing", workPackage.id);
    }
    if (
      customer.systemhouseId !== workPackage.systemhouseId ||
      project.systemhouseId !== workPackage.systemhouseId ||
      project.customerId !== workPackage.customerId
    ) {
      fail("golden_cross_customer_relation", workPackage.id);
    }
    if (
      workPackage.categoryObserved === true &&
      workPackage.categoryKey !== null &&
      !categoryKeys.has(workPackage.categoryKey) &&
      workPackage.categoryKey !== EXPECTED_UNKNOWN_CATEGORY
    ) {
      fail("golden_category_reference_missing", workPackage.id);
    }
  }

  for (const activity of activities) {
    const customer = customerById.get(activity.customerId);
    const project = projectById.get(activity.projectId);
    const workPackage = workPackageById.get(activity.workPackageId);
    if (!systemhouseById.has(activity.systemhouseId)) {
      fail("golden_systemhouse_reference_missing", activity.id);
    }
    if (!customer) {
      fail("golden_customer_reference_missing", activity.id);
    }
    if (!project) {
      fail("golden_project_reference_missing", activity.id);
    }
    if (!workPackage) {
      fail("golden_workpackage_reference_missing", activity.id);
    }
    if (
      customer.systemhouseId !== activity.systemhouseId ||
      project.systemhouseId !== activity.systemhouseId ||
      project.customerId !== activity.customerId ||
      workPackage.systemhouseId !== activity.systemhouseId ||
      workPackage.customerId !== activity.customerId ||
      workPackage.projectId !== activity.projectId
    ) {
      fail("golden_cross_customer_relation", activity.id);
    }
  }

  console.log("Golden Dataset V1: PASS");
}

try {
  await main();
} catch (error) {
  console.error(
    `Golden Dataset V1: FAIL ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
