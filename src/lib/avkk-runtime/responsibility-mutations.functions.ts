import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { ResponsibilityMutationPort } from "@/lib/avkk/responsibility-mutations";

type UserSupabaseClient = SupabaseClient<Database>;

export const RESPONSIBILITY_MUTATION_PERMISSION = "avkk.responsibility.assign";
const ACCESS_DENIED = "Verantwortungsänderung ist für dieses Konto nicht zulässig.";
const ACCESS_CHECK_FAILED = "Verantwortungsänderung konnte nicht autorisiert werden.";

const responsibilityIdSchema = z.object({ responsibilityId: z.string().uuid() }).strict();
const targetSchema = responsibilityIdSchema.extend({ targetUserId: z.string().uuid() }).strict();

export const parseResponsibilityCandidatesRequest = (input: unknown) =>
  responsibilityIdSchema.parse(input);
export const parseTransferOwnerRequest = (input: unknown) => targetSchema.parse(input);
export const parseAddDeputyRequest = (input: unknown) => targetSchema.parse(input);
export const parseEndResponsibilityRequest = (input: unknown) =>
  responsibilityIdSchema.parse(input);

export async function requireResponsibilityMutationAccess(
  supabase: UserSupabaseClient,
  userId: string,
): Promise<void> {
  const [active, permission] = await Promise.all([
    supabase.rpc("is_account_active", { _user_id: userId }),
    supabase.rpc("has_permission", { _user_id: userId, _perm: RESPONSIBILITY_MUTATION_PERMISSION }),
  ]);
  if (active.error || permission.error) throw new Error(ACCESS_CHECK_FAILED);
  if (active.data !== true || permission.data !== true) throw new Error(ACCESS_DENIED);
}

export async function executeResponsibilityCandidatesRequest(
  supabase: UserSupabaseClient,
  userId: string,
  input: { responsibilityId: string },
  port: ResponsibilityMutationPort,
) {
  await requireResponsibilityMutationAccess(supabase, userId);
  return port.listCandidates(input.responsibilityId);
}

async function mutationPort(supabase: UserSupabaseClient): Promise<ResponsibilityMutationPort> {
  const { createSupabaseResponsibilityMutationPort } =
    await import("@/integrations/supabase/responsibility-mutations-adapter");
  return createSupabaseResponsibilityMutationPort(supabase);
}

export const listResponsibilityCandidatesFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseResponsibilityCandidatesRequest(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as UserSupabaseClient;
    return executeResponsibilityCandidatesRequest(
      supabase,
      context.userId,
      data,
      await mutationPort(supabase),
    );
  });

export const transferResponsibilityOwnerFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseTransferOwnerRequest(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as UserSupabaseClient;
    await requireResponsibilityMutationAccess(supabase, context.userId);
    return (await mutationPort(supabase)).transferOwner(data);
  });

export const addResponsibilityDeputyFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseAddDeputyRequest(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as UserSupabaseClient;
    await requireResponsibilityMutationAccess(supabase, context.userId);
    return (await mutationPort(supabase)).addDeputy(data);
  });

export const endResponsibilityFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseEndResponsibilityRequest(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as UserSupabaseClient;
    await requireResponsibilityMutationAccess(supabase, context.userId);
    return (await mutationPort(supabase)).endResponsibility(data);
  });
