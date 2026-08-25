import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";
import type {
  CustomerCandidate,
  CustomerResolution,
  CustomerSourceRef,
  LegacyCustomerMapping,
  ParentLinkStatus,
  SharedDataMigrationInput,
  SharedDataMigrationPlan,
} from "@/lib/customer-data/types";

interface MutableCandidate {
  observedNames: Set<string>;
  sourceRefs: CustomerSourceRef[];
}

export function normalizeLegacyCustomerName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildMappingIndex(mappings: readonly LegacyCustomerMapping[]): Map<string, string> {
  const index = new Map<string, string>();

  for (const mapping of mappings) {
    const normalized = normalizeLegacyCustomerName(mapping.legacyName);
    const customerId = mapping.customerId.trim();
    if (!normalized) throw new Error("Customer mapping requires a legacyName");
    if (!customerId) throw new Error(`Customer mapping for "${mapping.legacyName}" requires customerId`);

    const existing = index.get(normalized);
    if (existing && existing !== customerId) {
      throw new Error(`Conflicting customer mapping for normalized name "${normalized}"`);
    }
    index.set(normalized, customerId);
  }

  return index;
}

function addCandidate(
  candidates: Map<string, MutableCandidate>,
  legacyName: string | undefined,
  sourceRef: CustomerSourceRef,
): void {
  const observed = legacyName?.trim();
  if (!observed) return;

  const normalized = normalizeLegacyCustomerName(observed);
  if (!normalized) return;

  const candidate = candidates.get(normalized) ?? {
    observedNames: new Set<string>(),
    sourceRefs: [],
  };
  candidate.observedNames.add(observed);
  candidate.sourceRefs.push(sourceRef);
  candidates.set(normalized, candidate);
}

function buildCandidates(
  projects: readonly Project[],
  workPackages: readonly WorkPackage[],
  activities: readonly Activity[],
  mappingIndex: ReadonlyMap<string, string>,
): CustomerCandidate[] {
  const candidates = new Map<string, MutableCandidate>();

  for (const project of projects) {
    addCandidate(candidates, project.client, { entityType: "project", entityId: project.id });
  }
  for (const workPackage of workPackages) {
    addCandidate(candidates, workPackage.client, {
      entityType: "workpackage",
      entityId: workPackage.id,
    });
  }
  for (const activity of activities) {
    addCandidate(candidates, activity.client, { entityType: "activity", entityId: activity.id });
  }

  return [...candidates.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([normalizedLegacyName, candidate]) => ({
      normalizedLegacyName,
      observedNames: [...candidate.observedNames].sort(),
      sourceRefs: candidate.sourceRefs,
      mappedCustomerId: mappingIndex.get(normalizedLegacyName),
    }));
}

function resolveCustomer(
  names: ReadonlyArray<string | undefined>,
  mappingIndex: ReadonlyMap<string, string>,
): CustomerResolution {
  const observedByNormalized = new Map<string, Set<string>>();

  for (const name of names) {
    const observed = name?.trim();
    if (!observed) continue;
    const normalized = normalizeLegacyCustomerName(observed);
    if (!normalized) continue;
    const values = observedByNormalized.get(normalized) ?? new Set<string>();
    values.add(observed);
    observedByNormalized.set(normalized, values);
  }

  const observedNames = [...observedByNormalized.values()]
    .flatMap((values) => [...values])
    .sort();

  if (observedByNormalized.size === 0) {
    return {
      status: "unresolved",
      customerId: null,
      normalizedLegacyName: null,
      observedNames,
      reason: "missing_customer_context",
    };
  }

  if (observedByNormalized.size > 1) {
    return {
      status: "unresolved",
      customerId: null,
      normalizedLegacyName: null,
      observedNames,
      reason: "customer_context_conflict",
    };
  }

  const [normalizedLegacyName] = observedByNormalized.keys();
  const customerId = mappingIndex.get(normalizedLegacyName);
  if (!customerId) {
    return {
      status: "unresolved",
      customerId: null,
      normalizedLegacyName,
      observedNames,
      reason: "mapping_missing",
    };
  }

  return {
    status: "resolved",
    customerId,
    normalizedLegacyName,
    observedNames,
  };
}

function linkStatus(parentId: string | null | undefined, parentExists: boolean): ParentLinkStatus {
  if (!parentId) return "none";
  return parentExists ? "linked" : "missing";
}

export function buildSharedDataMigrationPlan(input: SharedDataMigrationInput): SharedDataMigrationPlan {
  const systemhouseId = input.systemhouseId.trim();
  if (!systemhouseId) throw new Error("systemhouseId is required");

  const mappingIndex = buildMappingIndex(input.customerMappings);
  const projectById = new Map(input.projects.map((project) => [project.id, project]));
  const workPackageById = new Map(
    input.workPackages.map((workPackage) => [workPackage.id, workPackage]),
  );

  const projects = input.projects.map((project) => {
    const customerResolution = resolveCustomer([project.client], mappingIndex);
    return {
      id: project.id,
      systemhouseId,
      customerId: customerResolution.customerId,
      customerResolution,
      name: project.name,
      legacyClient: project.client,
      status: project.status,
    };
  });

  const workPackages = input.workPackages.map((workPackage) => {
    const projectId = workPackage.projectId ?? null;
    const project = projectId ? projectById.get(projectId) : undefined;
    const customerResolution = resolveCustomer([workPackage.client, project?.client], mappingIndex);
    return {
      id: workPackage.id,
      systemhouseId,
      customerId: customerResolution.customerId,
      customerResolution,
      projectId,
      projectLinkStatus: linkStatus(projectId, Boolean(project)),
      title: workPackage.title,
      legacyClient: workPackage.client,
      status: workPackage.status,
      priority: workPackage.priority,
    };
  });

  const activities = input.activities.map((activity) => {
    const workPackageId = activity.workPackageId ?? null;
    const workPackage = workPackageId ? workPackageById.get(workPackageId) : undefined;
    const project = workPackage?.projectId ? projectById.get(workPackage.projectId) : undefined;
    const customerResolution = resolveCustomer(
      [activity.client, workPackage?.client, project?.client],
      mappingIndex,
    );
    return {
      id: activity.id,
      systemhouseId,
      customerId: customerResolution.customerId,
      customerResolution,
      workPackageId,
      workPackageLinkStatus: linkStatus(workPackageId, Boolean(workPackage)),
      engineerId: activity.engineerId,
      title: activity.title,
      legacyClient: activity.client,
      date: activity.date,
      duration: activity.duration,
      billable: activity.billable,
      billingStatus: activity.billingStatus,
    };
  });

  const unresolvedCount = [...projects, ...workPackages, ...activities].filter(
    (entry) => entry.customerResolution.status === "unresolved",
  ).length;

  return {
    systemhouseId,
    customerCandidates: buildCandidates(
      input.projects,
      input.workPackages,
      input.activities,
      mappingIndex,
    ),
    projects,
    workPackages,
    activities,
    unresolvedCount,
  };
}
