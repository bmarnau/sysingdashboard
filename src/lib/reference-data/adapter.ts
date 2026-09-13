/**
 * Supabase-Adapter für Reference Data.
 *
 * Einziger Ort in dieser Domäne, der den Supabase-Client kennt. Alles darüber
 * (Repository, Service, Hooks) arbeitet ausschließlich mit Domänentypen.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { ReferenceDataError } from "@/lib/errors";
import type {
  ReferenceCatalog,
  ReferenceDataAccessContext,
  ReferenceScopeType,
  ReferenceValue,
} from "./types";

interface CatalogRow {
  id: string;
  key: string;
  name: string;
  description: string;
  domain: string;
  is_system: boolean;
  is_hierarchical: boolean;
  version: number;
  scope_type: ReferenceScopeType;
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

interface MembershipRow {
  systemhouse_id: string;
  status: string;
  valid_from: string | null;
  valid_to: string | null;
}

function toCatalog(row: CatalogRow): ReferenceCatalog {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description ?? "",
    domain: row.domain,
    isSystem: row.is_system,
    isHierarchical: row.is_hierarchical,
    version: row.version,
    scopeType: row.scope_type ?? "global",
  };
}

function toValue(row: ValueRow, catalogKey: string): ReferenceValue {
  return {
    id: row.id,
    catalogId: row.catalog_id,
    catalogKey,
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
    systemhouseId: row.systemhouse_id ?? null,
  };
}

/** Principal aus der lokalen Supabase-Session; keine Autorisierungsentscheidung. */
export async function getPrincipalId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * Eigene aktive Memberships. Die Tabelle ist self-only per RLS; dieser Kontext
 * partitioniert Cache und UI, ersetzt aber niemals die DB-RLS.
 */
export async function getAccessContext(): Promise<ReferenceDataAccessContext> {
  const principalId = await getPrincipalId();
  if (!principalId) {
    throw new ReferenceDataError("REFDATA_AUTH_REQUIRED", "Anmeldung für Katalogzugriff erforderlich.");
  }

  const { data, error } = await supabase
    .from("systemhouse_membership")
    .select("systemhouse_id,status,valid_from,valid_to")
    .eq("user_id", principalId);

  if (error) {
    throw new ReferenceDataError("REFDATA_SCOPE_FETCH_FAILED", error.message, { cause: error });
  }

  const now = Date.now();
  const systemhouseIds = ((data ?? []) as MembershipRow[])
    .filter((row) => {
      if (row.status !== "active") return false;
      const from = row.valid_from ? Date.parse(row.valid_from) : null;
      const to = row.valid_to ? Date.parse(row.valid_to) : null;
      return (from === null || from <= now) && (to === null || to > now);
    })
    .map((row) => row.systemhouse_id)
    .filter((value, index, all) => all.indexOf(value) === index)
    .sort();

  return { principalId, systemhouseIds };
}

export async function fetchAll(
  suppliedContext?: ReferenceDataAccessContext,
): Promise<{
  context: ReferenceDataAccessContext;
  catalogs: ReferenceCatalog[];
  values: ReferenceValue[];
}> {
  const context = suppliedContext ?? (await getAccessContext());
  const [catalogRes, valueRes] = await Promise.all([
    supabase.from("reference_catalog").select("*").order("key", { ascending: true }),
    supabase.from("reference_value").select("*").order("sort_order", { ascending: true }),
  ]);
  if (catalogRes.error) {
    throw new ReferenceDataError("REFDATA_CATALOG_FETCH_FAILED", catalogRes.error.message, {
      cause: catalogRes.error,
    });
  }
  if (valueRes.error) {
    throw new ReferenceDataError("REFDATA_VALUE_FETCH_FAILED", valueRes.error.message, {
      cause: valueRes.error,
    });
  }

  const catalogs = ((catalogRes.data ?? []) as CatalogRow[]).map(toCatalog);
  const keyById = new Map(catalogs.map((catalog) => [catalog.id, catalog.key]));
  const values = ((valueRes.data ?? []) as ValueRow[]).map((row) =>
    toValue(row, keyById.get(row.catalog_id) ?? ""),
  );
  return { context, catalogs, values };
}

export interface ValueWritePayload {
  catalogId: string;
  key: string;
  label: string;
  description?: string;
  sortOrder?: number;
  isDefault?: boolean;
  attributes?: Record<string, unknown>;
  systemhouseId?: string | null;
}

export async function insertValue(payload: ValueWritePayload, actorId: string): Promise<void> {
  const row = {
    catalog_id: payload.catalogId,
    key: payload.key,
    label: payload.label,
    description: payload.description ?? "",
    sort_order: payload.sortOrder ?? 0,
    is_default: payload.isDefault ?? false,
    attributes: (payload.attributes ?? {}) as Json,
    systemhouse_id: payload.systemhouseId ?? null,
    created_by: actorId,
    updated_by: actorId,
  } as unknown as TablesInsert<"reference_value">;

  const { error } = await supabase.from("reference_value").insert(row);
  if (error) {
    throw new ReferenceDataError("REFDATA_VALUE_INSERT_FAILED", error.message, { cause: error });
  }
}

export async function updateValueRow(
  id: string,
  patch: Partial<Omit<ValueWritePayload, "catalogId" | "systemhouseId">> & {
    isActive?: boolean;
    validTo?: string;
  },
  actorId: string,
): Promise<void> {
  const row: TablesUpdate<"reference_value"> = { updated_by: actorId };
  if (patch.key !== undefined) row["key"] = patch.key;
  if (patch.label !== undefined) row["label"] = patch.label;
  if (patch.description !== undefined) row["description"] = patch.description;
  if (patch.sortOrder !== undefined) row["sort_order"] = patch.sortOrder;
  if (patch.isDefault !== undefined) row["is_default"] = patch.isDefault;
  if (patch.attributes !== undefined) row["attributes"] = patch.attributes as Json;
  if (patch.isActive !== undefined) row["is_active"] = patch.isActive;
  if (patch.validTo !== undefined) row["valid_to"] = patch.validTo;

  const { error } = await supabase.from("reference_value").update(row).eq("id", id);
  if (error) {
    throw new ReferenceDataError("REFDATA_VALUE_UPDATE_FAILED", error.message, { cause: error });
  }
}
