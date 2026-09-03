import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { buildSharedDataMigrationPlan } from "@/lib/customer-data/migration";
import { prepareSharedCustomerPublishBatch } from "@/lib/customer-data/shared-projection-contract";
import {
  publishSharedCustomerProjection,
  publishSharedOwnActivities,
  readSharedCustomerProjection,
  type SharedCustomerProjectionSnapshot,
  type SharedProjectionPublishResult,
} from "@/lib/customer-data/shared-projection-runtime";

const uuid = z.string().uuid();
const sourceId = z.string().trim().min(1).max(255);
const text = z.string().max(2000);

const customerMappingSchema = z.object({
  legacyName: z.string().trim().min(1).max(500),
  customerId: uuid,
});

const projectSchema = z.object({
  id: sourceId,
  name: text,
  client: z.string().max(500),
  status: z.enum(["on_track", "at_risk", "delayed", "abgeschlossen"]),
});

const workPackageSchema = z.object({
  id: sourceId,
  title: text,
  projectId: sourceId.nullish(),
  client: z.string().max(500).optional(),
  status: z.enum(["offen", "in_arbeit", "wartend", "erledigt"]),
  priority: z.enum(["niedrig", "mittel", "hoch", "kritisch"]),
});

const activitySchema = z.object({
  id: sourceId,
  title: text,
  workPackageId: sourceId.nullish(),
  engineerId: uuid.optional(),
  client: z.string().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.number().finite().nonnegative(),
  hourlyRate: z.number().finite().nonnegative(),
  billable: z.boolean(),
  billingStatus: z.enum(["offen", "abgerechnet", "nicht_abrechenbar"]),
});

const publishSchema = z.object({
  systemhouseId: uuid,
  customerId: uuid,
  customerMappings: z.array(customerMappingSchema).max(5000),
  projects: z.array(projectSchema).max(10000),
  workPackages: z.array(workPackageSchema).max(20000),
  activities: z.array(activitySchema).max(50000),
});

const readSchema = z.object({
  systemhouseId: uuid,
  customerId: uuid,
});

type UserSupabaseClient = SupabaseClient<Database>;

async function assertCommonScope(
  supabase: UserSupabaseClient,
  userId: string,
  systemhouseId: string,
  customerId: string,
  level: "read" | "write",
): Promise<void> {
  const [active, membership, access] = await Promise.all([
    supabase.rpc("is_account_active", { _user_id: userId }),
    supabase.rpc("has_active_systemhouse_membership", {
      _user_id: userId,
      _systemhouse_id: systemhouseId,
    }),
    supabase.rpc("has_customer_access", {
      _user_id: userId,
      _systemhouse_id: systemhouseId,
      _customer_id: customerId,
      _required_level: level,
    }),
  ]);

  if (active.error || membership.error || access.error) {
    throw new Error("Customer-Autorisierung konnte nicht geprüft werden.");
  }
  if (!active.data || !membership.data || !access.data) {
    throw new Error("Keine Berechtigung für den angeforderten Customer-Scope.");
  }
}

async function hasPermission(
  supabase: UserSupabaseClient,
  userId: string,
  permission: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_permission", {
    _user_id: userId,
    _perm: permission,
  });
  if (error) throw new Error("Berechtigungsprüfung konnte nicht ausgeführt werden.");
  return data === true;
}

async function assertPermission(
  supabase: UserSupabaseClient,
  userId: string,
  permission: string,
): Promise<void> {
  if (!(await hasPermission(supabase, userId, permission))) {
    throw new Error("Erforderliche Fachberechtigung fehlt.");
  }
}

/**
 * Publish-Pfad gemäß ADR-0032:
 * Browser -> Serverfunktion -> Supabase im selben User-JWT -> Grants + RLS.
 *
 * Der Client liefert weder Publisher-Identität noch bereits vorbereitete
 * Projection-Zeilen. Customer-Auflösung, Collision-/Parent-Contract und
 * Publisher-Bindung werden im Serverpfad erneut berechnet.
 *
 * Rollen mit `project.edit` dürfen gemeinsame Project-/WorkPackage-Struktur
 * veröffentlichen. Rollen ohne `project.edit`, aber mit `activity.edit`,
 * veröffentlichen ausschließlich eigene Activities gegen bereits aktive
 * WorkPackage-Projections.
 */
export const publishSharedCustomerProjectionFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => publishSchema.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<SharedProjectionPublishResult> => {
    const plan = buildSharedDataMigrationPlan({
      systemhouseId: data.systemhouseId,
      projects: data.projects,
      workPackages: data.workPackages,
      activities: data.activities,
      customerMappings: data.customerMappings,
    });
    const supabase = context.supabase as UserSupabaseClient;

    await assertCommonScope(supabase, context.userId, data.systemhouseId, data.customerId, "write");
    await assertPermission(supabase, context.userId, "dashboard.view");

    const [canEditProjects, canEditActivities] = await Promise.all([
      hasPermission(supabase, context.userId, "project.edit"),
      hasPermission(supabase, context.userId, "activity.edit"),
    ]);

    const { createSupabaseSharedProjectionRepository } =
      await import("@/integrations/supabase/shared-projection-adapter");
    const repository = createSupabaseSharedProjectionRepository(supabase);

    if (canEditProjects) {
      const structuralBatch = prepareSharedCustomerPublishBatch({
        plan,
        customerId: data.customerId,
        publisherUserId: context.userId,
      });
      if (structuralBatch.activities.length > 0 && !canEditActivities) {
        throw new Error("Erforderliche Fachberechtigung für Activities fehlt.");
      }

      return publishSharedCustomerProjection(repository, {
        plan,
        customerId: data.customerId,
        publisherUserId: context.userId,
      });
    }

    if (canEditActivities) {
      const current = await readSharedCustomerProjection(repository, {
        systemhouseId: data.systemhouseId,
        customerId: data.customerId,
      });
      return publishSharedOwnActivities(repository, {
        plan,
        customerId: data.customerId,
        publisherUserId: context.userId,
        availableWorkPackageSourceIds: new Set(
          current.workPackages.map((workPackage) => workPackage.sourceId),
        ),
      });
    }

    throw new Error("Erforderliche Fachberechtigung zum Veröffentlichen fehlt.");
  });

/**
 * Minimaler Shared-Customer-Read-Pfad für BSF-03 und spätere Führungssichten.
 * RLS bleibt die maßgebliche Zeilengrenze; diese Funktion prüft Session,
 * Customer-Scope und dashboard.view zusätzlich im Benutzerkontext.
 */
export const readSharedCustomerProjectionFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => readSchema.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<SharedCustomerProjectionSnapshot> => {
    const supabase = context.supabase as UserSupabaseClient;

    await assertCommonScope(supabase, context.userId, data.systemhouseId, data.customerId, "read");
    await assertPermission(supabase, context.userId, "dashboard.view");

    const { createSupabaseSharedProjectionRepository } =
      await import("@/integrations/supabase/shared-projection-adapter");
    const repository = createSupabaseSharedProjectionRepository(supabase);
    return readSharedCustomerProjection(repository, data);
  });
