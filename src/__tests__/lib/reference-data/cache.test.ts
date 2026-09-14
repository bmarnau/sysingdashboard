/**
 * BSF-03D Review-Fix Runde 1 (MEDIUM-2) — Rückwärtskompatibilität des
 * Read-Through-Caches.
 *
 * Vor BSF-03D geschriebene v1-Snapshots enthalten weder `scopeType` noch
 * `systemhouseId`. `readCache()` muss diese fail-safe normalisieren
 * (global / null), vorhandene Felder unverändert lassen und kaputte oder
 * inkompatible Inhalte mit `null` beantworten.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { CACHE_KEY, readCache } from "@/lib/reference-data/cache";

const SH = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function legacyCatalog(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    key: "avkk.competence_rating",
    name: "K",
    description: "",
    domain: "avkk",
    isSystem: true,
    isHierarchical: false,
    version: 1,
    ...overrides,
  };
}

function legacyValue(overrides: Record<string, unknown> = {}) {
  return {
    id: "v1",
    catalogId: "c1",
    catalogKey: "avkk.competence_rating",
    key: "full",
    label: "Voll",
    description: "",
    sortOrder: 1,
    isActive: true,
    isDefault: false,
    parentValueId: null,
    attributes: { a: 1 },
    validFrom: "2026-01-01",
    validTo: null,
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("Reference-Data-Cache — Legacy-Normalisierung", () => {
  it("should_defaultScopeFields_when_legacySnapshotLacksThem", () => {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        cacheVersion: 1,
        fetchedAt: new Date().toISOString(),
        catalogs: [legacyCatalog()],
        values: [legacyValue()],
      }),
    );
    const snap = readCache();
    expect(snap).not.toBeNull();
    expect(snap?.catalogs[0]?.scopeType).toBe("global");
    expect(snap?.values[0]?.systemhouseId).toBeNull();
    // Vorhandene Felder bleiben unverändert.
    expect(snap?.values[0]).toMatchObject({ key: "full", attributes: { a: 1 }, isActive: true });
    expect(snap?.catalogs[0]).toMatchObject({ key: "avkk.competence_rating", version: 1 });
  });

  it("should_preserveScopeFields_when_systemhouseSnapshotPresent", () => {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        cacheVersion: 1,
        fetchedAt: new Date().toISOString(),
        catalogs: [
          legacyCatalog({ id: "c2", key: "workpackage.category", scopeType: "systemhouse" }),
        ],
        values: [legacyValue({ id: "v2", catalogId: "c2", key: "netzwerk", systemhouseId: SH })],
      }),
    );
    const snap = readCache();
    expect(snap?.catalogs[0]?.scopeType).toBe("systemhouse");
    expect(snap?.values[0]?.systemhouseId).toBe(SH);
  });

  it("should_coerceUnknownScopeType_toGlobal", () => {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        cacheVersion: 1,
        fetchedAt: new Date().toISOString(),
        catalogs: [legacyCatalog({ scopeType: "banana" })],
        values: [legacyValue({ systemhouseId: 42 })],
      }),
    );
    const snap = readCache();
    expect(snap?.catalogs[0]?.scopeType).toBe("global");
    expect(snap?.values[0]?.systemhouseId).toBeNull();
  });

  it("should_returnNull_when_cacheCorruptOrIncompatible", () => {
    window.localStorage.setItem(CACHE_KEY, "{ kaputt");
    expect(readCache()).toBeNull();

    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ cacheVersion: 99, values: [] }));
    expect(readCache()).toBeNull();

    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ cacheVersion: 1, values: "x" }));
    expect(readCache()).toBeNull();

    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ cacheVersion: 1, fetchedAt: "x", values: [], catalogs: "nope" }),
    );
    expect(readCache()).toBeNull();

    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ cacheVersion: 1, fetchedAt: "x", values: [null], catalogs: [] }),
    );
    expect(readCache()).toBeNull();
  });
});
