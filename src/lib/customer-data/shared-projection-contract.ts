import type {
  SharedActivityProjection,
  SharedDataMigrationPlan,
  SharedProjectProjection,
  SharedWorkPackageProjection,
} from "@/lib/customer-data/types";

export type SharedProjectionEntityType = "project" | "workpackage" | "activity";

export type SharedProjectionSkipReason =
  | "source_id_collision"
  | "parent_missing"
  | "parent_unpublishable"
  | "engineer_missing"
  | "engineer_mismatch";

export interface SharedProjectionRef {
  entityType: SharedProjectionEntityType;
  sourceId: string;
}

export interface SharedProjectionSkip extends SharedProjectionRef {
  reason: SharedProjectionSkipReason;
  detail?: string;
}

export interface SharedProjectionUnresolved extends SharedProjectionRef {
  reason: "mapping_missing" | "missing_customer_context" | "customer_context_conflict";
}

export interface SharedCustomerPublishBatch {
  systemhouseId: string;
  customerId: string;
  publisherUserId: string;
  projects: SharedProjectProjection[];
  workPackages: SharedWorkPackageProjection[];
  activities: SharedActivityProjection[];
  skipped: SharedProjectionSkip[];
  unresolved: SharedProjectionUnresolved[];
}

interface ProjectionEntry {
  entityType: SharedProjectionEntityType;
  sourceId: string;
  customerId: string | null;
  resolved: boolean;
}

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

/**
 * Übergangsidentität der Shared Projection.
 *
 * `published_by` ist bewusst NICHT Bestandteil dieses Keys. Publisher ist
 * Provenance/Autorität, nicht fachliche Objektidentität.
 */
export function sharedProjectionIdentityKey(
  entityType: SharedProjectionEntityType,
  systemhouseId: string,
  customerId: string,
  sourceId: string,
): string {
  return [
    entityType,
    requireNonEmpty(systemhouseId, "systemhouseId"),
    requireNonEmpty(customerId, "customerId"),
    requireNonEmpty(sourceId, "sourceId"),
  ].join(":");
}

function allEntries(plan: SharedDataMigrationPlan): ProjectionEntry[] {
  return [
    ...plan.projects.map((entry) => ({
      entityType: "project" as const,
      sourceId: entry.id,
      customerId: entry.customerId,
      resolved: entry.customerResolution.status === "resolved",
    })),
    ...plan.workPackages.map((entry) => ({
      entityType: "workpackage" as const,
      sourceId: entry.id,
      customerId: entry.customerId,
      resolved: entry.customerResolution.status === "resolved",
    })),
    ...plan.activities.map((entry) => ({
      entityType: "activity" as const,
      sourceId: entry.id,
      customerId: entry.customerId,
      resolved: entry.customerResolution.status === "resolved",
    })),
  ];
}

/**
 * Source-IDs bleiben wegen AVKK stabil. Genau deshalb dürfen Kollisionen nicht
 * still zusammengeführt werden.
 *
 * Eine ID ist für BSF-02C kollidierend, wenn dieselbe Entity-Art + Source-ID
 * im selben Migrationsplan mehrfach vorkommt. Das gilt auch dann, wenn die
 * Zeilen verschiedenen Customers zugeordnet wären: `avkk_subject` referenziert
 * heute weiterhin nur `subject_type + subject_id` und könnte diese Fälle nicht
 * eindeutig unterscheiden.
 */
function collisionKeys(plan: SharedDataMigrationPlan): Set<string> {
  const occurrences = new Map<string, number>();

  for (const entry of allEntries(plan)) {
    if (!entry.resolved || !entry.customerId) continue;
    const key = `${entry.entityType}:${entry.sourceId}`;
    occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
  }

  return new Set([...occurrences.entries()].filter(([, count]) => count > 1).map(([key]) => key));
}

function isColliding(
  collisions: ReadonlySet<string>,
  entityType: SharedProjectionEntityType,
  sourceId: string,
): boolean {
  return collisions.has(`${entityType}:${sourceId}`);
}

function unresolvedEntries(plan: SharedDataMigrationPlan): SharedProjectionUnresolved[] {
  const unresolved: SharedProjectionUnresolved[] = [];

  const collect = (
    entityType: SharedProjectionEntityType,
    entries: ReadonlyArray<
      SharedProjectProjection | SharedWorkPackageProjection | SharedActivityProjection
    >,
  ) => {
    for (const entry of entries) {
      if (entry.customerResolution.status === "resolved") continue;
      unresolved.push({
        entityType,
        sourceId: entry.id,
        reason: entry.customerResolution.reason ?? "missing_customer_context",
      });
    }
  };

  collect("project", plan.projects);
  collect("workpackage", plan.workPackages);
  collect("activity", plan.activities);

  return unresolved;
}

/**
 * Bereitet einen providerneutralen Publish-Batch für genau einen Customer vor.
 *
 * Diese Funktion schreibt weder in Supabase noch in irgendeinen anderen
 * Provider. Sie bildet ausschließlich den fachlichen Fail-Closed-Contract ab,
 * den der spätere Supabase-/Azure-/SQL-Adapter konsumieren darf.
 */
export function prepareSharedCustomerPublishBatch(input: {
  plan: SharedDataMigrationPlan;
  customerId: string;
  publisherUserId: string;
}): SharedCustomerPublishBatch {
  const systemhouseId = requireNonEmpty(input.plan.systemhouseId, "systemhouseId");
  const customerId = requireNonEmpty(input.customerId, "customerId");
  const publisherUserId = requireNonEmpty(input.publisherUserId, "publisherUserId");
  const collisions = collisionKeys(input.plan);
  const skipped: SharedProjectionSkip[] = [];

  const projects = input.plan.projects.filter((entry) => {
    if (entry.customerResolution.status !== "resolved" || entry.customerId !== customerId) {
      return false;
    }
    if (isColliding(collisions, "project", entry.id)) {
      skipped.push({
        entityType: "project",
        sourceId: entry.id,
        reason: "source_id_collision",
      });
      return false;
    }
    return true;
  });

  const publishableProjectIds = new Set(projects.map((entry) => entry.id));

  const workPackages = input.plan.workPackages.filter((entry) => {
    if (entry.customerResolution.status !== "resolved" || entry.customerId !== customerId) {
      return false;
    }
    if (isColliding(collisions, "workpackage", entry.id)) {
      skipped.push({
        entityType: "workpackage",
        sourceId: entry.id,
        reason: "source_id_collision",
      });
      return false;
    }
    if (entry.projectLinkStatus === "missing") {
      skipped.push({
        entityType: "workpackage",
        sourceId: entry.id,
        reason: "parent_missing",
        detail: entry.projectId ?? undefined,
      });
      return false;
    }
    if (
      entry.projectLinkStatus === "linked" &&
      (!entry.projectId || !publishableProjectIds.has(entry.projectId))
    ) {
      skipped.push({
        entityType: "workpackage",
        sourceId: entry.id,
        reason: "parent_unpublishable",
        detail: entry.projectId ?? undefined,
      });
      return false;
    }
    return true;
  });

  const publishableWorkPackageIds = new Set(workPackages.map((entry) => entry.id));

  const activities = input.plan.activities.filter((entry) => {
    if (entry.customerResolution.status !== "resolved" || entry.customerId !== customerId) {
      return false;
    }
    if (isColliding(collisions, "activity", entry.id)) {
      skipped.push({
        entityType: "activity",
        sourceId: entry.id,
        reason: "source_id_collision",
      });
      return false;
    }
    if (entry.workPackageLinkStatus === "missing") {
      skipped.push({
        entityType: "activity",
        sourceId: entry.id,
        reason: "parent_missing",
        detail: entry.workPackageId ?? undefined,
      });
      return false;
    }
    if (
      entry.workPackageLinkStatus === "linked" &&
      (!entry.workPackageId || !publishableWorkPackageIds.has(entry.workPackageId))
    ) {
      skipped.push({
        entityType: "activity",
        sourceId: entry.id,
        reason: "parent_unpublishable",
        detail: entry.workPackageId ?? undefined,
      });
      return false;
    }
    if (!entry.engineerId?.trim()) {
      skipped.push({
        entityType: "activity",
        sourceId: entry.id,
        reason: "engineer_missing",
      });
      return false;
    }
    if (entry.engineerId !== publisherUserId) {
      skipped.push({
        entityType: "activity",
        sourceId: entry.id,
        reason: "engineer_mismatch",
      });
      return false;
    }
    return true;
  });

  return {
    systemhouseId,
    customerId,
    publisherUserId,
    projects,
    workPackages,
    activities,
    skipped,
    unresolved: unresolvedEntries(input.plan),
  };
}

/**
 * Activity-only Runtime-Variante für Rollen ohne `project.edit`.
 *
 * Der Struktur-Publish bleibt unverändert streng: Project/WorkPackage werden
 * hier nie veröffentlicht. Eine verlinkte Activity ist nur zulässig, wenn ihr
 * WorkPackage bereits als aktive Shared Projection für denselben Customer
 * serverseitig sichtbar ist. Damit kann ein Engineer seine eigene Leistung
 * veröffentlichen, ohne gemeinsame Strukturautorität zu erhalten.
 */
export function prepareSharedOwnActivityPublishBatch(input: {
  plan: SharedDataMigrationPlan;
  customerId: string;
  publisherUserId: string;
  availableWorkPackageSourceIds: ReadonlySet<string>;
}): SharedCustomerPublishBatch {
  const systemhouseId = requireNonEmpty(input.plan.systemhouseId, "systemhouseId");
  const customerId = requireNonEmpty(input.customerId, "customerId");
  const publisherUserId = requireNonEmpty(input.publisherUserId, "publisherUserId");
  const collisions = collisionKeys(input.plan);
  const skipped: SharedProjectionSkip[] = [];

  const activities = input.plan.activities.filter((entry) => {
    if (entry.customerResolution.status !== "resolved" || entry.customerId !== customerId) {
      return false;
    }
    if (isColliding(collisions, "activity", entry.id)) {
      skipped.push({
        entityType: "activity",
        sourceId: entry.id,
        reason: "source_id_collision",
      });
      return false;
    }
    if (entry.workPackageLinkStatus === "missing") {
      skipped.push({
        entityType: "activity",
        sourceId: entry.id,
        reason: "parent_missing",
        detail: entry.workPackageId ?? undefined,
      });
      return false;
    }
    if (
      entry.workPackageLinkStatus === "linked" &&
      (!entry.workPackageId || !input.availableWorkPackageSourceIds.has(entry.workPackageId))
    ) {
      skipped.push({
        entityType: "activity",
        sourceId: entry.id,
        reason: "parent_unpublishable",
        detail: entry.workPackageId ?? undefined,
      });
      return false;
    }
    if (!entry.engineerId?.trim()) {
      skipped.push({
        entityType: "activity",
        sourceId: entry.id,
        reason: "engineer_missing",
      });
      return false;
    }
    if (entry.engineerId !== publisherUserId) {
      skipped.push({
        entityType: "activity",
        sourceId: entry.id,
        reason: "engineer_mismatch",
      });
      return false;
    }
    return true;
  });

  return {
    systemhouseId,
    customerId,
    publisherUserId,
    projects: [],
    workPackages: [],
    activities,
    skipped,
    unresolved: unresolvedEntries(input.plan),
  };
}
