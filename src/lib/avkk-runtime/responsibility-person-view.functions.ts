import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { ResponsibilityPersonViewService } from "@/lib/avkk/responsibility-management";
import type {
  ResponsibilityPersonViewRepository,
  ResponsibilityPersonViewRow,
} from "@/lib/avkk/responsibility-management.types";

type UserSupabaseClient = SupabaseClient<Database>;

export const RESPONSIBILITY_PERSON_VIEW_PERMISSION = "avkk.management.view";
export const RESPONSIBILITY_PERSON_VIEW_DENIED =
  "Verantwortungssicht für diesen Benutzer nicht zulässig.";
const RESPONSIBILITY_PERSON_VIEW_AUTHORIZATION_FAILED =
  "Verantwortungssicht-Autorisierung konnte nicht geprüft werden.";

const requestSchema = z
  .object({
    personId: z.string().uuid(),
  })
  .strict();

export function parseResponsibilityPersonViewRequest(input: unknown): { personId: string } {
  return requestSchema.parse(input);
}

async function requireResponsibilityPersonViewAccess(
  supabase: UserSupabaseClient,
  userId: string,
): Promise<void> {
  const [active, permission] = await Promise.all([
    supabase.rpc("is_account_active", { _user_id: userId }),
    supabase.rpc("has_permission", {
      _user_id: userId,
      _perm: RESPONSIBILITY_PERSON_VIEW_PERMISSION,
    }),
  ]);

  if (active.error || permission.error) {
    throw new Error(RESPONSIBILITY_PERSON_VIEW_AUTHORIZATION_FAILED);
  }
  if (active.data !== true || permission.data !== true) {
    throw new Error(RESPONSIBILITY_PERSON_VIEW_DENIED);
  }
}

export async function executeResponsibilityPersonViewRequest(
  supabase: UserSupabaseClient,
  userId: string,
  personId: string,
  repository: ResponsibilityPersonViewRepository,
): Promise<ResponsibilityPersonViewRow[]> {
  await requireResponsibilityPersonViewAccess(supabase, userId);
  return new ResponsibilityPersonViewService(repository).listByPerson(personId);
}

export const readResponsibilityPersonViewFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseResponsibilityPersonViewRequest(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<ResponsibilityPersonViewRow[]> => {
    const supabase = context.supabase as UserSupabaseClient;
    const { createSupabaseResponsibilityPersonViewRepository } =
      await import("@/integrations/supabase/responsibility-person-view-adapter");
    const repository = createSupabaseResponsibilityPersonViewRepository(supabase);

    return executeResponsibilityPersonViewRequest(
      supabase,
      context.userId,
      data.personId,
      repository,
    );
  });
