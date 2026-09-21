export const PERFORMANCE_STATEMENT_MAX_DAYS = 366;

export type PerformanceReviewState = "reviewable" | "legacy_finalized" | "claimed_by_statement";
export type PerformanceStatementStatus = "finalized" | "superseded";
export type PerformanceStatementCategoryState =
  | "unobserved"
  | "none"
  | "known"
  | "unknown"
  | "inactive";

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
    state: PerformanceStatementCategoryState;
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

export interface ReviewInput {
  systemhouseId: string;
  customerId: string;
  periodStart: string;
  periodEnd: string;
}

export interface BillableOverrideInput {
  systemhouseId: string;
  customerId: string;
  activitySourceId: string;
  sourceRevision: number;
  sourceHash: string;
  sourceBillable: boolean;
  effectiveBillable: boolean;
  note?: string;
}

export interface FinalizeInput extends ReviewInput {
  requestId: string;
  expectedReviewFingerprint: string;
}

export interface ReplaceInput extends FinalizeInput {
  replacesStatementId: string;
}

export interface StatementScope {
  systemhouseId: string;
  customerId?: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface PerformanceStatementScopeOption {
  systemhouseId: string;
  systemhouseName: string;
  customerId: string;
  customerName: string;
}

export interface PerformanceStatementSnapshotItem {
  position: number;
  activitySourceId: string;
  sourceRevision: number;
  sourceHash: string;
  sourcePublishedAt: string;
  sourceEngineerId: string | null;
  date: string;
  title: string;
  durationHours: number;
  sourceBillable: boolean;
  effectiveBillable: boolean;
  billingStatus: string;
  project: {
    sourceId: string | null;
    name: string;
  };
  workPackage: {
    sourceId: string | null;
    title: string;
  };
  category: {
    key: string | null;
    label: string;
  };
}

export interface PerformanceStatementSnapshot {
  id: string;
  seriesId: string;
  version: number;
  systemhouseId: string;
  customerId: string;
  customerName: string;
  periodStart: string;
  periodEnd: string;
  status: PerformanceStatementStatus;
  finalizedBy: string;
  finalizedAt: string;
  freshness: {
    oldestPublishedAt: string | null;
    latestPublishedAt: string | null;
  };
  reviewFingerprint: string;
  snapshotHash: string;
  itemCount: number;
  billableItemCount: number;
  billableHours: number;
  nonBillableHours: number;
  replacesStatementId: string | null;
  supersededByStatementId: string | null;
  items: PerformanceStatementSnapshotItem[];
}

export interface PerformanceStatementRepository {
  listScopes(): Promise<PerformanceStatementScopeOption[]>;
  getReview(input: ReviewInput): Promise<PerformanceStatementReview>;
  setBillableOverride(input: BillableOverrideInput): Promise<void>;
  finalize(input: FinalizeInput): Promise<{ statementId: string }>;
  replace(input: ReplaceInput): Promise<{ statementId: string }>;
  getStatement(statementId: string): Promise<PerformanceStatementSnapshot | null>;
  listStatements(scope: StatementScope): Promise<PerformanceStatementSnapshot[]>;
}
