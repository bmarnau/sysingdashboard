import {
  PROJECT_CONTROLLING_MAX_ACTIVITIES,
  PROJECT_CONTROLLING_MAX_DAYS,
  type ProjectControllingCompleteness,
  type ProjectControllingFilters,
  type ProjectControllingFreshness,
  type ProjectControllingOutcome,
  type ProjectControllingRepository,
  type ProjectControllingRow,
  type ProjectControllingSummary,
  type ProjectControllingTrendPoint,
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

function buildDailyTrend(
  rows: readonly ProjectControllingRow[],
  fromDay: number,
  toDay: number,
): ProjectControllingTrendPoint[] {
  const totalsByDate = new Map<
    string,
    { totalHourHundredths: number; billableHourHundredths: number }
  >();

  for (const row of rows) {
    const totals = totalsByDate.get(row.activityDate) ?? {
      totalHourHundredths: 0,
      billableHourHundredths: 0,
    };
    const durationHourHundredths = Math.round(row.durationHours * 100);

    totals.totalHourHundredths += durationHourHundredths;
    if (row.billable) totals.billableHourHundredths += durationHourHundredths;
    totalsByDate.set(row.activityDate, totals);
  }

  const trend: ProjectControllingTrendPoint[] = [];

  for (let day = fromDay; day <= toDay; day += 1) {
    const date = new Date(day * MILLISECONDS_PER_DAY).toISOString().slice(0, 10);
    const totals = totalsByDate.get(date) ?? {
      totalHourHundredths: 0,
      billableHourHundredths: 0,
    };
    const nonBillableHourHundredths = totals.totalHourHundredths - totals.billableHourHundredths;

    trend.push({
      date,
      totalHours: totals.totalHourHundredths / 100,
      billableHours: totals.billableHourHundredths / 100,
      nonBillableHours: nonBillableHourHundredths / 100,
    });
  }

  return trend;
}

function normalizedPublishedAt(value: string | null | undefined): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function freshnessKey(kind: string, identity: string, publishedAt: string | null): string {
  return `${kind}:${identity}:${publishedAt ?? "unknown"}`;
}

function measureFreshness(
  rows: readonly ProjectControllingRow[],
): ProjectControllingFreshness {
  const observed = new Map<string, string | null>();

  for (const row of rows) {
    if (row.projectSourceId) {
      const identity = `${row.systemhouseId}:${row.customerId}:${row.projectSourceId}`;
      const publishedAt = normalizedPublishedAt(row.projectPublishedAt);
      observed.set(freshnessKey("project", identity, publishedAt), publishedAt);
    }

    if (row.workPackageSourceId) {
      const identity = `${row.systemhouseId}:${row.customerId}:${row.workPackageSourceId}`;
      const publishedAt = normalizedPublishedAt(row.workPackagePublishedAt);
      observed.set(freshnessKey("work-package", identity, publishedAt), publishedAt);
    }

    const activityIdentity = `${row.systemhouseId}:${row.customerId}:${row.activityId}`;
    const activityPublishedAt = normalizedPublishedAt(row.activityPublishedAt);
    observed.set(
      freshnessKey("activity", activityIdentity, activityPublishedAt),
      activityPublishedAt,
    );
  }

  const timestamps = [...observed.values()]
    .filter((value): value is string => value !== null)
    .sort((left, right) => left.localeCompare(right));

  return {
    oldestPublishedAt: timestamps[0] ?? null,
    latestPublishedAt: timestamps[timestamps.length - 1] ?? null,
    observedRows: observed.size,
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

    const freshness = measureFreshness(rows);

    return {
      ok: true,
      value: {
        filters: { ...filters },
        freshness,
        summary: summarize(rows),
        trend: buildDailyTrend(rows, fromDay, toDay),
        scopeOptions: [...repositoryScopeOptions],
        rows: [...rows],
        completeness: measureCompleteness(rows),
      },
    };
  }
}
