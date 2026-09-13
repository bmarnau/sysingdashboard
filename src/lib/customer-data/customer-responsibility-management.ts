/** BSF-03 P5 — providerneutraler Fachvertrag für die Kundenverantwortungsverwaltung. */

export interface ManageableSystemhouse {
  systemhouseId: string;
  name: string;
}

export interface ResponsibilityAssignment {
  id: string;
  userId: string;
  displayName: string;
  responsibleSince: string;
}

export interface ResponsibilityManagementCustomer {
  systemhouseId: string;
  customerId: string;
  name: string;
  status: string;
  responsibility: ResponsibilityAssignment | null;
}

export interface ResponsibilityCandidate {
  userId: string;
  displayName: string;
}

export interface CustomerResponsibilityManagementRepository {
  listManageableSystemhouses(userId: string): Promise<ManageableSystemhouse[]>;
  listCustomers(systemhouseId: string): Promise<ResponsibilityManagementCustomer[]>;
  listCandidates(systemhouseId: string): Promise<ResponsibilityCandidate[]>;
  setResponsibility(input: {
    systemhouseId: string;
    customerId: string;
    targetUserId: string;
  }): Promise<string>;
  endResponsibility(input: { systemhouseId: string; customerId: string }): Promise<boolean>;
}

export function normalizeResponsibilityCustomers(
  rows: readonly ResponsibilityManagementCustomer[],
): ResponsibilityManagementCustomer[] {
  return [...rows].sort(
    (a, b) => a.name.localeCompare(b.name, "de") || a.customerId.localeCompare(b.customerId),
  );
}

export function normalizeResponsibilityCandidates(
  rows: readonly ResponsibilityCandidate[],
): ResponsibilityCandidate[] {
  const byId = new Map<string, ResponsibilityCandidate>();
  for (const row of rows) {
    if (!byId.has(row.userId)) byId.set(row.userId, row);
  }
  return [...byId.values()].sort(
    (a, b) => a.displayName.localeCompare(b.displayName, "de") || a.userId.localeCompare(b.userId),
  );
}
