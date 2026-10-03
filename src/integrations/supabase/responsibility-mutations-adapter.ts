import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  ResponsibilityCandidate,
  ResponsibilityMutationPort,
} from "@/lib/avkk/responsibility-mutations";

type UserSupabaseClient = SupabaseClient<Database>;

function fail(operation: string): never {
  throw new Error(`Verantwortungsänderung: ${operation} fehlgeschlagen.`);
}

export function createSupabaseResponsibilityMutationPort(
  supabase: UserSupabaseClient,
): ResponsibilityMutationPort {
  return {
    async listCandidates(responsibilityId) {
      const { data: responsibility, error: responsibilityError } = await supabase
        .from("avkk_responsibility")
        .select("id,avkk_subject_id")
        .eq("id", responsibilityId)
        .maybeSingle();
      if (responsibilityError || !responsibility) fail("Verantwortung lesen");

      const { data, error } = await supabase.rpc("bsf03e_avkk_responsibility_candidates", {
        _subject: responsibility.avkk_subject_id,
      });
      if (error) fail("Kandidaten lesen");
      return (data ?? []).map(
        (candidate): ResponsibilityCandidate => ({
          userId: candidate.user_id,
          displayName: candidate.display_name,
        }),
      );
    },
    async transferOwner({ responsibilityId, targetUserId }) {
      const { data, error } = await supabase.rpc("bsf03e_transfer_owner", {
        _responsibility_id: responsibilityId,
        _target_user_id: targetUserId,
      });
      if (error || !data) fail("Owner übertragen");
      return data;
    },
    async addDeputy({ responsibilityId, targetUserId }) {
      const { data, error } = await supabase.rpc("bsf03e_add_deputy", {
        _source_responsibility_id: responsibilityId,
        _target_user_id: targetUserId,
      });
      if (error || !data) fail("Deputy ergänzen");
      return data;
    },
    async endResponsibility({ responsibilityId }) {
      const { data, error } = await supabase.rpc("bsf03e_end_responsibility", {
        _responsibility_id: responsibilityId,
      });
      if (error || data !== true) fail("Verantwortung beenden");
      return data;
    },
  };
}
