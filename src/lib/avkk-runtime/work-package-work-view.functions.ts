import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { WorkPackageWorkViewService } from "@/lib/avkk/work-package-work-view";
import type {
  WorkPackageWorkViewRepository,
  WorkPackageWorkViewRow,
} from "@/lib/avkk/work-package-work-view.types";

type UserSupabaseClient = SupabaseClient<Database>;
export const WORK_PACKAGE_WORK_VIEW_PERMISSION = "avkk.management.view";
export const WORK_PACKAGE_WORK_VIEW_DENIED =
  "Arbeitspaket-Arbeitssicht für diesen Benutzer nicht zulässig.";
const AUTHORIZATION_FAILED = "Arbeitspaket-Arbeitssicht-Autorisierung konnte nicht geprüft werden.";
const requestSchema = z.object({}).strict();

export function parseWorkPackageWorkViewRequest(input: unknown): Record<never, never> {
  return requestSchema.parse(input);
}

export async function requireWorkPackageWorkViewAccess(
  supabase: UserSupabaseClient,
  userId: string,
): Promise<void> {
  const [active, permission] = await Promise.all([
    supabase.rpc("is_account_active", { _user_id: userId }),
    supabase.rpc("has_permission", { _user_id: userId, _perm: WORK_PACKAGE_WORK_VIEW_PERMISSION }),
  ]);
  if (active.error || permission.error) throw new Error(AUTHORIZATION_FAILED);
  if (active.data !== true || permission.data !== true)
    throw new Error(WORK_PACKAGE_WORK_VIEW_DENIED);
}

export async function executeWorkPackageWorkViewRequest(
  supabase: UserSupabaseClient,
  userId: string,
  repository: WorkPackageWorkViewRepository,
  referenceInstant: string,
): Promise<WorkPackageWorkViewRow[]> {
  await requireWorkPackageWorkViewAccess(supabase, userId);
  return new WorkPackageWorkViewService(repository).list(referenceInstant);
}

export const readWorkPackageWorkViewFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseWorkPackageWorkViewRequest(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WorkPackageWorkViewRow[]> => {
    const supabase = context.supabase as UserSupabaseClient;
    const { createSupabaseWorkPackageWorkViewRepository } =
      await import("@/integrations/supabase/work-package-work-view-adapter");
    return executeWorkPackageWorkViewRequest(
      supabase,
      context.userId,
      createSupabaseWorkPackageWorkViewRepository(supabase),
      new Date().toISOString(),
    );
  });
