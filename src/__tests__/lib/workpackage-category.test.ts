/**
 * BSF-03D (#103) — providerneutrale Fachlogik für Arbeitspaket-Kategorien.
 *
 * Vertrag: genau eine optionale primäre Kategorie über stabilen Key;
 * Default keine Kategorie; deaktivierte/unbekannte Keys bleiben nachvollziehbar
 * und werden nie still umgedeutet. Keine Ableitung von billable/Priorität/Status.
 */
import { describe, expect, it } from "vitest";
import type { WorkPackage } from "@/lib/dashboard-data";
import type { ReferenceValue } from "@/lib/reference-data";
import {
  categoryDisplayLabel,
  categoryKeyOf,
  groupByCategoryKey,
  NO_CATEGORY_LABEL,
  resolveCategory,
  selectableCategoryValues,
  validateCategoryKeys,
} from "@/lib/workpackage-category";
import { makeWorkPackage } from "../fixtures/workpackages";

function value(overrides: Partial<ReferenceValue>): ReferenceValue {
  return {
    id: overrides.key ?? "id",
    catalogId: "cat",
    catalogKey: "workpackage.category",
    key: "k",
    label: "L",
    description: "",
    sortOrder: 0,
    isActive: true,
    isDefault: false,
    parentValueId: null,
    attributes: {},
    validFrom: "2026-01-01",
    validTo: null,
    systemhouseId: "sh-1",
    ...overrides,
  };
}

const values = [
  value({ key: "netzwerk", label: "Netzwerk", sortOrder: 1 }),
  value({ key: "legacy", label: "Altkategorie", sortOrder: 2, isActive: false }),
];

describe("WorkPackage.categoryKey", () => {
  it("should_defaultToNoCategory_when_fieldMissingOrNull", () => {
    expect(categoryKeyOf(makeWorkPackage())).toBeNull();
    expect(categoryKeyOf(makeWorkPackage({ categoryKey: null }))).toBeNull();
    expect(categoryKeyOf(makeWorkPackage({ categoryKey: "" }))).toBeNull();
    expect(categoryKeyOf(makeWorkPackage({ categoryKey: "netzwerk" }))).toBe("netzwerk");
  });

  it("should_keepTagsIndependent_when_categorySet", () => {
    const wp: WorkPackage = makeWorkPackage({ categoryKey: "netzwerk", tags: ["a", "b"] });
    expect(wp.tags).toEqual(["a", "b"]);
    expect(wp.priority).toBe("mittel");
    expect(wp.status).toBe("offen");
  });
});

describe("resolveCategory", () => {
  it("should_returnNone_when_noCategory", () => {
    expect(resolveCategory(makeWorkPackage(), values)).toEqual({ state: "none", key: null });
    expect(categoryDisplayLabel(makeWorkPackage(), values)).toBe(NO_CATEGORY_LABEL);
  });

  it("should_returnActive_when_keyMatchesActiveValue", () => {
    const r = resolveCategory(makeWorkPackage({ categoryKey: "netzwerk" }), values);
    expect(r.state).toBe("active");
    expect(r.key).toBe("netzwerk");
    expect(r.state === "active" && r.value.label).toBe("Netzwerk");
  });

  it("should_returnInactive_when_keyMatchesDeactivatedValue", () => {
    const wp = makeWorkPackage({ categoryKey: "legacy" });
    expect(resolveCategory(wp, values).state).toBe("inactive");
    expect(categoryDisplayLabel(wp, values)).toBe("Altkategorie (deaktiviert)");
  });

  it("should_returnUnknown_when_keyNotInCatalog", () => {
    const wp = makeWorkPackage({ categoryKey: "ghost" });
    expect(resolveCategory(wp, values)).toEqual({ state: "unknown", key: "ghost" });
    expect(categoryDisplayLabel(wp, values)).toBe("Unbekannte Kategorie (ghost)");
  });
});

describe("selectableCategoryValues", () => {
  it("should_listOnlyActiveValues_plusCurrentInactiveOne", () => {
    expect(selectableCategoryValues(values, null).map((v) => v.key)).toEqual(["netzwerk"]);
    expect(selectableCategoryValues(values, "legacy").map((v) => v.key)).toEqual([
      "netzwerk",
      "legacy",
    ]);
  });
});

describe("validateCategoryKeys (Import/Restore fail-safe)", () => {
  it("should_reportUnknownAndInactive_withoutChangingValues", () => {
    const wps = [
      makeWorkPackage({ id: "a", categoryKey: "netzwerk" }),
      makeWorkPackage({ id: "b", categoryKey: "legacy" }),
      makeWorkPackage({ id: "c", categoryKey: "ghost" }),
      makeWorkPackage({ id: "d" }),
    ];
    const report = validateCategoryKeys(wps, values);
    expect(report.unknown).toEqual([{ workPackageId: "c", key: "ghost" }]);
    expect(report.inactive).toEqual([{ workPackageId: "b", key: "legacy" }]);
    expect(report.warnings.length).toBe(2);
    expect(wps[2]?.categoryKey).toBe("ghost");
  });

  it("should_returnNoWarnings_when_catalogUnavailable", () => {
    const report = validateCategoryKeys([makeWorkPackage({ categoryKey: "x" })], null);
    expect(report.warnings).toEqual([]);
    expect(report.unknown).toEqual([]);
  });
});

describe("groupByCategoryKey (Controlling-Vorbereitung #106)", () => {
  it("should_groupWorkPackagesByStableKey_withNullBucket", () => {
    const groups = groupByCategoryKey([
      makeWorkPackage({ id: "1", categoryKey: "netzwerk" }),
      makeWorkPackage({ id: "2", categoryKey: "netzwerk" }),
      makeWorkPackage({ id: "3" }),
    ]);
    expect(groups.get("netzwerk")?.map((w) => w.id)).toEqual(["1", "2"]);
    expect(groups.get(null)?.map((w) => w.id)).toEqual(["3"]);
  });
});
