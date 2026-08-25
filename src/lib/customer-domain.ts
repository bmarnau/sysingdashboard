export type CustomerStatus = "active" | "inactive" | "archived";

export interface SystemhouseRef {
  id: string;
  displayName: string;
  status: CustomerStatus;
}

export interface Customer {
  id: string;
  systemhouseId: string;
  displayName: string;
  status: CustomerStatus;
}

export interface LegacyCustomerProjectRef {
  id: string;
  client?: string;
}

export interface LegacyCustomerCandidate {
  normalizedName: string;
  displayNames: string[];
  projectIds: string[];
  ambiguous: boolean;
}

const MAX_ID_LENGTH = 128;

export function assertDomainId(value: string, field: "systemhouseId" | "customerId"): string {
  const id = value.trim();
  if (!id) throw new Error(`${field} must not be empty`);
  if (id.length > MAX_ID_LENGTH) throw new Error(`${field} exceeds ${MAX_ID_LENGTH} characters`);
  return id;
}

export function normalizeCustomerDisplayName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function customerScope(systemhouseId: string, customerId: string): string {
  return `systemhouse:${assertDomainId(systemhouseId, "systemhouseId")}/customer:${assertDomainId(customerId, "customerId")}`;
}

export function groupLegacyCustomerCandidates(
  projects: readonly LegacyCustomerProjectRef[],
): LegacyCustomerCandidate[] {
  const grouped = new Map<
    string,
    { displayNames: Set<string>; projectIds: string[] }
  >();

  for (const project of projects) {
    const displayName = project.client?.trim();
    if (!displayName) continue;

    const normalizedName = normalizeCustomerDisplayName(displayName);
    if (!normalizedName) continue;

    const current = grouped.get(normalizedName) ?? {
      displayNames: new Set<string>(),
      projectIds: [],
    };
    current.displayNames.add(displayName);
    current.projectIds.push(project.id);
    grouped.set(normalizedName, current);
  }

  return Array.from(grouped.entries())
    .map(([normalizedName, value]) => {
      const displayNames = Array.from(value.displayNames).sort((a, b) => a.localeCompare(b));
      return {
        normalizedName,
        displayNames,
        projectIds: [...value.projectIds].sort((a, b) => a.localeCompare(b)),
        ambiguous: displayNames.length > 1,
      } satisfies LegacyCustomerCandidate;
    })
    .sort((a, b) => a.normalizedName.localeCompare(b.normalizedName));
}
