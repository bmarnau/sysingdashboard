import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SharedActivityRecord,
  SharedCustomerProjectionSnapshot,
  SharedProjectionRepository,
  SharedProjectionWriteCounts,
  SharedProjectRecord,
  SharedWorkPackageRecord,
} from "@/lib/customer-data/shared-projection-runtime";
import type { SharedCustomerPublishBatch } from "@/lib/customer-data/shared-projection-contract";
import type { Database, Tables, TablesInsert } from "@/integrations/supabase/types";

type ProjectRow = Tables<"shared_project_projection">;
type WorkPackageRow = Tables<"shared_work_package_projection">;
type ActivityRow = Tables<"shared_activity_projection">;
type ProjectInsert = TablesInsert<"shared_project_projection">;
type WorkPackageInsert = TablesInsert<"shared_work_package_projection">;
type ActivityInsert = TablesInsert<"shared_activity_projection">;

type ExistingRow = Pick<
  ProjectRow,
  "id" | "source_id" | "published_by" | "source_revision" | "source_hash" | "is_active"
>;

function fail(operation: string): never {
  throw new Error(`Shared Projection: ${operation} fehlgeschlagen.`);
}

function assertOwned(existing: readonly ExistingRow[], publisherUserId: string, entity: string): void {
  const conflict = existing.find((row) => row.published_by !== publisherUserId);
  if (conflict) {
    throw new Error(
      `Shared Projection: ${entity} ${conflict.source_id} wurde bereits von einem anderen Publisher veröffentlicht.`,
    );
  }
}

function nextRevision(existing: ExistingRow | undefined, sourceHash: string): number {
  if (!existing) return 1;
  return existing.source_hash === sourceHash
    ? existing.source_revision
    : Math.max(1, existing.source_revision + 1);
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function withdrawProjects(
  client: SupabaseClient<Database>,
  batch: SharedCustomerPublishBatch,
  existing: readonly ExistingRow[],
  activeSourceIds: ReadonlySet<string>,
  now: string,
): Promise<number> {
  const stale = existing
    .filter(
      (row) =>
        row.published_by === batch.publisherUserId &&
        row.is_active &&
        !activeSourceIds.has(row.source_id),
    )
    .map((row) => row.source_id);
  if (stale.length === 0) return 0;

  const { error } = await client
    .from("shared_project_projection")
    .update({ is_active: false, withdrawn_at: now })
    .eq("systemhouse_id", batch.systemhouseId)
    .eq("customer_id", batch.customerId)
    .eq("published_by", batch.publisherUserId)
    .in("source_id", stale);
  if (error) fail("Project-Withdraw");
  return stale.length;
}

async function withdrawWorkPackages(
  client: SupabaseClient<Database>,
  batch: SharedCustomerPublishBatch,
  existing: readonly ExistingRow[],
  activeSourceIds: ReadonlySet<string>,
  now: string,
): Promise<number> {
  const stale = existing
    .filter(
      (row) =>
        row.published_by === batch.publisherUserId &&
        row.is_active &&
        !activeSourceIds.has(row.source_id),
    )
    .map((row) => row.source_id);
  if (stale.length === 0) return 0;

  const { error } = await client
    .from("shared_work_package_projection")
    .update({ is_active: false, withdrawn_at: now })
    .eq("systemhouse_id", batch.systemhouseId)
    .eq("customer_id", batch.customerId)
    .eq("published_by", batch.publisherUserId)
    .in("source_id", stale);
  if (error) fail("WorkPackage-Withdraw");
  return stale.length;
}

async function withdrawActivities(
  client: SupabaseClient<Database>,
  batch: SharedCustomerPublishBatch,
  existing: readonly ExistingRow[],
  activeSourceIds: ReadonlySet<string>,
  now: string,
): Promise<number> {
  const stale = existing
    .filter(
      (row) =>
        row.published_by === batch.publisherUserId &&
        row.is_active &&
        !activeSourceIds.has(row.source_id),
    )
    .map((row) => row.source_id);
  if (stale.length === 0) return 0;

  const { error } = await client
    .from("shared_activity_projection")
    .update({ is_active: false, withdrawn_at: now })
    .eq("systemhouse_id", batch.systemhouseId)
    .eq("customer_id", batch.customerId)
    .eq("published_by", batch.publisherUserId)
    .in("source_id", stale);
  if (error) fail("Activity-Withdraw");
  return stale.length;
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
    async publish(batch): Promise<SharedProjectionWriteCounts> {
      const now = new Date().toISOString();

      const [projectExistingResult, workPackageExistingResult, activityExistingResult] =
        await Promise.all([
          client
            .from("shared_project_projection")
            .select("id,source_id,published_by,source_revision,source_hash,is_active")
            .eq("systemhouse_id", batch.systemhouseId)
            .eq("customer_id", batch.customerId),
          client
            .from("shared_work_package_projection")
            .select("id,source_id,published_by,source_revision,source_hash,is_active")
            .eq("systemhouse_id", batch.systemhouseId)
            .eq("customer_id", batch.customerId),
          client
            .from("shared_activity_projection")
            .select("id,source_id,published_by,source_revision,source_hash,is_active")
            .eq("systemhouse_id", batch.systemhouseId)
            .eq("customer_id", batch.customerId),
        ]);

      if (
        projectExistingResult.error ||
        workPackageExistingResult.error ||
        activityExistingResult.error
      ) {
        fail("bestehende Projektion lesen");
      }

      const projectExisting = (projectExistingResult.data ?? []) as ExistingRow[];
      const workPackageExisting = (workPackageExistingResult.data ?? []) as ExistingRow[];
      const activityExisting = (activityExistingResult.data ?? []) as ExistingRow[];

      assertOwned(projectExisting.filter((row) => batch.projects.some((p) => p.id === row.source_id)), batch.publisherUserId, "Project");
      assertOwned(
        workPackageExisting.filter((row) => batch.workPackages.some((wp) => wp.id === row.source_id)),
        batch.publisherUserId,
        "WorkPackage",
      );
      assertOwned(
        activityExisting.filter((row) => batch.activities.some((activity) => activity.id === row.source_id)),
        batch.publisherUserId,
        "Activity",
      );

      const projectExistingBySource = new Map(projectExisting.map((row) => [row.source_id, row]));
      const projectRows: ProjectInsert[] = await Promise.all(
        batch.projects.map(async (project) => {
          const sourceHash = await sha256({
            name: project.name,
            legacyClient: project.legacyClient,
            status: project.status,
          });
          return {
            systemhouse_id: batch.systemhouseId,
            customer_id: batch.customerId,
            source_id: project.id,
            name: project.name,
            legacy_client: project.legacyClient,
            status: project.status,
            published_by: batch.publisherUserId,
            published_at: now,
            source_revision: nextRevision(projectExistingBySource.get(project.id), sourceHash),
            source_hash: sourceHash,
            is_active: true,
            withdrawn_at: null,
          };
        }),
      );

      let projectRefs = new Map<string, string>();
      if (projectRows.length > 0) {
        const { data, error } = await client
          .from("shared_project_projection")
          .upsert(projectRows, { onConflict: "systemhouse_id,customer_id,source_id" })
          .select("id,source_id");
        if (error) fail("Projects veröffentlichen");
        projectRefs = new Map((data ?? []).map((row) => [row.source_id, row.id]));
      }

      const workPackageExistingBySource = new Map(
        workPackageExisting.map((row) => [row.source_id, row]),
      );
      const workPackageRows: WorkPackageInsert[] = await Promise.all(
        batch.workPackages.map(async (workPackage) => {
          const linkedProjectRef =
            workPackage.projectLinkStatus === "linked" && workPackage.projectId
              ? projectRefs.get(workPackage.projectId)
              : undefined;
          if (workPackage.projectLinkStatus === "linked" && !linkedProjectRef) {
            throw new Error(
              `Shared Projection: Project-Parent ${workPackage.projectId ?? ""} fehlt im Publish-Batch.`,
            );
          }
          const sourceHash = await sha256({
            projectId: workPackage.projectId,
            title: workPackage.title,
            legacyClient: workPackage.legacyClient ?? "",
            status: workPackage.status,
            priority: workPackage.priority,
          });
          return {
            systemhouse_id: batch.systemhouseId,
            customer_id: batch.customerId,
            source_id: workPackage.id,
            project_ref: linkedProjectRef ?? null,
            project_source_id:
              workPackage.projectLinkStatus === "linked" ? workPackage.projectId : null,
            parent_link_status: workPackage.projectLinkStatus,
            title: workPackage.title,
            legacy_client: workPackage.legacyClient ?? "",
            status: workPackage.status,
            priority: workPackage.priority,
            published_by: batch.publisherUserId,
            published_at: now,
            source_revision: nextRevision(
              workPackageExistingBySource.get(workPackage.id),
              sourceHash,
            ),
            source_hash: sourceHash,
            is_active: true,
            withdrawn_at: null,
          };
        }),
      );

      let workPackageRefs = new Map<string, string>();
      if (workPackageRows.length > 0) {
        const { data, error } = await client
          .from("shared_work_package_projection")
          .upsert(workPackageRows, { onConflict: "systemhouse_id,customer_id,source_id" })
          .select("id,source_id");
        if (error) fail("WorkPackages veröffentlichen");
        workPackageRefs = new Map((data ?? []).map((row) => [row.source_id, row.id]));
      }

      const activityExistingBySource = new Map(
        activityExisting.map((row) => [row.source_id, row]),
      );
      const activityRows: ActivityInsert[] = await Promise.all(
        batch.activities.map(async (activity) => {
          const linkedWorkPackageRef =
            activity.workPackageLinkStatus === "linked" && activity.workPackageId
              ? workPackageRefs.get(activity.workPackageId)
              : undefined;
          if (activity.workPackageLinkStatus === "linked" && !linkedWorkPackageRef) {
            throw new Error(
              `Shared Projection: WorkPackage-Parent ${activity.workPackageId ?? ""} fehlt im Publish-Batch.`,
            );
          }
          const sourceHash = await sha256({
            workPackageId: activity.workPackageId,
            engineerId: activity.engineerId,
            title: activity.title,
            legacyClient: activity.legacyClient ?? "",
            date: activity.date,
            duration: activity.duration,
            billable: activity.billable,
            billingStatus: activity.billingStatus,
          });
          return {
            systemhouse_id: batch.systemhouseId,
            customer_id: batch.customerId,
            source_id: activity.id,
            work_package_ref: linkedWorkPackageRef ?? null,
            work_package_source_id:
              activity.workPackageLinkStatus === "linked" ? activity.workPackageId : null,
            parent_link_status: activity.workPackageLinkStatus,
            engineer_id: activity.engineerId!,
            title: activity.title,
            legacy_client: activity.legacyClient ?? "",
            activity_date: activity.date,
            duration_hours: activity.duration,
            billable: activity.billable,
            billing_status: activity.billingStatus,
            published_by: batch.publisherUserId,
            published_at: now,
            source_revision: nextRevision(activityExistingBySource.get(activity.id), sourceHash),
            source_hash: sourceHash,
            is_active: true,
            withdrawn_at: null,
          };
        }),
      );

      if (activityRows.length > 0) {
        const { error } = await client
          .from("shared_activity_projection")
          .upsert(activityRows, { onConflict: "systemhouse_id,customer_id,source_id" });
        if (error) fail("Activities veröffentlichen");
      }

      const activeProjectIds = new Set(batch.projects.map((project) => project.id));
      const activeWorkPackageIds = new Set(batch.workPackages.map((workPackage) => workPackage.id));
      const activeActivityIds = new Set(batch.activities.map((activity) => activity.id));

      // Children zuerst zurückziehen; dadurch bleibt die fachliche Parent-Kette
      // während der Snapshot-Reconciliation möglichst konsistent sichtbar.
      const withdrawnActivities = await withdrawActivities(
        client,
        batch,
        activityExisting,
        activeActivityIds,
        now,
      );
      const withdrawnWorkPackages = await withdrawWorkPackages(
        client,
        batch,
        workPackageExisting,
        activeWorkPackageIds,
        now,
      );
      const withdrawnProjects = await withdrawProjects(
        client,
        batch,
        projectExisting,
        activeProjectIds,
        now,
      );

      return {
        upsertedProjects: projectRows.length,
        upsertedWorkPackages: workPackageRows.length,
        upsertedActivities: activityRows.length,
        withdrawnProjects,
        withdrawnWorkPackages,
        withdrawnActivities,
      };
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
