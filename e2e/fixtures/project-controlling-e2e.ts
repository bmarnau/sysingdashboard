/**
 * BSF-03A Projektcontrolling — synthetische Serverfunktions-Grenze für E2E.
 *
 * Produktivcode importiert diese Datei nicht. Die Fixture simuliert ausschließlich
 * bereits getroffene Serverentscheidungen (OK oder generisches DENY) und verwendet
 * keine reale Supabase-Instanz oder produktive Identitäten.
 */
import type { Page, Route } from "@playwright/test";
import type {
  ProjectControllingFilters,
  ProjectControllingResult,
} from "../../src/lib/project-controlling/project-controlling-contract";

export const SH_A = "11111111-1111-4111-8111-111111111111";
export const SH_B = "11111111-1111-4111-8111-1111111111b2";
export const CUSTOMER_A = "22222222-2222-4222-8222-222222222221";
export const CUSTOMER_FOREIGN = "22222222-2222-4222-8222-2222222222ff";
export const PROJECT_A = "project-alpha";
export const WORK_PACKAGE_A = "wp-alpha";

const DEFAULT_FILTERS: ProjectControllingFilters = {
  from: "2026-09-01",
  to: "2026-09-18",
  billable: "all",
};

type ServerOutcome =
  | { kind: "ok"; value: ProjectControllingResult }
  | { kind: "deny"; message: string };

export interface ProjectControllingRequestContext {
  filters: ProjectControllingFilters;
  rawBody: string;
}

export interface ProjectControllingServerBehaviour {
  resolve(context: ProjectControllingRequestContext): ServerOutcome;
}

function summaryFor(filters: ProjectControllingFilters) {
  if (filters.billable === "billable") {
    return {
      activities: 6,
      customers: 2,
      projects: 3,
      workPackages: 5,
      totalHours: 20,
      billableHours: 20,
      nonBillableHours: 0,
      billableQuotePercent: 100,
    };
  }

  if (filters.billable === "nonBillable") {
    return {
      activities: 2,
      customers: 1,
      projects: 2,
      workPackages: 2,
      totalHours: 5,
      billableHours: 0,
      nonBillableHours: 5,
      billableQuotePercent: 0,
    };
  }

  return {
    activities: 8,
    customers: 2,
    projects: 3,
    workPackages: 5,
    totalHours: 25,
    billableHours: 20,
    nonBillableHours: 5,
    billableQuotePercent: 80,
  };
}

function baseRows(filters: ProjectControllingFilters): ProjectControllingResult["rows"] {
  const rows: ProjectControllingResult["rows"] = [
    {
      activityId: "activity-billable",
      activityDate: "2026-09-01",
      activityTitle: "Patch-Analyse",
      durationHours: 20,
      billable: true,
      billingStatus: "open",
      systemhouseId: SH_A,
      systemhouseName: "Systemhaus Nord",
      customerId: CUSTOMER_A,
      customerName: "Kunde Alpha",
      projectSourceId: PROJECT_A,
      projectName: "Projekt Alpha",
      workPackageSourceId: WORK_PACKAGE_A,
      workPackageTitle: "Arbeitspaket Alpha",
      categoryObserved: true,
      categoryKey: "wartung",
      categoryLabel: "Wartung",
      categoryState: "known",
    },
    {
      activityId: "activity-nonbillable",
      activityDate: "2026-09-02",
      activityTitle: "Dokumentation",
      durationHours: 5,
      billable: false,
      billingStatus: null,
      systemhouseId: SH_A,
      systemhouseName: "Systemhaus Nord",
      customerId: CUSTOMER_A,
      customerName: "Kunde Alpha",
      projectSourceId: PROJECT_A,
      projectName: "Projekt Alpha",
      workPackageSourceId: WORK_PACKAGE_A,
      workPackageTitle: "Arbeitspaket Alpha",
      categoryObserved: true,
      categoryKey: "legacy-key",
      categoryLabel: null,
      categoryState: "unknown",
    },
  ];

  if (filters.billable === "billable") return rows.filter((row) => row.billable);
  if (filters.billable === "nonBillable") return rows.filter((row) => !row.billable);
  return rows;
}

export function projectControllingResult(
  filters: ProjectControllingFilters = DEFAULT_FILTERS,
): ProjectControllingResult {
  const normalized: ProjectControllingFilters = {
    ...DEFAULT_FILTERS,
    ...filters,
  };
  const rows = baseRows(normalized);

  return {
    filters: normalized,
    summary: summaryFor(normalized),
    trend:
      normalized.billable === "nonBillable"
        ? [
            { date: "2026-09-01", totalHours: 0, billableHours: 0, nonBillableHours: 0 },
            { date: "2026-09-02", totalHours: 5, billableHours: 0, nonBillableHours: 5 },
          ]
        : normalized.billable === "billable"
          ? [
              { date: "2026-09-01", totalHours: 20, billableHours: 20, nonBillableHours: 0 },
              { date: "2026-09-02", totalHours: 0, billableHours: 0, nonBillableHours: 0 },
            ]
          : [
              { date: "2026-09-01", totalHours: 20, billableHours: 20, nonBillableHours: 0 },
              { date: "2026-09-02", totalHours: 5, billableHours: 0, nonBillableHours: 5 },
            ],
    scopeOptions: [
      { kind: "systemhouse", label: "Systemhaus Nord", systemhouseId: SH_A },
      { kind: "systemhouse", label: "Systemhaus Süd", systemhouseId: SH_B },
      {
        kind: "customer",
        label: "Kunde Alpha",
        systemhouseId: SH_A,
        customerId: CUSTOMER_A,
      },
      {
        kind: "customer",
        label: "Fremdkunde",
        systemhouseId: SH_A,
        customerId: CUSTOMER_FOREIGN,
      },
      {
        kind: "customer",
        label: "Kunde Süd",
        systemhouseId: SH_B,
        customerId: "22222222-2222-4222-8222-2222222222b2",
      },
      {
        kind: "project",
        label: "Projekt Alpha",
        systemhouseId: SH_A,
        customerId: CUSTOMER_A,
        projectSourceId: PROJECT_A,
      },
      {
        kind: "workPackage",
        label: "Arbeitspaket Alpha",
        systemhouseId: SH_A,
        customerId: CUSTOMER_A,
        projectSourceId: PROJECT_A,
        workPackageSourceId: WORK_PACKAGE_A,
      },
      {
        kind: "category",
        label: "Wartung",
        systemhouseId: SH_A,
        categoryKey: "wartung",
        active: true,
      },
      {
        kind: "category",
        label: "Historisch",
        systemhouseId: SH_A,
        categoryKey: "legacy-key",
        active: false,
      },
    ],
    rows,
    completeness: {
      categoryUnobservedRows: 0,
      categoryUnknownRows: rows.filter((row) => row.categoryState === "unknown").length,
      rowsWithoutProject: 0,
      rowsWithoutWorkPackage: 0,
    },
  };
}

function findFilterObject(value: unknown): ProjectControllingFilters | null {
  if (!value || typeof value !== "object") return null;

  const object = value as Record<string, unknown>;
  if (
    typeof object.from === "string" &&
    typeof object.to === "string" &&
    (object.billable === "all" ||
      object.billable === "billable" ||
      object.billable === "nonBillable")
  ) {
    return object as unknown as ProjectControllingFilters;
  }

  for (const child of Object.values(object)) {
    const found = findFilterObject(child);
    if (found) return found;
  }
  return null;
}

function regexValue(raw: string, key: string): string | undefined {
  const match = raw.match(new RegExp(`["']?${key}["']?\\s*[:=]\\s*["']([^"']+)["']`));
  return match?.[1];
}

function parseFilters(raw: string): ProjectControllingFilters {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const found = findFilterObject(parsed);
    if (found) return { ...DEFAULT_FILTERS, ...found };
  } catch {
    // Fallback below also supports framework-specific serialization.
  }

  const billable = regexValue(raw, "billable");
  return {
    from: regexValue(raw, "from") ?? DEFAULT_FILTERS.from,
    to: regexValue(raw, "to") ?? DEFAULT_FILTERS.to,
    billable:
      billable === "billable" || billable === "nonBillable" || billable === "all"
        ? billable
        : "all",
    systemhouseId: regexValue(raw, "systemhouseId"),
    customerId: regexValue(raw, "customerId"),
    projectSourceId: regexValue(raw, "projectSourceId"),
    workPackageSourceId: regexValue(raw, "workPackageSourceId"),
    categoryKey: regexValue(raw, "categoryKey"),
  };
}

async function ok(route: Route, value: ProjectControllingResult): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ result: { ok: true, value } }),
  });
}

async function deny(route: Route, message: string): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ error: { name: "Error", message } }),
  });
}

export async function installProjectControllingServerFnMock(
  page: Page,
  behaviour: ProjectControllingServerBehaviour,
): Promise<void> {
  await page.route(
    (url) => url.pathname.includes("_serverFn"),
    async (route) => {
      const rawBody = route.request().postData() ?? "";
      const filters = parseFilters(rawBody);
      const outcome = behaviour.resolve({ filters, rawBody });

      if (outcome.kind === "deny") {
        await deny(route, outcome.message);
        return;
      }

      await ok(route, outcome.value);
    },
  );
}