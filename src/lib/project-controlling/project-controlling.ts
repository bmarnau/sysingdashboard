import {
  PROJECT_CONTROLLING_MAX_ACTIVITIES,
  PROJECT_CONTROLLING_MAX_DAYS,
  type ProjectControllingCompleteness,
  type ProjectControllingFilters,
  type ProjectControllingOutcome,
  type ProjectControllingRepository,
  type ProjectControllingRow,
  type ProjectControllingSummary,
} from "./project-controlling-contract";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MILLISECONDS_PER_DAY = 86_400_000;

function toUtcDay(value: string): number | null {
  if (!ISO_DATE_PATTERN.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp / MILLISECONDS_PER_DAY;
}

function hasInvalidScope(filters: ProjectControllingFilters): boolean {
  if (filters.customerId && !filters.systemhouseId) return true;
  if (filters.projectSourceId && (!filters.systemhouseId || !filters.customerId)) return true;
  if (
    filters.workPackageSourceId &&
    (!filters.systemhouseId || !filters.customerId || !filters.projectSourceId)
  ) {
    return true;
  }
  if (filters.categoryKey && !filters.systemhouseId) return true;

  return false;
}

function matchesFilters(row: ProjectControllingRow, filters: ProjectControllingFilters): boolean {
  if (row.activityDate < filters.from || row.activityDate > filters.to) return false;
  if (filters.billable === "billable" && !row.billable) return false;
  if (filters.billable === "nonBillable" && row.billable) return false;
  if (filters.systemhouseId && row.systemhouseId !== filters.systemhouseId) return false;
  if (filters.customerId && row.customerId !== filters.customerId) return false;
  if (filters.projectSourceId && row.projectSourceId !== filters.projectSourceId) return false;
  if (filters.workPackageSourceId && row.workPackageSourceId !== filters.workPackageSourceId) {
    return false;
  }
  if (filters.categoryKey && row.categoryKey !== filters.categoryKey) return false;

  return true;
}

function summarize(rows: readonly ProjectControllingRow[]): ProjectControllingSummary {
  const customers = new Set<string>();
  const projects = new Set<string>();
  const workPackages = new Set<string>();
  let totalHourHundredths = 0;
  let billableHourHundredths = 0;

  for (const row of rows) {
    customers.add(row.customerId);
    if (row.projectSourceId) projects.add(row.projectSourceId);
    if (row.workPackageSourceId) workPackages.add(row.workPackageSourceId);

    const durationHourHundredths = Math.round(row.durationHours * 100);
    totalHourHundredths += durationHourHundredths;
    if (row.billable) billableHourHundredths += durationHourHundredths;
  }

  const nonBillableHourHundredths = totalHourHundredths - billableHourHundredths;

  return {
    activities: rows.length,
    customers: customers.size,
    projects: projects.size,
    workPackages: workPackages.size,
    totalHours: totalHourHundredths / 100,
    billableHours: billableHourHundredths / 100,
    nonBillableHours: nonBillableHourHundredths / 100,
    billableQuotePercent:
      totalHourHundredths === 0 ? 0 : (billableHourHundredths / totalHourHundredths) * 100,
  };
}

function measureCompleteness(
  rows: readonly ProjectControllingRow[],
): ProjectControllingCompleteness {
  return {
    categoryUnobservedRows: rows.filter((row) => row.categoryState === "unobserved").length,
    categoryUnknownRows: rows.filter((row) => row.categoryState === "unknown").length,
    rowsWithoutProject: rows.filter((row) => row.projectSourceId === null).length,
    rowsWithoutWorkPackage: rows.filter((row) => row.workPackageSourceId === null).length,
  };
}

export class ProjectControllingService {
  constructor(private readonly repository: ProjectControllingRepository) {}

  async get(filters: ProjectControllingFilters): Promise<ProjectControllingOutcome> {
    const fromDay = toUtcDay(filters.from);
    const toDay = toUtcDay(filters.to);

    if (fromDay === null || toDay === null || fromDay > toDay) {
      return { ok: false, error: "PROJECT_CONTROLLING_INVALID_DATE_RANGE" };
    }

    if (toDay - fromDay + 1 > PROJECT_CONTROLLING_MAX_DAYS) {
      return { ok: false, error: "PROJECT_CONTROLLING_RANGE_TOO_LARGE" };
    }

    if (hasInvalidScope(filters)) {
      return { ok: false, error: "PROJECT_CONTROLLING_INVALID_SCOPE" };
    }

    const [repositoryRows, repositoryScopeOptions] = await Promise.all([
      this.repository.listRows(filters),
      this.repository.listScopeOptions(filters),
    ]);

    const rows = repositoryRows.filter((row) => matchesFilters(row, filters));

    if (rows.length > PROJECT_CONTROLLING_MAX_ACTIVITIES) {
      return { ok: false, error: "PROJECT_CONTROLLING_TOO_MANY_ACTIVITIES" };
    }

    return {
      ok: true,
      value: {
        filters: { ...filters },
        summary: summarize(rows),
        trend: [],
        scopeOptions: [...repositoryScopeOptions],
        rows: [...rows],
        completeness: measureCompleteness(rows),
      },
    };
  }
}
