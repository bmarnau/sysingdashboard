export const PERFORMANCE_STATEMENT_MAX_DAYS = 366;

export type PerformanceReviewState = "reviewable" | "legacy_finalized" | "claimed_by_statement";

export interface PerformanceStatementReviewRow {
  activitySourceId: string;
  sourceRevision: number;
  sourceHash: string;
  sourcePublishedAt: string;
  date: string;
  title: string;
  durationHours: number;
  sourceBillable: boolean;
  effectiveBillable: boolean;
  billingStatus: string;
  reviewState: PerformanceReviewState;
  hasStaleOverride: boolean;
  project: {
    sourceId: string | null;
    name: string | null;
  };
  workPackage: {
    sourceId: string | null;
    title: string | null;
  };
  category: {
    key: string | null;
    label: string | null;
    state: string;
  };
}

export interface PerformanceStatementReview {
  systemhouseId: string;
  customerId: string;
  customerName: string;
  periodStart: string;
  periodEnd: string;
  rows: PerformanceStatementReviewRow[];
  reviewFingerprint: string;
  freshness: {
    oldestPublishedAt: string | null;
    latestPublishedAt: string | null;
  };
  summary: {
    billableHours: number;
    nonBillableHours: number;
    reviewableCount: number;
  };
}

export interface PerformanceStatementReviewSummary {
  billableHours: number;
  nonBillableHours: number;
  reviewableCount: number;
}
