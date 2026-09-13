import { beforeEach, describe, expect, it } from "vitest";
import {
  CACHE_VERSION,
  LEGACY_CACHE_KEY,
  cacheKey,
  readCache,
  readLatestCacheForPrincipal,
  writeCache,
} from "@/lib/reference-data/cache";
import type { ReferenceDataAccessContext, ReferenceDataSnapshot } from "@/lib/reference-data/types";

const contextA: ReferenceDataAccessContext = {
  principalId: "user-a",
  systemhouseIds: ["sh-a"],
};
const contextB: ReferenceDataAccessContext = {
  principalId: "user-b",
  systemhouseIds: ["sh-b"],
};

function snapshot(
  context: ReferenceDataAccessContext,
  fetchedAt = "2026-09-13T12:00:00.000Z",
): ReferenceDataSnapshot {
  return {
    cacheVersion: 2,
    accessContext: context,
    fetchedAt,
    catalogs: [],
    values: [],
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("Reference Data cache v2", () => {
  it("partitions cache by principal and normalized systemhouse scope", () => {
    expect(CACHE_VERSION).toBe(2);
    expect(cacheKey({ principalId: "user-a", systemhouseIds: ["sh-b", "sh-a"] })).toBe(
      cacheKey({ principalId: "user-a", systemhouseIds: ["sh-a", "sh-b"] }),
    );
    expect(cacheKey(contextA)).not.toBe(cacheKey(contextB));
  });

  it("never returns cache from another principal", () => {
    writeCache(contextA, snapshot(contextA));
    expect(readCache(contextB)).toBeNull();
    expect(readLatestCacheForPrincipal("user-b")).toBeNull();
  });

  it("does not reuse cache when the exact systemhouse scope changed", () => {
    writeCache(contextA, snapshot(contextA));
    expect(readCache({ principalId: "user-a", systemhouseIds: ["sh-other"] })).toBeNull();
  });

  it("returns only the newest cache belonging to the same principal", () => {
    const oldContext = { principalId: "user-a", systemhouseIds: ["sh-old"] };
    const newContext = { principalId: "user-a", systemhouseIds: ["sh-new"] };
    writeCache(oldContext, snapshot(oldContext, "2026-09-12T12:00:00.000Z"));
    writeCache(newContext, snapshot(newContext, "2026-09-13T12:00:00.000Z"));

    expect(readLatestCacheForPrincipal("user-a")?.accessContext).toEqual(newContext);
  });

  it("ignores legacy v1 cache for tenant-scoped reads", () => {
    window.localStorage.setItem(
      LEGACY_CACHE_KEY,
      JSON.stringify({
        cacheVersion: 1,
        fetchedAt: new Date().toISOString(),
        catalogs: [],
        values: [],
      }),
    );
    expect(readLatestCacheForPrincipal("user-a")).toBeNull();
  });
});
