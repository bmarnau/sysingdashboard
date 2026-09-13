import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type {
  ManageableSystemhouse,
  ResponsibilityCandidate,
  ResponsibilityManagementCustomer,
} from "@/lib/customer-data/customer-responsibility-management";

type UserSupabaseClient = SupabaseClient<Database>;
const uuid = z.string().uuid();
const DENIED = "Kundenverantwortung ist für diesen Scope nicht verfügbar.";

const overviewSchema = z.object({ systemhouseId: uuid.optional() });
const candidateSchema = z.object({ systemhouseId: uuid });
const setSchema = z.object({ systemhouseId: uuid, customerId: uuid, targetUserId: uuid });
const endSchema = z.object({ systemhouseId: uuid, customerId: uuid });

export interface ResponsibilityManagementPayload {
  systemhouses: ManageableSystemhouse[];
  selectedSystemhouseId: string | null;
  customers: ResponsibilityManagementCustomer[];
}

async function repositoryFor(supabase: UserSupabaseClient) {
  const { createSupabaseCustomerResponsibilityManagementRepository } =
    await import("@/integrations/supabase/customer-responsibility-management-adapter");
  return createSupabaseCustomerResponsibilityManagementRepository(supabase);
}

async function assertManageableSystemhouse(
  repository: Awaited<ReturnType<typeof repositoryFor>>,
  userId: string,
  systemhouseId: string,
): Promise<ManageableSystemhouse[]> {
  const systemhouses = await repository.listManageableSystemhouses(userId);
  if (!systemhouses.some((entry) => entry.systemhouseId === systemhouseId)) throw new Error(DENIED);
  return systemhouses;
}

/** Lädt ausschließlich systemhausweite Responsibility-Metadaten, keine operativen Kundendaten. */
export const listResponsibilityManagementFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => overviewSchema.parse(input ?? {}))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<ResponsibilityManagementPayload> => {
    const repository = await repositoryFor(context.supabase as UserSupabaseClient);
    const systemhouses = await repository.listManageableSystemhouses(context.userId);
    if (systemhouses.length === 0) {
      return { systemhouses: [], selectedSystemhouseId: null, customers: [] };
    }

    const selectedSystemhouseId = data.systemhouseId ?? systemhouses[0].systemhouseId;
    if (!systemhouses.some((entry) => entry.systemhouseId === selectedSystemhouseId)) {
      throw new Error(DENIED);
    }
    const customers = await repository.listCustomers(selectedSystemhouseId);
    return { systemhouses, selectedSystemhouseId, customers };
  });

export const listResponsibilityCandidatesFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => candidateSchema.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<ResponsibilityCandidate[]> => {
    const repository = await repositoryFor(context.supabase as UserSupabaseClient);
    await assertManageableSystemhouse(repository, context.userId, data.systemhouseId);
    return repository.listCandidates(data.systemhouseId);
  });

export const setCustomerResponsibilityFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => setSchema.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ responsibilityId: string }> => {
    const repository = await repositoryFor(context.supabase as UserSupabaseClient);
    await assertManageableSystemhouse(repository, context.userId, data.systemhouseId);
    const responsibilityId = await repository.setResponsibility(data);
    return { responsibilityId };
  });

export const endCustomerResponsibilityFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => endSchema.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ended: boolean }> => {
    const repository = await repositoryFor(context.supabase as UserSupabaseClient);
    await assertManageableSystemhouse(repository, context.userId, data.systemhouseId);
    const ended = await repository.endResponsibility(data);
    return { ended };
  });
