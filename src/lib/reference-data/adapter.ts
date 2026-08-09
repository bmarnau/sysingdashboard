/**
 * Supabase-Adapter für Reference Data.
 *
 * Einziger Ort in dieser Domäne, der den Supabase-Client kennt. Alles darüber
 * (Repository, Service, Hooks) arbeitet ausschließlich mit Domänentypen.
 */

import { supabase } from "@/integrations/supabase/client";
import { ReferenceDataError } from "@/lib/errors";
import type { ReferenceCatalog, ReferenceValue } from "./types";

interface CatalogRow {
  id: string;
  key: string;
  name: string;
  description: string;
  domain: string;
  is_system: boolean;
  is_hierarchical: boolean;
  version: number;
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
  };
}

export async function fetchAll(): Promise<{
  catalogs: ReferenceCatalog[];
  values: ReferenceValue[];
}> {
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
  const keyById = new Map(catalogs.map((c) => [c.id, c.key]));
  const values = ((valueRes.data ?? []) as ValueRow[]).map((r) =>
    toValue(r, keyById.get(r.catalog_id) ?? ""),
  );
  return { catalogs, values };
}

export interface ValueWritePayload {
  catalogId: string;
  key: string;
  label: string;
  description?: string;
  sortOrder?: number;
  isDefault?: boolean;
  attributes?: Record<string, unknown>;
}

export async function insertValue(payload: ValueWritePayload, actorId: string): Promise<void> {
  const { error } = await supabase.from("reference_value").insert({
    catalog_id: payload.catalogId,
    key: payload.key,
    label: payload.label,
    description: payload.description ?? "",
    sort_order: payload.sortOrder ?? 0,
    is_default: payload.isDefault ?? false,
    attributes: payload.attributes ?? {},
    created_by: actorId,
    updated_by: actorId,
  });
  if (error) {
    throw new ReferenceDataError("REFDATA_VALUE_INSERT_FAILED", error.message, { cause: error });
  }
}

export async function updateValueRow(
  id: string,
  patch: Partial<Omit<ValueWritePayload, "catalogId">> & { isActive?: boolean; validTo?: string },
  actorId: string,
): Promise<void> {
  const row: Record<string, unknown> = { updated_by: actorId };
  if (patch.key !== undefined) row["key"] = patch.key;
  if (patch.label !== undefined) row["label"] = patch.label;
  if (patch.description !== undefined) row["description"] = patch.description;
  if (patch.sortOrder !== undefined) row["sort_order"] = patch.sortOrder;
  if (patch.isDefault !== undefined) row["is_default"] = patch.isDefault;
  if (patch.attributes !== undefined) row["attributes"] = patch.attributes;
  if (patch.isActive !== undefined) row["is_active"] = patch.isActive;
  if (patch.validTo !== undefined) row["valid_to"] = patch.validTo;

  const { error } = await supabase.from("reference_value").update(row).eq("id", id);
  if (error) {
    throw new ReferenceDataError("REFDATA_VALUE_UPDATE_FAILED", error.message, { cause: error });
  }
}
