import { describe, expect, it } from "vitest";
import type { PerformanceStatementReviewRow } from "@/lib/performance-statement/performance-statement-contract";
import {
  canonicalizePerformanceReviewRows,
  createPerformanceReviewFingerprint,
} from "@/lib/performance-statement/review-fingerprint";

function makeRow(
  activitySourceId: string,
  overrides: Partial<PerformanceStatementReviewRow> = {},
): PerformanceStatementReviewRow {
  return {
    activitySourceId,
    sourceRevision: 1,
    sourceHash: `hash-${activitySourceId}`,
    sourcePublishedAt: "2026-09-01T10:00:00.000Z",
    date: "2026-09-01",
    title: `Leistung ${activitySourceId}`,
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

describe("BSF-03B review fingerprint", () => {
  it("canonicalizes rows in source-id order with two-decimal durations", () => {
    const rowB = makeRow("b", {
      sourceRevision: 2,
      durationHours: 0.2,
      effectiveBillable: false,
    });
    const rowA = makeRow("a", { durationHours: 1 });

    expect(canonicalizePerformanceReviewRows([rowB, rowA])).toBe(
      [
        "a|1|hash-a|2026-09-01|1.00|offen|true",
        "b|2|hash-b|2026-09-01|0.20|offen|false",
      ].join("\n"),
    );
  });

  it("produces the same SHA-256 fingerprint regardless of repository row order", async () => {
    const rowA = makeRow("a");
    const rowB = makeRow("b", { durationHours: 2 });

    const forward = await createPerformanceReviewFingerprint([rowA, rowB]);
    const reverse = await createPerformanceReviewFingerprint([rowB, rowA]);

    expect(reverse).toBe(forward);
    expect(forward).toMatch(/^[0-9a-f]{64}$/);
  });

  it.each([
    ["revision", { sourceRevision: 2 }],
    ["hash", { sourceHash: "changed-hash" }],
    ["duration", { durationHours: 1.25 }],
    ["effectiveBillable", { effectiveBillable: false }],
  ] as const)("changes the fingerprint when %s changes", async (_field, overrides) => {
    const baseline = await createPerformanceReviewFingerprint([makeRow("a")]);
    const changed = await createPerformanceReviewFingerprint([makeRow("a", overrides)]);

    expect(changed).not.toBe(baseline);
  });
});
