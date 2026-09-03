import {
  prepareSharedCustomerPublishBatch,
  prepareSharedOwnActivityPublishBatch,
  type SharedCustomerPublishBatch,
  type SharedProjectionSkip,
  type SharedProjectionUnresolved,
} from "@/lib/customer-data/shared-projection-contract";
import type { SharedDataMigrationPlan } from "@/lib/customer-data/types";

export interface SharedProjectRecord {
  projectionId: string;
  systemhouseId: string;
  customerId: string;
  sourceId: string;
  name: string;
  legacyClient: string;
  status: string;
  publishedBy: string;
  publishedAt: string;
  sourceRevision: number;
  sourceHash: string;
}

export interface SharedWorkPackageRecord {
  projectionId: string;
  systemhouseId: string;
  customerId: string;
  sourceId: string;
  projectSourceId: string | null;
  parentLinkStatus: "none" | "linked";
  title: string;
  legacyClient: string;
  status: string;
  priority: string;
  publishedBy: string;
  publishedAt: string;
  sourceRevision: number;
  sourceHash: string;
}

export interface SharedActivityRecord {
  projectionId: string;
  systemhouseId: string;
  customerId: string;
  sourceId: string;
  workPackageSourceId: string | null;
  parentLinkStatus: "none" | "linked";
  engineerId: string;
  title: string;
  legacyClient: string;
  date: string;
  duration: number;
  billable: boolean;
  billingStatus: string;
  publishedBy: string;
  publishedAt: string;
  sourceRevision: number;
  sourceHash: string;
}

export interface SharedCustomerProjectionSnapshot {
  systemhouseId: string;
  customerId: string;
  projects: SharedProjectRecord[];
  workPackages: SharedWorkPackageRecord[];
  activities: SharedActivityRecord[];
}

export interface SharedProjectionWriteCounts {
  upsertedProjects: number;
  upsertedWorkPackages: number;
  upsertedActivities: number;
  withdrawnProjects: number;
  withdrawnWorkPackages: number;
  withdrawnActivities: number;
}

export interface SharedProjectionPublishResult extends SharedProjectionWriteCounts {
  skipped: SharedProjectionSkip[];
  unresolved: SharedProjectionUnresolved[];
}

/**
 * Alle Source-IDs, die im aktuellen lokalen Snapshot tatsächlich vorkommen.
 *
 * Diese Menge ist bewusst größer als der publizierbare Batch: Ein vorhandenes
 * Objekt kann wegen Collision, unresolved Customer, Parent- oder Engineer-Regel
 * temporär nicht publizierbar sein. Das macht es noch nicht zu einer gelöschten
 * bzw. stale Source.
 */
export interface SharedProjectionObservedSources {
  projects: ReadonlySet<string>;
  workPackages: ReadonlySet<string>;
  activities: ReadonlySet<string>;
}

export interface SharedProjectionPublishScope {
  observedSources: SharedProjectionObservedSources;
  reconcileProjects: boolean;
  reconcileWorkPackages: boolean;
  reconcileActivities: boolean;
}

/**
 * Providerneutraler Persistenz-Port für BSF-02C.
 *
 * Die Domäne kennt weder Supabase noch HTTP/TanStack. Der aktive Provider muss
 * denselben Customer-/Publisher-Vertrag abbilden und darf die Datenbankgrenze
 * nicht mit privilegierten Client-Credentials umgehen.
 */
export interface SharedProjectionRepository {
  publish(
    batch: SharedCustomerPublishBatch,
    scope: SharedProjectionPublishScope,
  ): Promise<SharedProjectionWriteCounts>;
  readCustomer(input: {
    systemhouseId: string;
    customerId: string;
  }): Promise<SharedCustomerProjectionSnapshot>;
}

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function observedSources(plan: SharedDataMigrationPlan): SharedProjectionObservedSources {
  return {
    projects: new Set(plan.projects.map((entry) => entry.id)),
    workPackages: new Set(plan.workPackages.map((entry) => entry.id)),
    activities: new Set(plan.activities.map((entry) => entry.id)),
  };
}

function result(
  counts: SharedProjectionWriteCounts,
  batch: SharedCustomerPublishBatch,
): SharedProjectionPublishResult {
  return {
    ...counts,
    skipped: batch.skipped,
    unresolved: batch.unresolved,
  };
}

/**
 * Full-Structure-Publish für Benutzer mit `project.edit`.
 *
 * Für Soft Withdraw wird separat der vollständige lokale Source-Bestand
 * übergeben. Nur eine Source, die dort wirklich nicht mehr vorkommt, darf vom
 * aktuellen Publisher als stale zurückgezogen werden.
 */
export async function publishSharedCustomerProjection(
  repository: SharedProjectionRepository,
  input: {
    plan: SharedDataMigrationPlan;
    customerId: string;
    publisherUserId: string;
  },
): Promise<SharedProjectionPublishResult> {
  const batch = prepareSharedCustomerPublishBatch({
    plan: input.plan,
    customerId: input.customerId,
    publisherUserId: input.publisherUserId,
  });
  const counts = await repository.publish(batch, {
    observedSources: observedSources(input.plan),
    reconcileProjects: true,
    reconcileWorkPackages: true,
    reconcileActivities: true,
  });

  return result(counts, batch);
}

/**
 * Publish-Pfad für eigene Activities ohne gemeinsame Strukturautorität.
 *
 * Project/WorkPackage werden weder geschrieben noch reconciled. Verlinkte
 * Activities dürfen nur auf serverseitig bereits aktive WorkPackage-Sources
 * zeigen. Damit bleibt `project.edit` für gemeinsame Struktur zwingend, ohne
 * Engineers ihre eigene `activity.edit`-Leistung zu blockieren.
 */
export async function publishSharedOwnActivities(
  repository: SharedProjectionRepository,
  input: {
    plan: SharedDataMigrationPlan;
    customerId: string;
    publisherUserId: string;
    availableWorkPackageSourceIds: ReadonlySet<string>;
  },
): Promise<SharedProjectionPublishResult> {
  const batch = prepareSharedOwnActivityPublishBatch({
    plan: input.plan,
    customerId: input.customerId,
    publisherUserId: input.publisherUserId,
    availableWorkPackageSourceIds: input.availableWorkPackageSourceIds,
  });
  const counts = await repository.publish(batch, {
    observedSources: observedSources(input.plan),
    reconcileProjects: false,
    reconcileWorkPackages: false,
    reconcileActivities: true,
  });

  return result(counts, batch);
}

export async function readSharedCustomerProjection(
  repository: SharedProjectionRepository,
  input: { systemhouseId: string; customerId: string },
): Promise<SharedCustomerProjectionSnapshot> {
  return repository.readCustomer({
    systemhouseId: requireNonEmpty(input.systemhouseId, "systemhouseId"),
    customerId: requireNonEmpty(input.customerId, "customerId"),
  });
}
