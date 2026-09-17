import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ProjectControllingRepository } from "@/lib/project-controlling/project-controlling-contract";

export function createSupabaseProjectControllingRepository(
  client: SupabaseClient<Database>,
  userId: string,
): ProjectControllingRepository {
  void client;
  void userId;

  return {
    async listRows() {
      throw new Error("BSF03A_PROJECT_CONTROLLING_ADAPTER_NOT_IMPLEMENTED");
    },
    async listScopeOptions() {
      throw new Error("BSF03A_PROJECT_CONTROLLING_ADAPTER_NOT_IMPLEMENTED");
    },
  };
}
