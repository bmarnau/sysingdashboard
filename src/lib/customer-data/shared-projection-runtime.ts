import {
  prepareSharedCustomerPublishBatch,
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
 * Providerneutraler Persistenz-Port für BSF-02C.
 *
 * Die Domäne kennt weder Supabase noch HTTP/TanStack. Der aktive Provider muss
 * denselben Customer-/Publisher-Vertrag abbilden und darf die Datenbankgrenze
 * nicht mit privilegierten Client-Credentials umgehen.
 */
export interface SharedProjectionRepository {
  publish(batch: SharedCustomerPublishBatch): Promise<SharedProjectionWriteCounts>;
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

/**
 * Rechnet den Fail-Closed-Publish-Vertrag erneut im Serverpfad aus und reicht
 * nur den daraus resultierenden Batch an den Provider weiter.
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
  const counts = await repository.publish(batch);

  return {
    ...counts,
    skipped: batch.skipped,
    unresolved: batch.unresolved,
  };
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
