import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, Tables } from "@/integrations/supabase/types";
import type { SharedCustomerPublishBatch } from "@/lib/customer-data/shared-projection-contract";
import type {
  SharedActivityRecord,
  SharedCustomerProjectionSnapshot,
  SharedProjectionPublishScope,
  SharedProjectionRepository,
  SharedProjectionWriteCounts,
  SharedProjectRecord,
  SharedWorkPackageRecord,
} from "@/lib/customer-data/shared-projection-runtime";

type ProjectRow = Tables<"shared_project_projection">;
type WorkPackageRow = Tables<"shared_work_package_projection">;
type ActivityRow = Tables<"shared_activity_projection">;

type PublishMode = "structure" | "activities";

function fail(operation: string): never {
  throw new Error(`Shared Projection: ${operation} fehlgeschlagen.`);
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function publishMode(scope: SharedProjectionPublishScope): PublishMode {
  if (
    scope.reconcileProjects &&
    scope.reconcileWorkPackages &&
    scope.reconcileActivities
  ) {
    return "structure";
  }

  if (
    !scope.reconcileProjects &&
    !scope.reconcileWorkPackages &&
    scope.reconcileActivities
  ) {
    return "activities";
  }

  throw new Error(
    "Shared Projection: Publish-Scope passt nicht zum transaktionalen RPC-Vertrag.",
  );
}

function sortedSourceIds(values: ReadonlySet<string>): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

async function projectPayload(batch: SharedCustomerPublishBatch): Promise<Json[]> {
  return Promise.all(
    batch.projects.map(async (project) => ({
      source_id: project.id,
      name: project.name,
      legacy_client: project.legacyClient,
      status: project.status,
      source_hash: await sha256({
        name: project.name,
        legacyClient: project.legacyClient,
        status: project.status,
      }),
    })),
  );
}

async function workPackagePayload(batch: SharedCustomerPublishBatch): Promise<Json[]> {
  return Promise.all(
    batch.workPackages.map(async (workPackage) => ({
      source_id: workPackage.id,
      project_source_id:
        workPackage.projectLinkStatus === "linked" ? (workPackage.projectId ?? "") : null,
      parent_link_status: workPackage.projectLinkStatus,
      title: workPackage.title,
      legacy_client: workPackage.legacyClient ?? "",
      status: workPackage.status,
      priority: workPackage.priority,
      source_hash: await sha256({
        projectId: workPackage.projectId,
        title: workPackage.title,
        legacyClient: workPackage.legacyClient ?? "",
        status: workPackage.status,
        priority: workPackage.priority,
      }),
    })),
  );
}

async function activityPayload(batch: SharedCustomerPublishBatch): Promise<Json[]> {
  return Promise.all(
    batch.activities.map(async (activity) => ({
      source_id: activity.id,
      work_package_source_id:
        activity.workPackageLinkStatus === "linked" ? (activity.workPackageId ?? "") : null,
      parent_link_status: activity.workPackageLinkStatus,
      engineer_id: activity.engineerId ?? null,
      title: activity.title,
      legacy_client: activity.legacyClient ?? "",
      activity_date: activity.date,
      duration_hours: activity.duration,
      billable: activity.billable,
      billing_status: activity.billingStatus,
      source_hash: await sha256({
        workPackageId: activity.workPackageId,
        engineerId: activity.engineerId,
        title: activity.title,
        legacyClient: activity.legacyClient ?? "",
        date: activity.date,
        duration: activity.duration,
        billable: activity.billable,
        billingStatus: activity.billingStatus,
      }),
    })),
  );
}

function count(result: { [key: string]: Json | undefined }, key: string): number {
  const value = result[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    fail("ungültige RPC-Antwort");
  }
  return value;
}

function writeCounts(data: Json | null): SharedProjectionWriteCounts {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    fail("ungültige RPC-Antwort");
  }

  return {
    upsertedProjects: count(data, "projects_published"),
    upsertedWorkPackages: count(data, "work_packages_published"),
    upsertedActivities: count(data, "activities_published"),
    withdrawnProjects: count(data, "projects_withdrawn"),
    withdrawnWorkPackages: count(data, "work_packages_withdrawn"),
    withdrawnActivities: count(data, "activities_withdrawn"),
  };
}

function toProject(row: ProjectRow): SharedProjectRecord {
  return {
    projectionId: row.id,
    systemhouseId: row.systemhouse_id,
    customerId: row.customer_id,
    sourceId: row.source_id,
    name: row.name,
    legacyClient: row.legacy_client,
    status: row.status,
    publishedBy: row.published_by,
    publishedAt: row.published_at,
    sourceRevision: row.source_revision,
    sourceHash: row.source_hash,
  };
}

function toWorkPackage(row: WorkPackageRow): SharedWorkPackageRecord {
  return {
    projectionId: row.id,
    systemhouseId: row.systemhouse_id,
    customerId: row.customer_id,
    sourceId: row.source_id,
    projectSourceId: row.project_source_id,
    parentLinkStatus: row.parent_link_status === "linked" ? "linked" : "none",
    title: row.title,
    legacyClient: row.legacy_client,
    status: row.status,
    priority: row.priority,
    publishedBy: row.published_by,
    publishedAt: row.published_at,
    sourceRevision: row.source_revision,
    sourceHash: row.source_hash,
  };
}

function toActivity(row: ActivityRow): SharedActivityRecord {
  return {
    projectionId: row.id,
    systemhouseId: row.systemhouse_id,
    customerId: row.customer_id,
    sourceId: row.source_id,
    workPackageSourceId: row.work_package_source_id,
    parentLinkStatus: row.parent_link_status === "linked" ? "linked" : "none",
    engineerId: row.engineer_id,
    title: row.title,
    legacyClient: row.legacy_client,
    date: row.activity_date,
    duration: row.duration_hours,
    billable: row.billable,
    billingStatus: row.billing_status,
    publishedBy: row.published_by,
    publishedAt: row.published_at,
    sourceRevision: row.source_revision,
    sourceHash: row.source_hash,
  };
}

export function createSupabaseSharedProjectionRepository(
  client: SupabaseClient<Database>,
): SharedProjectionRepository {
  return {
    async publish(
      batch,
      scope: SharedProjectionPublishScope,
    ): Promise<SharedProjectionWriteCounts> {
      const mode = publishMode(scope);
      const [projects, workPackages, activities] = await Promise.all([
        projectPayload(batch),
        workPackagePayload(batch),
        activityPayload(batch),
      ]);

      if (mode === "activities" && (projects.length > 0 || workPackages.length > 0)) {
        throw new Error(
          "Shared Projection: Activity-only-Publish darf keine Struktur-Payload enthalten.",
        );
      }

      const { data, error } = await client.rpc("bsf02c_publish_shared_projection_snapshot", {
        p_systemhouse_id: batch.systemhouseId,
        p_customer_id: batch.customerId,
        p_mode: mode,
        p_snapshot_complete: true,
        p_projects: projects,
        p_work_packages: workPackages,
        p_activities: activities,
        p_observed_project_source_ids:
          mode === "structure" ? sortedSourceIds(scope.observedSources.projects) : [],
        p_observed_work_package_source_ids:
          mode === "structure" ? sortedSourceIds(scope.observedSources.workPackages) : [],
        p_observed_activity_source_ids: sortedSourceIds(scope.observedSources.activities),
      });

      if (error) fail("atomarer Snapshot-Publish");
      return writeCounts(data);
    },

    async readCustomer(input): Promise<SharedCustomerProjectionSnapshot> {
      const [projectsResult, workPackagesResult, activitiesResult] = await Promise.all([
        client
          .from("shared_project_projection")
          .select("*")
          .eq("systemhouse_id", input.systemhouseId)
          .eq("customer_id", input.customerId)
          .eq("is_active", true)
          .order("source_id", { ascending: true }),
        client
          .from("shared_work_package_projection")
          .select("*")
          .eq("systemhouse_id", input.systemhouseId)
          .eq("customer_id", input.customerId)
          .eq("is_active", true)
          .order("source_id", { ascending: true }),
        client
          .from("shared_activity_projection")
          .select("*")
          .eq("systemhouse_id", input.systemhouseId)
          .eq("customer_id", input.customerId)
          .eq("is_active", true)
          .order("activity_date", { ascending: false })
          .order("source_id", { ascending: true }),
      ]);

      if (projectsResult.error || workPackagesResult.error || activitiesResult.error) {
        fail("Customer-Projektion lesen");
      }

      return {
        systemhouseId: input.systemhouseId,
        customerId: input.customerId,
        projects: ((projectsResult.data ?? []) as ProjectRow[]).map(toProject),
        workPackages: ((workPackagesResult.data ?? []) as WorkPackageRow[]).map(toWorkPackage),
        activities: ((activitiesResult.data ?? []) as ActivityRow[]).map(toActivity),
      };
    },
  };
}
