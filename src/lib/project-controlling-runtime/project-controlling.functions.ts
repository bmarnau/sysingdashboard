import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type {
  ProjectControllingFilters,
  ProjectControllingOutcome,
  ProjectControllingRepository,
} from "@/lib/project-controlling/project-controlling-contract";

export const PROJECT_CONTROLLING_DENIED = "Projektcontrolling für diesen Scope nicht zulässig.";

const PROJECT_CONTROLLING_PERMISSION = "project.controlling.view";
const NOT_IMPLEMENTED = "BSF03A_PROJECT_CONTROLLING_RUNTIME_NOT_IMPLEMENTED";

type UserSupabaseClient = SupabaseClient<Database>;

export function parseProjectControllingRequest(_input: unknown): ProjectControllingFilters {
  throw new Error(NOT_IMPLEMENTED);
}

export async function executeProjectControllingRequest(
  _supabase: UserSupabaseClient,
  _userId: string,
  _filters: ProjectControllingFilters,
  _repository: ProjectControllingRepository,
): Promise<ProjectControllingOutcome> {
  throw new Error(NOT_IMPLEMENTED);
}

export const readProjectControllingFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseProjectControllingRequest(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<ProjectControllingOutcome> => {
    void data;
    void context;
    void PROJECT_CONTROLLING_PERMISSION;
    throw new Error(NOT_IMPLEMENTED);
  });
