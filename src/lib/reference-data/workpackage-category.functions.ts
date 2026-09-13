import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type {
  WorkPackageCategoryManagementPayload,
  WorkPackageCategoryManagementRepository,
} from "./workpackage-category-management";

type UserSupabaseClient = SupabaseClient<Database>;
const uuid = z.string().uuid();
const key = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9._-]*$/u, "Technischer Key ist ungültig.");
const label = z.string().trim().min(1).max(120);
const description = z.string().trim().max(500);
const sortOrder = z.number().int().min(0).max(100000);
const DENIED = "Arbeitspaket-Kategorien sind für diesen Scope nicht verfügbar.";

const listSchema = z.object({ systemhouseId: uuid.optional() });
const createSchema = z.object({
  systemhouseId: uuid,
  key,
  label,
  description: description.default(""),
  sortOrder: sortOrder.default(0),
});
const updateSchema = z.object({
  systemhouseId: uuid,
  valueId: uuid,
  label,
  description: description.default(""),
  sortOrder: sortOrder.default(0),
});
const deactivateSchema = z.object({ systemhouseId: uuid, valueId: uuid });

async function repositoryFor(
  supabase: UserSupabaseClient,
): Promise<WorkPackageCategoryManagementRepository> {
  const { createSupabaseWorkPackageCategoryManagementRepository } =
    await import("@/integrations/supabase/workpackage-category-management-adapter");
  return createSupabaseWorkPackageCategoryManagementRepository(supabase);
}

async function assertManageableScope(
  repository: WorkPackageCategoryManagementRepository,
  userId: string,
  systemhouseId: string,
) {
  const scopes = await repository.listManageableScopes(userId);
  if (!scopes.some((scope) => scope.systemhouseId === systemhouseId)) throw new Error(DENIED);
  return scopes;
}

export const listWorkPackageCategoryManagementFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => listSchema.parse(input ?? {}))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<WorkPackageCategoryManagementPayload> => {
    const repository = await repositoryFor(context.supabase as UserSupabaseClient);
    const scopes = await repository.listManageableScopes(context.userId);
    if (scopes.length === 0) return { scopes: [], selectedSystemhouseId: null, values: [] };

    const selectedSystemhouseId =
      data.systemhouseId ?? (scopes.length === 1 ? scopes[0].systemhouseId : null);
    if (!selectedSystemhouseId) return { scopes, selectedSystemhouseId: null, values: [] };
    if (!scopes.some((scope) => scope.systemhouseId === selectedSystemhouseId)) {
      throw new Error(DENIED);
    }
    return {
      scopes,
      selectedSystemhouseId,
      values: await repository.listValues(selectedSystemhouseId),
    };
  });

export const createWorkPackageCategoryFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => createSchema.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ created: true }> => {
    const repository = await repositoryFor(context.supabase as UserSupabaseClient);
    await assertManageableScope(repository, context.userId, data.systemhouseId);
    await repository.createValue(data, context.userId);
    return { created: true };
  });

export const updateWorkPackageCategoryFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => updateSchema.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ updated: true }> => {
    const repository = await repositoryFor(context.supabase as UserSupabaseClient);
    await assertManageableScope(repository, context.userId, data.systemhouseId);
    await repository.updateValue(data, context.userId);
    return { updated: true };
  });

export const deactivateWorkPackageCategoryFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => deactivateSchema.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ deactivated: true }> => {
    const repository = await repositoryFor(context.supabase as UserSupabaseClient);
    await assertManageableScope(repository, context.userId, data.systemhouseId);
    await repository.deactivateValue(data, context.userId);
    return { deactivated: true };
  });

export const WORKPACKAGE_CATEGORY_MANAGE_PERMISSION = "referencedata.manage" as const;
