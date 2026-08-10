/**
 * Vertragstests des Reference-Data-Plattformdienstes (Sprint 07B).
 *
 * Getestet wird der Servicevertrag aus `docs/REFERENCE-DATA.md`:
 * Sortierung, Aktiv-/Inaktiv-Filter, Katalogversion, Read-Through-Cache,
 * Offline-Verhalten und die Sperre für Schreiboperationen ohne Verbindung.
 * Der Supabase-Adapter ist gemockt — es gibt keinen Netzwerkzugriff.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReferenceDataError } from "@/lib/errors";
import { CACHE_KEY, MAX_CACHE_AGE_MS } from "@/lib/reference-data/cache";
import type { ReferenceCatalog, ReferenceValue } from "@/lib/reference-data/types";

const fetchAll = vi.fn();
const insertValue = vi.fn();
const updateValueRow = vi.fn();

vi.mock("@/lib/reference-data/adapter", () => ({
  fetchAll: (...args: unknown[]) => fetchAll(...args),
  insertValue: (...args: unknown[]) => insertValue(...args),
  updateValueRow: (...args: unknown[]) => updateValueRow(...args),
}));

import * as service from "@/lib/reference-data";

const CATALOG_ID = "11111111-1111-1111-1111-111111111111";

function catalog(overrides: Partial<ReferenceCatalog> = {}): ReferenceCatalog {
  return {
    id: CATALOG_ID,
    key: "avkk.competence_rating",
    name: "Kompetenzbewertung",
    description: "",
    domain: "avkk",
    isSystem: true,
    isHierarchical: false,
    version: 3,
    ...overrides,
  };
}

function value(overrides: Partial<ReferenceValue> = {}): ReferenceValue {
  return {
    id: crypto.randomUUID(),
    catalogId: CATALOG_ID,
    catalogKey: "avkk.competence_rating",
    key: "full",
    label: "Vorhanden",
    description: "",
    sortOrder: 10,
    isActive: true,
    isDefault: false,
    parentValueId: null,
    attributes: {},
    validFrom: "2026-08-01T00:00:00.000Z",
    validTo: null,
    ...overrides,
  };
}

function setOnline(online: boolean): void {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value: online });
}

const DEFAULT_VALUES = [
  value({ key: "partial", label: "Teilweise", sortOrder: 20 }),
  value({ key: "full", label: "Vorhanden", sortOrder: 10 }),
  value({ key: "legacy", label: "Alt", sortOrder: 5, isActive: false }),
];

beforeEach(() => {
  vi.clearAllMocks();
  setOnline(true);
  window.localStorage.clear();
  service.resetForTests();
  fetchAll.mockResolvedValue({ catalogs: [catalog()], values: DEFAULT_VALUES });
});

afterEach(() => {
  service.resetForTests();
});

describe("ReferenceDataService — Lesen", () => {
  it("should_returnOnlyActiveValues_when_listValuesCalledWithoutOptions", async () => {
    const values = await service.listValues("avkk.competence_rating");
    expect(values.map((v) => v.key)).toEqual(["full", "partial"]);
  });

  it("should_includeDeactivatedValues_when_includeInactiveRequested", async () => {
    const values = await service.listValues("avkk.competence_rating", { includeInactive: true });
    expect(values.map((v) => v.key)).toEqual(["legacy", "full", "partial"]);
  });

  it("should_sortBySortOrder_when_listValuesCalled", async () => {
    const values = await service.listValues("avkk.competence_rating", { includeInactive: true });
    expect(values.map((v) => v.sortOrder)).toEqual([5, 10, 20]);
  });

  it("should_returnEmptyList_when_catalogKeyUnknown", async () => {
    await expect(service.listValues("avkk.unknown")).resolves.toEqual([]);
  });

  it("should_returnCatalogVersion_when_catalogExists", async () => {
    await expect(service.getCatalogVersion("avkk.competence_rating")).resolves.toBe(3);
    await expect(service.getCatalogVersion("avkk.unknown")).resolves.toBeNull();
  });

  it("should_filterCatalogsByDomain_when_domainGiven", async () => {
    fetchAll.mockResolvedValue({
      catalogs: [catalog(), catalog({ id: "c2", key: "core.unit", domain: "core" })],
      values: [],
    });
    const avkk = await service.listCatalogs("avkk");
    expect(avkk.map((c) => c.key)).toEqual(["avkk.competence_rating"]);
    await expect(service.listCatalogs()).resolves.toHaveLength(2);
  });

  it("should_returnNull_when_getValueMissesKey", async () => {
    await expect(service.getValue("avkk.competence_rating", "nope")).resolves.toBeNull();
  });

  it("should_throwValueUnknown_when_requireValueMissesKey", async () => {
    await expect(service.requireValue("avkk.competence_rating", "nope")).rejects.toMatchObject({
      code: "REFDATA_VALUE_UNKNOWN",
    });
  });

  it("should_resolveDeactivatedValue_when_requireValueUsedForHistoricKey", async () => {
    // Snapshot-Schreibpfade müssen auch auf deaktivierte Werte verweisen können.
    const legacy = await service.requireValue("avkk.competence_rating", "legacy");
    expect(legacy.isActive).toBe(false);
  });
});

describe("ReferenceDataService — Cache und Offline", () => {
  it("should_hitAdapterOnce_when_multipleReadsShareState", async () => {
    await service.listValues("avkk.competence_rating");
    await service.listCatalogs();
    expect(fetchAll).toHaveBeenCalledTimes(1);
  });

  it("should_persistSnapshotToCache_when_loadedFromNetwork", async () => {
    await service.listCatalogs();
    const raw = window.localStorage.getItem(CACHE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string)).toMatchObject({ cacheVersion: 1 });
  });

  it("should_serveFromCacheWithoutNetwork_when_offlineAndCacheFresh", async () => {
    await service.listCatalogs();
    service.resetForTests();
    // resetForTests leert den Cache — Cache erneut aufbauen und dann offline gehen.
    await service.listCatalogs();
    fetchAll.mockClear();
    setOnline(false);
    service.resetForTests();
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        cacheVersion: 1,
        fetchedAt: new Date().toISOString(),
        catalogs: [catalog()],
        values: DEFAULT_VALUES,
      }),
    );
    const values = await service.listValues("avkk.competence_rating");
    expect(values).toHaveLength(2);
    expect(fetchAll).not.toHaveBeenCalled();
    expect(service.currentState()?.source).toBe("cache");
  });

  it("should_markStale_when_cacheOlderThanMaxAgeAndOffline", async () => {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        cacheVersion: 1,
        fetchedAt: new Date(Date.now() - MAX_CACHE_AGE_MS - 1000).toISOString(),
        catalogs: [catalog()],
        values: DEFAULT_VALUES,
      }),
    );
    setOnline(false);
    await service.listCatalogs();
    expect(service.currentState()?.stale).toBe(true);
  });

  it("should_throwUnavailableOffline_when_noCacheAndOffline", async () => {
    setOnline(false);
    await expect(service.listCatalogs()).rejects.toBeInstanceOf(ReferenceDataError);
    await expect(service.listCatalogs()).rejects.toMatchObject({
      code: "REFDATA_UNAVAILABLE_OFFLINE",
    });
  });

  it("should_fallBackToCache_when_networkFetchFails", async () => {
    await service.listCatalogs();
    const snapshot = window.localStorage.getItem(CACHE_KEY) as string;
    service.resetForTests();
    window.localStorage.setItem(CACHE_KEY, snapshot);
    fetchAll.mockRejectedValue(new Error("network down"));
    await service.refresh();
    expect(service.currentState()?.source).toBe("cache");
    expect(service.currentState()?.stale).toBe(true);
  });

  it("should_propagateAdapterError_when_networkFailsWithoutCache", async () => {
    fetchAll.mockRejectedValue(
      new ReferenceDataError("REFDATA_CATALOG_FETCH_FAILED", "permission denied"),
    );
    await expect(service.listCatalogs()).rejects.toMatchObject({
      code: "REFDATA_CATALOG_FETCH_FAILED",
    });
  });

  it("should_ignoreCorruptCache_when_contentUnparsable", async () => {
    window.localStorage.setItem(CACHE_KEY, "{ kaputt");
    await expect(service.listCatalogs()).resolves.toHaveLength(1);
    expect(fetchAll).toHaveBeenCalledTimes(1);
  });
});

describe("ReferenceDataService — Pflege", () => {
  it("should_insertAndRefresh_when_createValueOnline", async () => {
    await service.createValue({ catalogId: CATALOG_ID, key: "new", label: "Neu" }, "actor-1");
    expect(insertValue).toHaveBeenCalledWith(
      { catalogId: CATALOG_ID, key: "new", label: "Neu" },
      "actor-1",
    );
    expect(fetchAll).toHaveBeenCalled();
  });

  it("should_deactivateInsteadOfDelete_when_deactivateValueCalled", async () => {
    await service.deactivateValue("value-1", "actor-1");
    const [id, patch] = updateValueRow.mock.calls[0] as [string, Record<string, unknown>];
    expect(id).toBe("value-1");
    expect(patch["isActive"]).toBe(false);
    expect(typeof patch["validTo"]).toBe("string");
  });

  it("should_rejectWrite_when_offline", async () => {
    setOnline(false);
    for (const call of [
      () => service.createValue({ catalogId: CATALOG_ID, key: "x", label: "X" }, "a"),
      () => service.updateValue("v", { label: "X" }, "a"),
      () => service.deactivateValue("v", "a"),
    ]) {
      await expect(call()).rejects.toMatchObject({ code: "REFDATA_OFFLINE_READONLY" });
    }
    expect(insertValue).not.toHaveBeenCalled();
    expect(updateValueRow).not.toHaveBeenCalled();
  });

  it("should_propagateWriteFailure_when_adapterRejects", async () => {
    updateValueRow.mockRejectedValue(
      new ReferenceDataError("REFDATA_VALUE_UPDATE_FAILED", "row level security"),
    );
    await expect(service.updateValue("v", { label: "X" }, "a")).rejects.toMatchObject({
      code: "REFDATA_VALUE_UPDATE_FAILED",
    });
  });
});
