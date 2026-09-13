import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  normalizeResponsibilityCandidates,
  normalizeResponsibilityCustomers,
  type CustomerResponsibilityManagementRepository,
  type ManageableSystemhouse,
  type ResponsibilityCandidate,
  type ResponsibilityManagementCustomer,
} from "@/lib/customer-data/customer-responsibility-management";

type UserSupabaseClient = SupabaseClient<Database>;

interface MembershipRow {
  systemhouse_id: string;
  systemhouse: { name: string; status: string } | null;
}

interface OverviewRow {
  customer_id: string;
  customer_name: string;
  customer_status: string;
  responsibility_id: string | null;
  responsible_user_id: string | null;
  responsible_display_name: string | null;
  responsible_since: string | null;
}

interface CandidateRow {
  user_id: string;
  display_name: string;
}

function fail(operation: string): never {
  throw new Error(`Kundenverantwortung: ${operation} fehlgeschlagen.`);
}

/**
 * Supabase-Provider für BSF-03 P5.
 *
 * Der Client ist immer der User-JWT-Client. Fremde Profile, Rollen,
 * Memberships und Customer-Zeilen werden hier nie direkt gelesen. Die zwei
 * Management-Reads laufen ausschließlich über die datensparsamen P5-RPCs.
 */
export function createSupabaseCustomerResponsibilityManagementRepository(
  supabase: UserSupabaseClient,
): CustomerResponsibilityManagementRepository {
  return {
    async listManageableSystemhouses(userId) {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("systemhouse_membership")
        .select(
          "systemhouse_id, systemhouse:systemhouse!systemhouse_membership_systemhouse_fk(name, status)",
        )
        .eq("user_id", userId)
        .eq("status", "active")
        .or(`valid_from.is.null,valid_from.lte.${nowIso}`)
        .or(`valid_to.is.null,valid_to.gt.${nowIso}`)
        .limit(100);
      if (error) fail("Systemhäuser lesen");

      const rows = (data ?? []) as unknown as MembershipRow[];
      const result: ManageableSystemhouse[] = [];
      for (const row of rows) {
        if (!row.systemhouse || row.systemhouse.status !== "active") continue;
        const { data: allowed, error: permissionError } = await supabase.rpc(
          "can_manage_customer_responsibility",
          { _user_id: userId, _systemhouse_id: row.systemhouse_id },
        );
        if (permissionError) fail("Berechtigung prüfen");
        if (allowed === true) {
          result.push({ systemhouseId: row.systemhouse_id, name: row.systemhouse.name });
        }
      }
      return result.sort(
        (a, b) => a.name.localeCompare(b.name, "de") || a.systemhouseId.localeCompare(b.systemhouseId),
      );
    },

    async listCustomers(systemhouseId) {
      const { data, error } = await supabase.rpc("customer_responsibility_management_overview", {
        _systemhouse_id: systemhouseId,
      });
      if (error) fail("Kundenübersicht lesen");

      const rows = (data ?? []) as OverviewRow[];
      const customers: ResponsibilityManagementCustomer[] = rows.map((row) => ({
        systemhouseId,
        customerId: row.customer_id,
        name: row.customer_name,
        status: row.customer_status,
        responsibility:
          row.responsibility_id &&
          row.responsible_user_id &&
          row.responsible_display_name &&
          row.responsible_since
            ? {
                id: row.responsibility_id,
                userId: row.responsible_user_id,
                displayName: row.responsible_display_name,
                responsibleSince: row.responsible_since,
              }
            : null,
      }));
      return normalizeResponsibilityCustomers(customers);
    },

    async listCandidates(systemhouseId) {
      const { data, error } = await supabase.rpc("customer_responsibility_management_candidates", {
        _systemhouse_id: systemhouseId,
      });
      if (error) fail("Kandidaten lesen");
      return normalizeResponsibilityCandidates(
        ((data ?? []) as CandidateRow[]).map(
          (row): ResponsibilityCandidate => ({
            userId: row.user_id,
            displayName: row.display_name,
          }),
        ),
      );
    },

    async setResponsibility({ systemhouseId, customerId, targetUserId }) {
      const { data, error } = await supabase.rpc("set_customer_responsibility", {
        _systemhouse_id: systemhouseId,
        _customer_id: customerId,
        _target_user_id: targetUserId,
      });
      if (error || typeof data !== "string") fail("Verantwortung speichern");
      return data;
    },

    async endResponsibility({ systemhouseId, customerId }) {
      const { data, error } = await supabase.rpc("end_customer_responsibility", {
        _systemhouse_id: systemhouseId,
        _customer_id: customerId,
      });
      if (error || typeof data !== "boolean") fail("Verantwortung beenden");
      return data;
    },
  };
}
