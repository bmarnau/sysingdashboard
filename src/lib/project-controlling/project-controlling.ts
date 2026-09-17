import {
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

function summarize(rows: readonly ProjectControllingRow[]): ProjectControllingSummary {
  const customers = new Set<string>();
  const projects = new Set<string>();
  const workPackages = new Set<string>();
  let totalHours = 0;
  let billableHours = 0;

  for (const row of rows) {
    customers.add(row.customerId);
    if (row.projectSourceId) projects.add(row.projectSourceId);
    if (row.workPackageSourceId) workPackages.add(row.workPackageSourceId);
    totalHours += row.durationHours;
    if (row.billable) billableHours += row.durationHours;
  }

  const nonBillableHours = totalHours - billableHours;

  return {
    activities: rows.length,
    customers: customers.size,
    projects: projects.size,
    workPackages: workPackages.size,
    totalHours,
    billableHours,
    nonBillableHours,
    billableQuotePercent: totalHours === 0 ? 0 : (billableHours / totalHours) * 100,
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

    const [repositoryRows, repositoryScopeOptions] = await Promise.all([
      this.repository.listRows(filters),
      this.repository.listScopeOptions(filters),
    ]);

    const rows = repositoryRows.filter(
      (row) => row.activityDate >= filters.from && row.activityDate <= filters.to,
    );

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
