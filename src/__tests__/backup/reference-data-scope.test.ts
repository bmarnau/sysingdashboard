import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const listSubjects = vi.fn();

vi.mock("@/lib/reference-data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/reference-data")>();
  return {
    ...actual,
    ReferenceDataService: {
      ...actual.ReferenceDataService,
      refresh: (...args: unknown[]) => refresh(...args),
    },
  };
});

vi.mock("@/lib/avkk", () => ({
  AvkkService: {
    listSubjects: (...args: unknown[]) => listSubjects(...args),
    getDossier: vi.fn(),
  },
}));

import { collectAvkkPayload, validateAvkkPayload } from "@/lib/backup/avkk-payload";
import { avkkFixture } from "../fixtures/backup";

beforeEach(() => {
  vi.clearAllMocks();
  listSubjects.mockResolvedValue([]);
  refresh.mockResolvedValue({
    source: "network",
    stale: false,
    snapshot: {
      cacheVersion: 2,
      accessContext: { principalId: "user-a", systemhouseIds: ["sh-a"] },
      fetchedAt: "2026-09-13T00:00:00.000Z",
      catalogs: [
        {
          id: "global-catalog",
          key: "avkk.responsibility_role",
          name: "Rollen",
          description: "",
          domain: "avkk",
          isSystem: true,
          isHierarchical: false,
          version: 1,
          scopeType: "global",
        },
        {
          id: "wp-category-catalog",
          key: "workpackage.category",
          name: "Arbeitspaket-Kategorien",
          description: "",
          domain: "project",
          isSystem: false,
          isHierarchical: false,
          version: 2,
          scopeType: "systemhouse",
        },
      ],
      values: [
        {
          id: "wp-category-1",
          catalogId: "wp-category-catalog",
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
        },
      ],
    },
  });
});

describe("Reference Data scope in backup", () => {
  it("exports catalog scope and value systemhouse identity", async () => {
    const result = await collectAvkkPayload();
    expect(result.payload?.referenceData.catalogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "workpackage.category", scopeType: "systemhouse" }),
      ]),
    );
    expect(result.payload?.referenceData.values).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          catalogKey: "workpackage.category",
          key: "incident",
          systemhouseId: "sh-a",
        }),
      ]),
    );
  });

  it("keeps legacy reference-data backup payloads valid", () => {
    const legacy = avkkFixture();
    const result = validateAvkkPayload(legacy.avkk, legacy.referenceData, {
      knownSubjects: new Set(["workpackage:wp-1"]),
    });
    expect(result.ok).toBe(true);
  });
});
