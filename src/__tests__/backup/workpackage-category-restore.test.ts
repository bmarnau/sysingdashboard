/**
 * BSF-03D (#103) — Backup/Restore: Kategorie-Referenzen nur fail-safe melden.
 * Bestehende Backups ohne Kategorie und ohne Reference-Data bleiben gültig.
 */
import { strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { checkWorkPackageCategories } from "@/lib/backup/category-check";
import type { BackupManifestV2 } from "@/lib/backup/types";

function manifest(
  entries: Array<{ logicalName: string; path: string; storageKey: string | null }>,
) {
  return {
    entries: entries.map((e) => ({ ...e, checksum: "", sizeBytes: 0, contentType: "json" })),
  } as unknown as BackupManifestV2;
}

const refData = {
  catalogs: [{ key: "workpackage.category", version: 1 }],
  values: [
    { catalogKey: "workpackage.category", key: "netzwerk", label: "Netzwerk", isActive: true },
    { catalogKey: "workpackage.category", key: "legacy", label: "Alt", isActive: false },
  ],
};

const dashboard = {
  workPackages: [
    { id: "a", title: "A", status: "offen", priority: "mittel", categoryKey: "netzwerk" },
    { id: "b", title: "B", status: "offen", priority: "mittel", categoryKey: "legacy" },
    { id: "c", title: "C", status: "offen", priority: "mittel", categoryKey: "ghost" },
    { id: "d", title: "D", status: "offen", priority: "mittel" },
  ],
};

describe("checkWorkPackageCategories", () => {
  it("should_warnForUnknownAndInactive_butNeverFail", () => {
    const m = manifest([
      {
        logicalName: "dashboard",
        path: "data/dashboard.json",
        storageKey: "northbit-dashboard-v2",
      },
      { logicalName: "reference-data", path: "reference-data.json", storageKey: null },
    ]);
    const zip = {
      "data/dashboard.json": strToU8(JSON.stringify(dashboard)),
      "reference-data.json": strToU8(JSON.stringify(refData)),
    };
    const result = checkWorkPackageCategories(m, zip);
    expect(result.checked).toBe(true);
    expect(result.unknown).toEqual([{ workPackageId: "c", key: "ghost" }]);
    expect(result.inactive).toEqual([{ workPackageId: "b", key: "legacy" }]);
    expect(result.warnings).toHaveLength(2);
  });

  it("should_skipCheck_when_referenceDataMissing", () => {
    const m = manifest([
      {
        logicalName: "dashboard",
        path: "data/dashboard.json",
        storageKey: "northbit-dashboard-v2",
      },
    ]);
    const zip = { "data/dashboard.json": strToU8(JSON.stringify(dashboard)) };
    const result = checkWorkPackageCategories(m, zip);
    expect(result.checked).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it("should_beSilent_when_workPackagesHaveNoCategory", () => {
    const m = manifest([
      {
        logicalName: "dashboard",
        path: "data/dashboard.json",
        storageKey: "northbit-dashboard-v2",
      },
      { logicalName: "reference-data", path: "reference-data.json", storageKey: null },
    ]);
    const zip = {
      "data/dashboard.json": strToU8(
        JSON.stringify({
          workPackages: [{ id: "x", title: "X", status: "offen", priority: "mittel" }],
        }),
      ),
      "reference-data.json": strToU8(JSON.stringify(refData)),
    };
    const result = checkWorkPackageCategories(m, zip);
    expect(result.checked).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("should_notThrow_when_dataUnparsable", () => {
    const m = manifest([
      {
        logicalName: "dashboard",
        path: "data/dashboard.json",
        storageKey: "northbit-dashboard-v2",
      },
      { logicalName: "reference-data", path: "reference-data.json", storageKey: null },
    ]);
    const zip = {
      "data/dashboard.json": strToU8("{ kaputt"),
      "reference-data.json": strToU8(JSON.stringify(refData)),
    };
    expect(() => checkWorkPackageCategories(m, zip)).not.toThrow();
  });
});
