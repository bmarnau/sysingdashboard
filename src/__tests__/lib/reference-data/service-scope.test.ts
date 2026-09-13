import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ReferenceCatalog,
  ReferenceDataAccessContext,
  ReferenceValue,
} from "@/lib/reference-data/types";

const getPrincipalId = vi.fn();
const getAccessContext = vi.fn();
const fetchAll = vi.fn();
const insertValue = vi.fn();
const updateValueRow = vi.fn();

vi.mock("@/lib/reference-data/adapter", () => ({
  getPrincipalId: (...args: unknown[]) => getPrincipalId(...args),
  getAccessContext: (...args: unknown[]) => getAccessContext(...args),
  fetchAll: (...args: unknown[]) => fetchAll(...args),
  insertValue: (...args: unknown[]) => insertValue(...args),
  updateValueRow: (...args: unknown[]) => updateValueRow(...args),
}));

import * as service from "@/lib/reference-data";

const context: ReferenceDataAccessContext = {
  principalId: "user-a",
  systemhouseIds: ["sh-a", "sh-b"],
};

const globalCatalog: ReferenceCatalog = {
  id: "catalog-global",
  key: "avkk.competence_rating",
  name: "Kompetenz",
  description: "",
  domain: "avkk",
  isSystem: true,
  isHierarchical: false,
  version: 1,
  scopeType: "global",
};

const categoryCatalog: ReferenceCatalog = {
  id: "catalog-category",
  key: "workpackage.category",
  name: "Arbeitspaket-Kategorien",
  description: "",
  domain: "project",
  isSystem: false,
  isHierarchical: false,
  version: 1,
  scopeType: "systemhouse",
};

function value(overrides: Partial<ReferenceValue>): ReferenceValue {
  return {
    id: crypto.randomUUID(),
    catalogId: "catalog-category",
    catalogKey: "workpackage.category",
    key: "incident",
    label: "Störung",
    description: "",
    sortOrder: 10,
    isActive: true,
    isDefault: false,
    parentValueId: null,
    attributes: {},
    validFrom: "2026-09-13T00:00:00.000Z",
    validTo: null,
    systemhouseId: "sh-a",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
  service.resetForTests();
  getPrincipalId.mockResolvedValue(context.principalId);
  getAccessContext.mockResolvedValue(context);
  fetchAll.mockResolvedValue({
    context,
    catalogs: [globalCatalog, categoryCatalog],
    values: [
      value({ id: "a1", key: "incident", systemhouseId: "sh-a" }),
      value({ id: "a2", key: "change", label: "Änderung", systemhouseId: "sh-a" }),
      value({ id: "b1", key: "maintenance", label: "Wartung", systemhouseId: "sh-b" }),
      value({
        id: "g1",
        catalogId: "catalog-global",
        catalogKey: "avkk.competence_rating",
        key: "full",
        label: "Vorhanden",
        systemhouseId: null,
      }),
    ],
  });
});

afterEach(() => service.resetForTests());

describe("ReferenceDataService systemhouse scope", () => {
  it("requires explicit systemhouseId for systemhouse-scoped catalogs", async () => {
    await expect(service.listValues("workpackage.category")).resolves.toEqual([]);
  });

  it("returns only values from the requested systemhouse", async () => {
    const values = await service.listValues("workpackage.category", { systemhouseId: "sh-a" });
    expect(values.map((entry) => entry.key)).toEqual(["incident", "change"]);
    expect(values.every((entry) => entry.systemhouseId === "sh-a")).toBe(true);
  });

  it("preserves global catalog behavior", async () => {
    const values = await service.listValues("avkk.competence_rating");
    expect(values.map((entry) => entry.key)).toEqual(["full"]);
  });

  it("returns no values for a systemhouse outside the access context", async () => {
    await expect(
      service.listValues("workpackage.category", { systemhouseId: "sh-foreign" }),
    ).resolves.toEqual([]);
  });

  it("passes systemhouseId to category inserts", async () => {
    await service.createValue(
      {
        catalogId: categoryCatalog.id,
        key: "offer",
        label: "Angebot",
        systemhouseId: "sh-a",
      },
      "user-a",
    );
    expect(insertValue).toHaveBeenCalledWith(
      expect.objectContaining({ systemhouseId: "sh-a", key: "offer" }),
      "user-a",
    );
  });
});
