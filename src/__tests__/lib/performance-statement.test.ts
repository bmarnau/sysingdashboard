import { describe, expect, it } from "vitest";
import type {
  PerformanceStatementReviewRow,
} from "@/lib/performance-statement/performance-statement-contract";
import {
  classifyRow,
  summarizePerformanceReviewRows,
  validatePerformancePeriod,
} from "@/lib/performance-statement/performance-statement";

function makeRow(
  overrides: Partial<PerformanceStatementReviewRow> = {},
): PerformanceStatementReviewRow {
  return {
    activitySourceId: "activity-1",
    sourceRevision: 1,
    sourceHash: "hash-1",
    sourcePublishedAt: "2026-09-01T10:00:00.000Z",
    date: "2026-09-01",
    title: "Leistung",
    durationHours: 1,
    sourceBillable: true,
    effectiveBillable: true,
    billingStatus: "offen",
    reviewState: "reviewable",
    hasStaleOverride: false,
    project: { sourceId: "project-1", name: "Projekt Eins" },
    workPackage: { sourceId: "work-package-1", title: "Arbeitspaket Eins" },
    category: { key: "regelbetrieb", label: "Regelbetrieb", state: "known" },
    ...overrides,
  };
}

describe("BSF-03B provider-neutral performance statement domain", () => {
  it("accepts inclusive ISO periods up to 366 calendar days", () => {
    expect(() => validatePerformancePeriod("2026-09-01", "2026-09-30")).not.toThrow();
    expect(() => validatePerformancePeriod("2025-01-01", "2026-01-01")).not.toThrow();
  });

  it("rejects invalid, reversed or longer-than-366-day periods", () => {
    expect(() => validatePerformancePeriod("2026-10-01", "2026-09-01")).toThrow();
    expect(() => validatePerformancePeriod("2025-01-01", "2026-01-02")).toThrow();
    expect(() => validatePerformancePeriod("2026-02-30", "2026-03-01")).toThrow();
    expect(() => validatePerformancePeriod("not-a-date", "2026-03-01")).toThrow();
  });

  it("classifies review rows according to billing status and active claim", () => {
    expect(classifyRow({ billingStatus: "abgerechnet", claimed: false })).toBe(
      "legacy_finalized",
    );
    expect(classifyRow({ billingStatus: "offen", claimed: true })).toBe(
      "claimed_by_statement",
    );
    expect(classifyRow({ billingStatus: "offen", claimed: false })).toBe("reviewable");
  });

  it("summarizes only reviewable rows and uses effective billable", () => {
    const summary = summarizePerformanceReviewRows([
      makeRow({
        activitySourceId: "billable-override",
        durationHours: 0.1,
        sourceBillable: false,
        effectiveBillable: true,
      }),
      makeRow({
        activitySourceId: "billable",
        durationHours: 0.2,
        sourceBillable: true,
        effectiveBillable: true,
      }),
      makeRow({
        activitySourceId: "non-billable",
        durationHours: 0.3,
        sourceBillable: true,
        effectiveBillable: false,
      }),
      makeRow({
        activitySourceId: "legacy",
        durationHours: 9,
        reviewState: "legacy_finalized",
      }),
      makeRow({
        activitySourceId: "claimed",
        durationHours: 8,
        reviewState: "claimed_by_statement",
      }),
    ]);

    expect(summary).toEqual({
      billableHours: 0.3,
      nonBillableHours: 0.3,
      reviewableCount: 3,
    });
  });
});
