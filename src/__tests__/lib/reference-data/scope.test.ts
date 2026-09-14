/**
 * BSF-03D (#103) — Systemhaus-Scope im Reference-Data-Vertrag.
 *
 * Vertrag: Kataloge tragen `scopeType`, Werte tragen `systemhouseId`.
 * Globale AVKK-Kataloge bleiben unverändert (systemhouseId = null).
 * Der Adapter reicht `systemhouse_id` beim Insert durch, damit der DB-Trigger
 * `reference_value_validate_scope` systemhausbezogene Werte akzeptiert.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const inserted: Array<Record<string, unknown>> = [];
const catalogRows: Array<Record<string, unknown>> = [];
const valueRows: Array<Record<string, unknown>> = [];

vi.mock("@/integrations/supabase/client", () => {
  function builder(table: string) {
    const rows = table === "reference_catalog" ? catalogRows : valueRows;
    const b: Record<string, unknown> = {
      select: () => b,
      order: () => b,
      eq: () => b,
      insert: (row: Record<string, unknown>) => {
        inserted.push(row);
        return Promise.resolve({ error: null });
      },
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: rows, error: null }).then(resolve),
    };
    return b;
  }
  return { supabase: { from: (table: string) => builder(table) } };
});

import * as adapter from "@/lib/reference-data/adapter";
import { CATALOG_KEYS } from "@/lib/reference-data/types";

const SH = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

beforeEach(() => {
  inserted.length = 0;
  catalogRows.length = 0;
  valueRows.length = 0;
});

describe("Reference-Data Scope-Vertrag", () => {
  it("should_exposeWorkPackageCategoryCatalogKey", () => {
    expect(CATALOG_KEYS.workPackageCategory).toBe("workpackage.category");
  });

  it("should_mapScopeTypeAndSystemhouseId_when_fetchAll", async () => {
    catalogRows.push(
      {
        id: "c-global",
        key: "avkk.competence_rating",
        name: "K",
        description: "",
        domain: "avkk",
        is_system: true,
        is_hierarchical: false,
        version: 1,
        scope_type: "global",
      },
      {
        id: "c-sh",
        key: "workpackage.category",
        name: "Kategorien",
        description: "",
        domain: "project",
        is_system: false,
        is_hierarchical: false,
        version: 1,
        scope_type: "systemhouse",
      },
    );
    valueRows.push(
      {
        id: "v1",
        catalog_id: "c-global",
        key: "full",
        label: "Voll",
        description: "",
        sort_order: 1,
        is_active: true,
        is_default: false,
        parent_value_id: null,
        attributes: {},
        valid_from: "2026-01-01",
        valid_to: null,
        systemhouse_id: null,
      },
      {
        id: "v2",
        catalog_id: "c-sh",
        key: "netzwerk",
        label: "Netzwerk",
        description: "",
        sort_order: 1,
        is_active: true,
        is_default: false,
        parent_value_id: null,
        attributes: {},
        valid_from: "2026-01-01",
        valid_to: null,
        systemhouse_id: SH,
      },
    );

    const { catalogs, values } = await adapter.fetchAll();
    expect(catalogs.find((c) => c.key === "avkk.competence_rating")?.scopeType).toBe("global");
    expect(catalogs.find((c) => c.key === "workpackage.category")?.scopeType).toBe("systemhouse");
    expect(values.find((v) => v.key === "full")?.systemhouseId).toBeNull();
    expect(values.find((v) => v.key === "netzwerk")?.systemhouseId).toBe(SH);
  });

  it("should_defaultToGlobalScope_when_legacyRowsLackScopeColumns", async () => {
    // Alte Cache-/DB-Zeilen ohne Scope-Spalten dürfen nicht brechen.
    catalogRows.push({
      id: "c-old",
      key: "avkk.schedule_impact",
      name: "S",
      description: "",
      domain: "avkk",
      is_system: true,
      is_hierarchical: false,
      version: 2,
    });
    valueRows.push({
      id: "v-old",
      catalog_id: "c-old",
      key: "none",
      label: "Keine",
      description: "",
      sort_order: 1,
      is_active: true,
      is_default: false,
      parent_value_id: null,
      attributes: {},
      valid_from: "2026-01-01",
      valid_to: null,
    });
    const { catalogs, values } = await adapter.fetchAll();
    expect(catalogs[0]?.scopeType).toBe("global");
    expect(values[0]?.systemhouseId).toBeNull();
  });

  it("should_sendSystemhouseId_when_insertingSystemhouseScopedValue", async () => {
    await adapter.insertValue(
      { catalogId: "c-sh", key: "netzwerk", label: "Netzwerk", systemhouseId: SH },
      "actor-1",
    );
    expect(inserted[0]).toMatchObject({ catalog_id: "c-sh", key: "netzwerk", systemhouse_id: SH });
  });

  it("should_sendNullSystemhouseId_when_insertingGlobalValue", async () => {
    await adapter.insertValue({ catalogId: "c-global", key: "x", label: "X" }, "actor-1");
    expect(inserted[0]).toMatchObject({ systemhouse_id: null });
  });
});
