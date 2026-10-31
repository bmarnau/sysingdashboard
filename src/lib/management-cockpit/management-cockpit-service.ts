import type {
  ProjectControllingCompleteness,
  ProjectControllingFreshness,
  ProjectControllingRow,
} from "@/lib/project-controlling/project-controlling-contract";
import type { ManagementSummary } from "@/lib/avkk/management";
import type { MyCustomerSummary } from "@/lib/customer-data/my-customers";
import type { WorkPackageWorkViewRow } from "@/lib/avkk/work-package-work-view.types";

export type ManagementDataState =
  | "AVAILABLE"
  | "EMPTY"
  | "PARTIAL"
  | "UNKNOWN"
  | "UNAVAILABLE"
  | "DENIED";

export type ManagementRolePreview =
  | "SYSTEM_ENGINEER"
  | "CUSTOMER_OWNER"
  | "PROJECT_MANAGER"
  | "TEAM_LEAD"
  | "ADMINISTRATION";

const ROLE_PREVIEWS: readonly ManagementRolePreview[] = [
  "SYSTEM_ENGINEER",
  "CUSTOMER_OWNER",
  "PROJECT_MANAGER",
  "TEAM_LEAD",
  "ADMINISTRATION",
];

export type ManagementSection<T> =
  | { state: Exclude<ManagementDataState, "AVAILABLE" | "PARTIAL"> }
  | { state: "AVAILABLE" | "PARTIAL"; value: T };

export interface ProjectControllingManagementValue {
  rows: readonly ProjectControllingRow[];
  completeness: ProjectControllingCompleteness;
  freshness: ProjectControllingFreshness;
}

export interface ProjectBridge {
  systemhouseId: string;
  customerId: string;
  projectSourceId: string;
  workPackageSourceId: string;
}

export interface ManagementCockpitInput {
  referenceInstant: string;
  /** Display-only mode over already authorised input; it never changes scope. */
  rolePreview?: ManagementRolePreview;
  projectControlling: ManagementSection<ProjectControllingManagementValue>;
  avkk: ManagementSection<ManagementSummary>;
  customers: ManagementSection<readonly MyCustomerSummary[]>;
  workPackages: ManagementSection<readonly WorkPackageWorkViewRow[]>;
  projectBridges: readonly ProjectBridge[];
}

export type AttentionCorrelation = "CORRELATED" | "NOT_CORRELATABLE" | "AMBIGUOUS";

export interface ProjectAttention {
  systemhouseId: string;
  customerId: string;
  projectSourceId: string;
  projectName: string;
  workPackageSourceId?: string;
  reason: "CATEGORY_UNKNOWN" | "CATEGORY_UNOBSERVED";
  correlation: AttentionCorrelation;
  provenance: readonly ["PROJECT_CONTROLLING"];
}

export interface ManagementCockpit {
  referenceInstant: string;
  rolePreview?: ManagementRolePreview;
  projectControlling: ManagementSection<ProjectControllingManagementValue>;
  avkk: ManagementSection<ManagementSummary>;
  customers: ManagementSection<readonly MyCustomerSummary[]>;
  workPackages: ManagementSection<readonly WorkPackageWorkViewRow[]>;
  attention: readonly ProjectAttention[];
}

function isPartial(completeness: ProjectControllingCompleteness): boolean {
  return Object.values(completeness).some((count) => count > 0);
}

function sanitizeSection<T>(section: ManagementSection<T>): ManagementSection<T> {
  if (section.state === "AVAILABLE" || section.state === "PARTIAL") return section;
  return { state: section.state };
}

function sanitizeRolePreview(value: unknown): ManagementRolePreview | undefined {
  return ROLE_PREVIEWS.includes(value as ManagementRolePreview)
    ? (value as ManagementRolePreview)
    : undefined;
}

function bridgeMatches(row: ProjectControllingRow, bridge: ProjectBridge): boolean {
  return (
    row.projectSourceId !== null &&
    row.workPackageSourceId !== null &&
    bridge.systemhouseId === row.systemhouseId &&
    bridge.customerId === row.customerId &&
    bridge.projectSourceId === row.projectSourceId &&
    bridge.workPackageSourceId === row.workPackageSourceId
  );
}

function attentionFor(
  row: ProjectControllingRow,
  bridges: readonly ProjectBridge[],
): ProjectAttention | null {
  if (!row.projectSourceId || !row.projectName || !row.workPackageSourceId) return null;
  const reason =
    row.categoryState === "unknown"
      ? "CATEGORY_UNKNOWN"
      : row.categoryState === "unobserved"
        ? "CATEGORY_UNOBSERVED"
        : null;
  if (!reason) return null;
  const matches = bridges.filter((bridge) => bridgeMatches(row, bridge));
  const correlation: AttentionCorrelation =
    matches.length === 1 ? "CORRELATED" : matches.length === 0 ? "NOT_CORRELATABLE" : "AMBIGUOUS";
  return {
    systemhouseId: row.systemhouseId,
    customerId: row.customerId,
    projectSourceId: row.projectSourceId,
    projectName: row.projectName,
    ...(correlation === "CORRELATED" ? { workPackageSourceId: row.workPackageSourceId } : {}),
    reason,
    correlation,
    provenance: ["PROJECT_CONTROLLING"],
  };
}

function distinctAttention(items: readonly ProjectAttention[]): ProjectAttention[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = [
      item.systemhouseId,
      item.customerId,
      item.projectSourceId,
      item.workPackageSourceId ?? "",
      item.reason,
      item.correlation,
    ].join("::");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function composeManagementCockpit(input: ManagementCockpitInput): ManagementCockpit {
  const source = sanitizeSection(input.projectControlling);
  const rolePreview = sanitizeRolePreview(input.rolePreview);
  const avkk = sanitizeSection(input.avkk);
  const customers = sanitizeSection(input.customers);
  const workPackages = sanitizeSection(input.workPackages);
  if (source.state !== "AVAILABLE" && source.state !== "PARTIAL") {
    return {
      referenceInstant: input.referenceInstant,
      ...(rolePreview ? { rolePreview } : {}),
      projectControlling: source,
      avkk,
      customers,
      workPackages,
      attention: [],
    };
  }
  const projectControlling: ManagementSection<ProjectControllingManagementValue> = {
    state: isPartial(source.value.completeness) ? "PARTIAL" : "AVAILABLE",
    value: source.value,
  };
  const attention = distinctAttention(
    source.value.rows
      .map((row) => attentionFor(row, input.projectBridges))
      .filter((row): row is ProjectAttention => row !== null),
  );
  return {
    referenceInstant: input.referenceInstant,
    ...(rolePreview ? { rolePreview } : {}),
    projectControlling,
    avkk,
    customers,
    workPackages,
    attention,
  };
}
