export const PROJECT_CONTROLLING_MAX_DAYS = 366;
export const PROJECT_CONTROLLING_MAX_ACTIVITIES = 5_000;

export type ProjectControllingBillableFilter = "all" | "billable" | "nonBillable";
export type ProjectControllingCategoryState =
  | "unobserved"
  | "none"
  | "known"
  | "inactive"
  | "unknown";

export interface ProjectControllingFilters {
  from: string;
  to: string;
  billable: ProjectControllingBillableFilter;
  systemhouseId?: string;
  customerId?: string;
  projectSourceId?: string;
  workPackageSourceId?: string;
  categoryKey?: string;
}

export type ProjectControllingScopeKind =
  | "systemhouse"
  | "customer"
  | "project"
  | "workPackage"
  | "category";

export interface ProjectControllingScopeOption {
  kind: ProjectControllingScopeKind;
  label: string;
  systemhouseId: string;
  customerId?: string;
  projectSourceId?: string;
  workPackageSourceId?: string;
  categoryKey?: string;
  active?: boolean;
}

export interface ProjectControllingRow {
  activityId: string;
  activityDate: string;
  activityTitle: string;
  durationHours: number;
  billable: boolean;
  billingStatus: string | null;
  systemhouseId: string;
  systemhouseName: string;
  customerId: string;
  customerName: string;
  projectSourceId: string | null;
  projectName: string | null;
  workPackageSourceId: string | null;
  workPackageTitle: string | null;
  categoryObserved: boolean;
  categoryKey: string | null;
  categoryLabel: string | null;
  categoryState: ProjectControllingCategoryState;
  projectPublishedAt?: string | null;
  workPackagePublishedAt?: string | null;
  activityPublishedAt?: string | null;
}

export interface ProjectControllingSummary {
  activities: number;
  customers: number;
  projects: number;
  workPackages: number;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  billableQuotePercent: number;
}

export interface ProjectControllingTrendPoint {
  date: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
}

export interface ProjectControllingCompleteness {
  categoryUnobservedRows: number;
  categoryUnknownRows: number;
  rowsWithoutProject: number;
  rowsWithoutWorkPackage: number;
}

export interface ProjectControllingResult {
  filters: ProjectControllingFilters;
  oldestPublishedAt: string | null;
  latestPublishedAt: string | null;
  summary: ProjectControllingSummary;
  trend: ProjectControllingTrendPoint[];
  scopeOptions: ProjectControllingScopeOption[];
  rows: ProjectControllingRow[];
  completeness: ProjectControllingCompleteness;
}

export interface ProjectControllingRepository {
  listRows(filters: ProjectControllingFilters): Promise<readonly ProjectControllingRow[]>;
  listScopeOptions(
    filters: ProjectControllingFilters,
  ): Promise<readonly ProjectControllingScopeOption[]>;
}

export type ProjectControllingErrorCode =
  | "PROJECT_CONTROLLING_INVALID_DATE_RANGE"
  | "PROJECT_CONTROLLING_RANGE_TOO_LARGE"
  | "PROJECT_CONTROLLING_INVALID_SCOPE"
  | "PROJECT_CONTROLLING_TOO_MANY_ACTIVITIES";

export type ProjectControllingOutcome =
  | { ok: true; value: ProjectControllingResult }
  | { ok: false; error: ProjectControllingErrorCode };
