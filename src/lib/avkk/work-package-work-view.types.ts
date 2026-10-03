export type DueGroup = "OVERDUE" | "TODAY" | "FUTURE" | "NO_DUE_DATE";
export type WorkPackageResponsibilityRole = "owner" | "deputy";

export interface WorkPackagePerson {
  personId: string;
  displayName: string;
}

export interface WorkPackageResponsibility extends WorkPackagePerson {
  role: WorkPackageResponsibilityRole;
}

export interface WorkPackageWorkViewSourceRow {
  workPackageId: string;
  sourceId: string;
  systemhouseId: string;
  customerId: string;
  customerName: string;
  title: string;
  status: string;
  due: string | null;
  responsibilities: readonly WorkPackageResponsibility[];
}

export interface WorkPackageWorkViewRow {
  workPackageId: string;
  sourceId: string;
  systemhouseId: string;
  customerId: string;
  customerName: string;
  title: string;
  status: string;
  due: string | null;
  dueGroup: DueGroup;
  owner: WorkPackagePerson | "UNASSIGNED";
  deputies: readonly WorkPackagePerson[];
  asOfDate: string;
}

export interface WorkPackageWorkViewFilters {
  text?: string;
  customerIds?: readonly string[];
  ownerIds?: readonly string[];
  status?: readonly string[];
  dueGroups?: readonly DueGroup[];
}

export type WorkPackageWorkViewGroupBy = "customer" | "owner" | "due";
export type WorkPackageWorkViewSortBy = "due" | "title" | "customer" | "owner";
export type WorkPackageWorkViewSortDirection = "asc" | "desc";

export interface WorkPackageWorkViewSelection {
  filters?: WorkPackageWorkViewFilters;
  groupBy: WorkPackageWorkViewGroupBy;
  sortBy: WorkPackageWorkViewSortBy;
  sortDirection: WorkPackageWorkViewSortDirection;
}

export interface WorkPackageWorkViewGroup {
  key: string;
  rows: readonly WorkPackageWorkViewRow[];
}

export interface WorkPackageWorkViewRepository {
  listAuthorizedWorkPackages(
    referenceInstant: string,
  ): Promise<readonly WorkPackageWorkViewSourceRow[]>;
}
