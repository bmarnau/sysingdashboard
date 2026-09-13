import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  effectiveAccessLevel,
  type CustomerAccessLevel,
  type MyCustomerCandidate,
  type MyCustomersRepository,
} from "@/lib/customer-data/my-customers";

type UserSupabaseClient = SupabaseClient<Database>;

function fail(operation: string): never {
  throw new Error(`Meine Kunden: ${operation} fehlgeschlagen.`);
}

interface CandidateRow {
  systemhouse_id: string;
  customer_id: string;
  status: string;
  valid_from: string;
  customer: { name: string; status: string } | null;
}

interface AccessRow {
  systemhouse_id: string;
  customer_id: string;
  access_level: string;
}

function accessKey(systemhouseId: string, customerId: string): string {
  return `${systemhouseId}::${customerId}`;
}

/**
 * Supabase-Provider für „Meine Kunden“ (BSF-03).
 *
 * Läuft ausschließlich mit dem Client des angemeldeten Benutzers. Die
 * Sicherheitsgrenze bleibt RLS:
 * - `customer_responsibility`: nur eigene Zeilen, nur bei aktivem Konto und
 *   aktiver Membership (Policy „own responsibility readable“).
 * - `customer` (Embed über den Composite-FK): nur mit Customer Access >= read
 *   (Policy `customer_select_scoped`); ohne Access ist das Embed `null`.
 * - `customer_access`: nur eigene Zeilen (Policy `customer_access_select_own`);
 *   liefert den Read-/Write-Indikator, nie fremde Zugriffe.
 * - `profiles`: nur eigene Zeile (Policy `profiles_self_select`).
 * - `is_my_customer` bestätigt die Schnittmenge inkl. `dashboard.view` in der DB.
 *
 * Zwei Abfragen für alle Kandidaten (kein N+1 auf Tabellenebene); die
 * Bestätigung pro Kandidat ist auf die bereits RLS-gefilterte, kleine Menge begrenzt.
 */
export function createSupabaseMyCustomersRepository(
  supabase: UserSupabaseClient,
): MyCustomersRepository {
  async function listOwnActiveAccess(
    userId: string,
    nowIso: string,
    scope?: { systemhouseId: string; customerId: string },
  ): Promise<AccessRow[]> {
    let query = supabase
      .from("customer_access")
      .select("systemhouse_id, customer_id, access_level")
      .eq("user_id", userId)
      .eq("status", "active")
      .or(`valid_from.is.null,valid_from.lte.${nowIso}`)
      .or(`valid_to.is.null,valid_to.gt.${nowIso}`)
      .limit(1000);
    if (scope) {
      query = query.eq("systemhouse_id", scope.systemhouseId).eq("customer_id", scope.customerId);
    }
    const { data, error } = await query;
    if (error) fail("Zugriffsstufe lesen");
    return (data ?? []) as AccessRow[];
  }

  return {
    async listCandidates(userId) {
      const nowIso = new Date().toISOString();
      const [{ data, error }, accessRows] = await Promise.all([
        supabase
          .from("customer_responsibility")
          .select(
            "systemhouse_id, customer_id, status, valid_from, customer:customer!customer_responsibility_customer_fk(name, status)",
          )
          .eq("user_id", userId)
          .eq("status", "active")
          .is("valid_to", null)
          .lte("valid_from", nowIso)
          .limit(500),
        listOwnActiveAccess(userId, nowIso),
      ]);

      if (error) fail("Kundenliste lesen");

      const levelsByScope = new Map<string, string[]>();
      for (const row of accessRows) {
        const key = accessKey(row.systemhouse_id, row.customer_id);
        levelsByScope.set(key, [...(levelsByScope.get(key) ?? []), row.access_level]);
      }

      return ((data ?? []) as unknown as CandidateRow[]).map(
        (row): MyCustomerCandidate => ({
          systemhouseId: row.systemhouse_id,
          customerId: row.customer_id,
          responsibilityStatus: row.status,
          responsibleSince: row.valid_from,
          customer: row.customer ? { name: row.customer.name, status: row.customer.status } : null,
          accessLevel: effectiveAccessLevel(
            levelsByScope.get(accessKey(row.systemhouse_id, row.customer_id)) ?? [],
          ),
        }),
      );
    },

    async isMyCustomer({ userId, systemhouseId, customerId }) {
      const { data, error } = await supabase.rpc("is_my_customer", {
        _user_id: userId,
        _systemhouse_id: systemhouseId,
        _customer_id: customerId,
      });
      if (error) fail("Kundenzuordnung prüfen");
      return data === true;
    },

    async readCustomer({ systemhouseId, customerId }) {
      const { data, error } = await supabase
        .from("customer")
        .select("name, status")
        .eq("systemhouse_id", systemhouseId)
        .eq("id", customerId)
        .maybeSingle();
      if (error) fail("Kunde lesen");
      return data ? { name: data.name, status: data.status } : null;
    },

    async readOwnResponsibility({ userId, systemhouseId, customerId }) {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("customer_responsibility")
        .select("status, valid_from")
        .eq("user_id", userId)
        .eq("systemhouse_id", systemhouseId)
        .eq("customer_id", customerId)
        .eq("status", "active")
        .is("valid_to", null)
        .lte("valid_from", nowIso)
        .order("valid_from", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) fail("Verantwortung lesen");
      return data ? { status: data.status, validFrom: data.valid_from } : null;
    },

    async readOwnAccessLevel({ userId, systemhouseId, customerId }) {
      const rows = await listOwnActiveAccess(userId, new Date().toISOString(), {
        systemhouseId,
        customerId,
      });
      return effectiveAccessLevel(
        rows.map((row) => row.access_level),
      ) as CustomerAccessLevel | null;
    },

    async readOwnDisplayName(userId) {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, first_name, last_name")
        .eq("id", userId)
        .maybeSingle();
      if (error) fail("Profil lesen");
      if (!data) return null;
      const name = data.display_name?.trim() || `${data.first_name} ${data.last_name}`.trim();
      return name || null;
    },
  };
}
