import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";

export type CustomerResolutionStatus = "resolved" | "unresolved";
export type CustomerResolutionReason =
  | "mapping_missing"
  | "missing_customer_context"
  | "customer_context_conflict";

export type ParentLinkStatus = "linked" | "none" | "missing";
export type CustomerSourceType = "project" | "workpackage" | "activity";

export interface LegacyCustomerMapping {
  legacyName: string;
  customerId: string;
}

export interface CustomerSourceRef {
  entityType: CustomerSourceType;
  entityId: string;
}

export interface CustomerCandidate {
  normalizedLegacyName: string;
  observedNames: string[];
  sourceRefs: CustomerSourceRef[];
  mappedCustomerId?: string;
}

export interface CustomerResolution {
  status: CustomerResolutionStatus;
  customerId: string | null;
  normalizedLegacyName: string | null;
  observedNames: string[];
  reason?: CustomerResolutionReason;
}

export interface SharedProjectProjection {
  id: string;
  systemhouseId: string;
  customerId: string | null;
  customerResolution: CustomerResolution;
  name: string;
  legacyClient: string;
  status: Project["status"];
}

export interface SharedWorkPackageProjection {
  id: string;
  systemhouseId: string;
  customerId: string | null;
  customerResolution: CustomerResolution;
  projectId: string | null;
  projectLinkStatus: ParentLinkStatus;
  title: string;
  legacyClient?: string;
  status: WorkPackage["status"];
  priority: WorkPackage["priority"];
}

export interface SharedActivityProjection {
  id: string;
  systemhouseId: string;
  customerId: string | null;
  customerResolution: CustomerResolution;
  workPackageId: string | null;
  workPackageLinkStatus: ParentLinkStatus;
  engineerId?: string;
  title: string;
  legacyClient?: string;
  date: string;
  duration: number;
  billable: boolean;
  billingStatus: Activity["billingStatus"];
}

export interface SharedDataMigrationInput {
  systemhouseId: string;
  projects: readonly Project[];
  workPackages: readonly WorkPackage[];
  activities: readonly Activity[];
  customerMappings: readonly LegacyCustomerMapping[];
}

export interface SharedDataMigrationPlan {
  systemhouseId: string;
  customerCandidates: CustomerCandidate[];
  projects: SharedProjectProjection[];
  workPackages: SharedWorkPackageProjection[];
  activities: SharedActivityProjection[];
  unresolvedCount: number;
}
