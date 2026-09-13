import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  CreateWorkPackageCategoryInput,
  DeactivateWorkPackageCategoryInput,
  UpdateWorkPackageCategoryInput,
  WorkPackageCategoryManagementRepository,
  WorkPackageCategoryScope,
} from "@/lib/reference-data/workpackage-category-management";
import type { ReferenceValue } from "@/lib/reference-data/types";

type UserSupabaseClient = SupabaseClient<Database>;

interface MembershipRow {
  systemhouse_id: string;
  systemhouse: { name: string; status: string } | null;
}

interface CatalogRow {
  id: string;
  key: string;
}

interface ValueRow {
  id: string;
  catalog_id: string;
  key: string;
  label: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
  parent_value_id: string | null;
  attributes: unknown;
  valid_from: string;
  valid_to: string | null;
  systemhouse_id: string | null;
}

function fail(operation: string): never {
  throw new Error(`Arbeitspaket-Kategorien: ${operation} fehlgeschlagen.`);
}

function toValue(row: ValueRow): ReferenceValue {
  return {
    id: row.id,
    catalogId: row.catalog_id,
    catalogKey: "workpackage.category",
    key: row.key,
    label: row.label,
    description: row.description ?? "",
    sortOrder: row.sort_order,
    isActive: row.is_active,
    isDefault: row.is_default,
    parentValueId: row.parent_value_id,
    attributes: (row.attributes as Record<string, unknown>) ?? {},
    validFrom: row.valid_from,
    validTo: row.valid_to,
    systemhouseId: row.systemhouse_id,
  };
}

export function createSupabaseWorkPackageCategoryManagementRepository(
  supabase: UserSupabaseClient,
): WorkPackageCategoryManagementRepository {
  async function catalog(): Promise<CatalogRow> {
    const { data, error } = await supabase
      .from("reference_catalog")
      .select("id,key")
      .eq("key", "workpackage.category")
      .eq("scope_type", "systemhouse")
      .maybeSingle();
    if (error || !data) fail("Katalog lesen");
    return data as CatalogRow;
  }

  return {
    async listManageableScopes(userId) {
      const { data: allowed, error: permissionError } = await supabase.rpc("has_permission", {
        _user_id: userId,
        _perm: "referencedata.manage",
      });
      if (permissionError || allowed !== true) return [];

      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("systemhouse_membership")
        .select(
          "systemhouse_id, systemhouse:systemhouse!systemhouse_membership_systemhouse_fk(name,status)",
        )
        .eq("user_id", userId)
        .eq("status", "active")
        .or(`valid_from.is.null,valid_from.lte.${nowIso}`)
        .or(`valid_to.is.null,valid_to.gt.${nowIso}`)
        .limit(100);
      if (error) fail("Systemhäuser lesen");

      const scopes: WorkPackageCategoryScope[] = [];
      for (const row of (data ?? []) as unknown as MembershipRow[]) {
        if (!row.systemhouse || row.systemhouse.status !== "active") continue;
        scopes.push({
          systemhouseId: row.systemhouse_id,
          systemhouseName: row.systemhouse.name,
        });
      }
      return scopes.sort(
        (a, b) =>
          a.systemhouseName.localeCompare(b.systemhouseName, "de") ||
          a.systemhouseId.localeCompare(b.systemhouseId),
      );
    },

    async listValues(systemhouseId) {
      const catalogRow = await catalog();
      const { data, error } = await supabase
        .from("reference_value")
        .select("*")
        .eq("catalog_id", catalogRow.id)
        .eq("systemhouse_id", systemhouseId)
        .order("sort_order", { ascending: true })
        .order("label", { ascending: true });
      if (error) fail("Kategorien lesen");
      return ((data ?? []) as ValueRow[]).map(toValue);
    },

    async createValue(input: CreateWorkPackageCategoryInput, actorId: string) {
      const catalogRow = await catalog();
      const { error } = await supabase.from("reference_value").insert({
        catalog_id: catalogRow.id,
        systemhouse_id: input.systemhouseId,
        key: input.key,
        label: input.label,
        description: input.description,
        sort_order: input.sortOrder,
        is_default: false,
        created_by: actorId,
        updated_by: actorId,
      });
      if (error) fail("Kategorie anlegen");
    },

    async updateValue(input: UpdateWorkPackageCategoryInput, actorId: string) {
      const { error } = await supabase
        .from("reference_value")
        .update({
          label: input.label,
          description: input.description,
          sort_order: input.sortOrder,
          updated_by: actorId,
        })
        .eq("id", input.valueId)
        .eq("systemhouse_id", input.systemhouseId);
      if (error) fail("Kategorie aktualisieren");
    },

    async deactivateValue(input: DeactivateWorkPackageCategoryInput, actorId: string) {
      const { error } = await supabase
        .from("reference_value")
        .update({
          is_active: false,
          valid_to: new Date().toISOString(),
          updated_by: actorId,
        })
        .eq("id", input.valueId)
        .eq("systemhouse_id", input.systemhouseId);
      if (error) fail("Kategorie deaktivieren");
    },
  };
}
