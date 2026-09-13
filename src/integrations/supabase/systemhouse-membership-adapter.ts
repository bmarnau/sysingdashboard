/**
 * Supabase-Adapter für Systemhaus-Memberships (BSF-03D).
 *
 * Liest ausschließlich eigene Memberships im User-JWT: RLS
 * (`membership_select_own`) und `systemhouse_select_member` begrenzen die
 * Sichtbarkeit serverseitig. Kein privilegierter Client, keine Service Role.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  SystemhouseMembership,
  SystemhouseMembershipRepository,
} from "@/lib/systemhouse/membership";

interface Row {
  systemhouse_id: string;
  status: string;
  valid_from: string | null;
  valid_to: string | null;
  systemhouse: { name: string } | { name: string }[] | null;
}

function nameOf(rel: Row["systemhouse"]): string {
  if (!rel) return "";
  return Array.isArray(rel) ? (rel[0]?.name ?? "") : rel.name;
}

export function createSupabaseSystemhouseMembershipRepository(): SystemhouseMembershipRepository {
  return {
    async listOwnMemberships(): Promise<SystemhouseMembership[]> {
      const { data, error } = await supabase
        .from("systemhouse_membership")
        .select("systemhouse_id, status, valid_from, valid_to, systemhouse:systemhouse(name)")
        .order("systemhouse_id", { ascending: true });
      if (error) throw new Error("Systemhaus-Zugehörigkeit konnte nicht geladen werden.");
      return ((data ?? []) as unknown as Row[]).map((r) => ({
        systemhouseId: r.systemhouse_id,
        systemhouseName: nameOf(r.systemhouse) || r.systemhouse_id,
        status: r.status,
        validFrom: r.valid_from,
        validTo: r.valid_to,
      }));
    },
  };
}
