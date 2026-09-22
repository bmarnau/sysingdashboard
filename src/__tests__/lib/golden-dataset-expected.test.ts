import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { PerformanceStatementReviewRow } from "@/lib/performance-statement/performance-statement-contract";
import {
  classifyRow,
  summarizePerformanceReviewRows,
  validatePerformancePeriod,
} from "@/lib/performance-statement/performance-statement";

const GOLDEN_ROOT = resolve("docs/examples/golden-dataset/v1");

type Activity = {
  id: string;
  systemhouseId: string;
  customerId: string;
  projectId: string;
  workPackageId: string;
  date: string;
  durationHours: number;
  billable: boolean;
  billingStatus: string;
};

type WorkPackage = {
  id: string;
  categoryObserved: boolean;
  categoryKey: string | null;
};

type ReferenceCatalog = {
  catalogKey: string;
  values: Array<{ key: string; active: boolean }>;
};

type ExpectedCase = {
  filters: {
    customerId?: string;
    projectId?: string;
    workPackageId?: string;
    billable?: boolean;
    categoryState?: "known" | "none" | "inactive" | "unobserved" | "unknown";
    categoryKey?: string;
  };
  activities: number;
  totalHours: number;
  billableHours?: number;
  nonBillableHours?: number;
  billableQuotePercent?: number;
};

async function readJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(await readFile(resolve(GOLDEN_ROOT, relativePath), "utf8")) as T;
}

function summarize(activities: readonly Activity[]) {
  const totalHours = activities.reduce((sum, activity) => sum + activity.durationHours, 0);
  const billableHours = activities.reduce(
    (sum, activity) => sum + (activity.billable ? activity.durationHours : 0),
    0,
  );
  const nonBillableHours = totalHours - billableHours;

  return {
    activities: activities.length,
    totalHours,
    billableHours,
    nonBillableHours,
    billableQuotePercent: totalHours === 0 ? 0 : (billableHours / totalHours) * 100,
  };
}

function categoryState(
  workPackage: WorkPackage,
  activeKeys: ReadonlySet<string>,
  inactiveKeys: ReadonlySet<string>,
): "known" | "none" | "inactive" | "unobserved" | "unknown" {
  if (!workPackage.categoryObserved) return "unobserved";
  if (workPackage.categoryKey === null) return "none";
  if (activeKeys.has(workPackage.categoryKey)) return "known";
  if (inactiveKeys.has(workPackage.categoryKey)) return "inactive";
  return "unknown";
}

function buildDrillDown(activities: readonly Activity[]) {
  const customers = new Map<string, Map<string, Map<string, string[]>>>();

  for (const activity of activities) {
    const projects = customers.get(activity.customerId) ?? new Map<string, Map<string, string[]>>();
    const workPackages = projects.get(activity.projectId) ?? new Map<string, string[]>();
    const activityIds = workPackages.get(activity.workPackageId) ?? [];
    activityIds.push(activity.id);
    workPackages.set(activity.workPackageId, activityIds);
    projects.set(activity.projectId, workPackages);
    customers.set(activity.customerId, projects);
  }

  return [...customers.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([customerId, projects]) => ({
      customerId,
      projects: [...projects.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([projectId, workPackages]) => ({
          projectId,
          workPackages: [...workPackages.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([workPackageId, activityIds]) => ({
              workPackageId,
              activityIds: [...activityIds].sort(),
            })),
        })),
    }));
}

describe("GDS-01 Golden Dataset V1 expected business results", () => {
  it("matches the fixed overall and filtered project-controlling arithmetic", async () => {
    const [{ activities }, { workPackages }, { catalogs }, expected] = await Promise.all([
      readJson<{ activities: Activity[] }>("activities.json"),
      readJson<{ workPackages: WorkPackage[] }>("work-packages.json"),
      readJson<{ catalogs: ReferenceCatalog[] }>("reference-data.json"),
      readJson<{
        summary: Record<string, number>;
        cases: Record<string, ExpectedCase>;
      }>("expected/project-controlling.json"),
    ]);

    const overall = summarize(activities);
    expect({
      ...overall,
      customers: new Set(activities.map((activity) => activity.customerId)).size,
      projects: new Set(activities.map((activity) => activity.projectId)).size,
      workPackages: new Set(activities.map((activity) => activity.workPackageId)).size,
    }).toEqual(expected.summary);

    const workPackageById = new Map(
      workPackages.map((workPackage) => [workPackage.id, workPackage]),
    );
    const categoryCatalog = catalogs.find(
      (catalog) => catalog.catalogKey === "workpackage.category",
    );
    expect(categoryCatalog).toBeDefined();
    const activeKeys = new Set(
      categoryCatalog?.values.filter((value) => value.active).map((value) => value.key),
    );
    const inactiveKeys = new Set(
      categoryCatalog?.values.filter((value) => !value.active).map((value) => value.key),
    );

    for (const expectedCase of Object.values(expected.cases)) {
      const filtered = activities.filter((activity) => {
        const { filters } = expectedCase;
        if (filters.customerId && activity.customerId !== filters.customerId) return false;
        if (filters.projectId && activity.projectId !== filters.projectId) return false;
        if (filters.workPackageId && activity.workPackageId !== filters.workPackageId) return false;
        if (filters.billable !== undefined && activity.billable !== filters.billable) return false;

        if (filters.categoryState) {
          const workPackage = workPackageById.get(activity.workPackageId);
          if (!workPackage) return false;
          if (categoryState(workPackage, activeKeys, inactiveKeys) !== filters.categoryState) {
            return false;
          }
          if (filters.categoryKey && workPackage.categoryKey !== filters.categoryKey) return false;
        }

        return true;
      });

      const { filters: _filters, ...expectedResult } = expectedCase;
      expect(summarize(filtered)).toMatchObject(expectedResult);
    }
  });

  it("matches the independently fixed daily trend and drill-down", async () => {
    const [{ activities }, expected] = await Promise.all([
      readJson<{ activities: Activity[] }>("activities.json"),
      readJson<{
        trend: Array<{
          date: string;
          totalHours: number;
          billableHours: number;
          nonBillableHours: number;
        }>;
        drillDown: unknown;
      }>("expected/project-controlling.json"),
    ]);

    const dates = [...new Set(activities.map((activity) => activity.date))].sort();
    const trend = dates.map((date) => ({
      date,
      ...summarize(activities.filter((activity) => activity.date === date)),
    }));

    expect(
      trend.map(({ date, totalHours, billableHours, nonBillableHours }) => ({
        date,
        totalHours,
        billableHours,
        nonBillableHours,
      })),
    ).toEqual(expected.trend);
    expect(buildDrillDown(activities)).toEqual(expected.drillDown);
  });

  it("matches the fixed BSF-03B review, override and customer-output results", async () => {
    const [{ activities }, expected] = await Promise.all([
      readJson<{ activities: Activity[] }>("activities.json"),
      readJson<{
        period: { start: string; end: string };
        cases: {
          customerAReview: {
            customerId: string;
            activityIds: string[];
            reviewableCount: number;
            legacyFinalizedCount: number;
            billableHours: number;
            nonBillableHours: number;
          };
          customerAOverrideAct02Billable: {
            customerId: string;
            override: { activityId: string; effectiveBillable: boolean };
            reviewableCount: number;
            billableHours: number;
            nonBillableHours: number;
            snapshotActivityIds: string[];
            customerOutputActivityIds: string[];
          };
          customerBLegacy: {
            customerId: string;
            reviewableActivityIds: string[];
            legacyFinalizedActivityIds: string[];
            reviewableCount: number;
            legacyFinalizedCount: number;
            billableHours: number;
            nonBillableHours: number;
            customerOutputActivityIds: string[];
          };
        };
      }>("expected/performance-statement.json"),
    ]);

    expect(() =>
      validatePerformancePeriod(expected.period.start, expected.period.end),
    ).not.toThrow();

    const toReviewRow = (
      activity: Activity,
      effectiveBillable = activity.billable,
    ): PerformanceStatementReviewRow => ({
      activitySourceId: activity.id,
      sourceRevision: 1,
      sourceHash: `golden-hash-${activity.id}`,
      sourcePublishedAt: "2026-09-14T00:00:00.000Z",
      date: activity.date,
      title: activity.id,
      durationHours: activity.durationHours,
      sourceBillable: activity.billable,
      effectiveBillable,
      billingStatus: activity.billingStatus,
      reviewState: classifyRow({
        billingStatus: activity.billingStatus,
        claimed: false,
      }),
      hasStaleOverride: false,
      project: { sourceId: activity.projectId, name: activity.projectId },
      workPackage: {
        sourceId: activity.workPackageId,
        title: activity.workPackageId,
      },
      category: { key: null, label: null, state: "unobserved" },
    });

    const customerA = expected.cases.customerAReview;
    const customerARows = activities
      .filter((activity) => activity.customerId === customerA.customerId)
      .map((activity) => toReviewRow(activity));

    expect(customerARows.map((row) => row.activitySourceId).sort()).toEqual(
      [...customerA.activityIds].sort(),
    );
    expect(customerARows.filter((row) => row.reviewState === "legacy_finalized")).toHaveLength(
      customerA.legacyFinalizedCount,
    );
    expect(summarizePerformanceReviewRows(customerARows)).toEqual({
      billableHours: customerA.billableHours,
      nonBillableHours: customerA.nonBillableHours,
      reviewableCount: customerA.reviewableCount,
    });

    const overrideCase = expected.cases.customerAOverrideAct02Billable;
    const overrideRows = activities
      .filter((activity) => activity.customerId === overrideCase.customerId)
      .map((activity) =>
        toReviewRow(
          activity,
          activity.id === overrideCase.override.activityId
            ? overrideCase.override.effectiveBillable
            : activity.billable,
        ),
      );

    expect(summarizePerformanceReviewRows(overrideRows)).toEqual({
      billableHours: overrideCase.billableHours,
      nonBillableHours: overrideCase.nonBillableHours,
      reviewableCount: overrideCase.reviewableCount,
    });
    expect(overrideRows.map((row) => row.activitySourceId).sort()).toEqual(
      [...overrideCase.snapshotActivityIds].sort(),
    );
    expect(
      overrideRows
        .filter((row) => row.reviewState === "reviewable" && row.effectiveBillable)
        .map((row) => row.activitySourceId)
        .sort(),
    ).toEqual([...overrideCase.customerOutputActivityIds].sort());

    const legacyCase = expected.cases.customerBLegacy;
    const legacyRows = activities
      .filter((activity) => activity.customerId === legacyCase.customerId)
      .map((activity) => toReviewRow(activity));

    expect(
      legacyRows
        .filter((row) => row.reviewState === "reviewable")
        .map((row) => row.activitySourceId)
        .sort(),
    ).toEqual([...legacyCase.reviewableActivityIds].sort());
    expect(
      legacyRows
        .filter((row) => row.reviewState === "legacy_finalized")
        .map((row) => row.activitySourceId)
        .sort(),
    ).toEqual([...legacyCase.legacyFinalizedActivityIds].sort());
    expect(legacyRows.filter((row) => row.reviewState === "legacy_finalized")).toHaveLength(
      legacyCase.legacyFinalizedCount,
    );
    expect(summarizePerformanceReviewRows(legacyRows)).toEqual({
      billableHours: legacyCase.billableHours,
      nonBillableHours: legacyCase.nonBillableHours,
      reviewableCount: legacyCase.reviewableCount,
    });
    expect(
      legacyRows
        .filter((row) => row.reviewState === "reviewable" && row.effectiveBillable)
        .map((row) => row.activitySourceId)
        .sort(),
    ).toEqual([...legacyCase.customerOutputActivityIds].sort());
  });

  it("keeps the comparable kiosk metrics on the same business definition", async () => {
    const [{ activities }, expected] = await Promise.all([
      readJson<{ activities: Activity[] }>("activities.json"),
      readJson<{
        period: { from: string; to: string };
        projectsWithActivity: number;
        workPackagesWithActivity: number;
        activityHours: number;
        billableQuotePercent: number;
      }>("expected/kiosk-summary.json"),
    ]);

    const dates = activities.map((activity) => activity.date).sort();
    const summary = summarize(activities);

    expect({
      period: { from: dates[0], to: dates[dates.length - 1] },
      projectsWithActivity: new Set(activities.map((activity) => activity.projectId)).size,
      workPackagesWithActivity: new Set(activities.map((activity) => activity.workPackageId)).size,
      activityHours: summary.totalHours,
      billableQuotePercent: summary.billableQuotePercent,
    }).toEqual(expected);
  });
});
