import { describe, expect, it } from "vitest";
import { emptyWP, normalizeWorkPackage } from "@/components/dashboard/domain";
import {
  resolveWorkPackageCategory,
  selectableWorkPackageCategories,
} from "@/lib/reference-data/workpackage-category";
import type { ReferenceValue } from "@/lib/reference-data";

function category(overrides: Partial<ReferenceValue> = {}): ReferenceValue {
  return {
    id: "category-1",
    catalogId: "workpackage-category-catalog",
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

describe("WorkPackage category contract", () => {
  it("defaults a new work package to no category", () => {
    expect(emptyWP()).toMatchObject({ categoryKey: null, categoryLabel: null });
  });

  it("resolves an active category to its current label and marks it selectable", () => {
    expect(
      resolveWorkPackageCategory({ categoryKey: "incident", categoryLabel: "Alter Anzeigename" }, [
        category(),
      ]),
    ).toEqual({ categoryKey: "incident", categoryLabel: "Störung", selectable: true });
  });

  it("keeps the historic snapshot of an inactive category but does not make it selectable", () => {
    expect(
      resolveWorkPackageCategory({ categoryKey: "legacy", categoryLabel: "Training" }, [
        category({ key: "legacy", label: "Training neu", isActive: false }),
      ]),
    ).toEqual({ categoryKey: "legacy", categoryLabel: "Training", selectable: false });
  });

  it("keeps an unknown historic key fail-safe without silently remapping it", () => {
    expect(
      resolveWorkPackageCategory({ categoryKey: "foreign", categoryLabel: "Fremde Kategorie" }, [
        category(),
      ]),
    ).toEqual({ categoryKey: "foreign", categoryLabel: "Fremde Kategorie", selectable: false });
  });

  it("treats missing or cleared category as no category", () => {
    expect(resolveWorkPackageCategory({}, [category()])).toEqual({
      categoryKey: null,
      categoryLabel: null,
      selectable: true,
    });
    expect(
      resolveWorkPackageCategory({ categoryKey: null, categoryLabel: "ignored" }, [category()]),
    ).toEqual({ categoryKey: null, categoryLabel: null, selectable: true });
  });

  it("offers only active categories for new assignments", () => {
    expect(
      selectableWorkPackageCategories([
        category({ key: "incident", isActive: true }),
        category({ id: "category-2", key: "legacy", isActive: false }),
      ]).map((entry) => entry.key),
    ).toEqual(["incident"]);
  });

  it("normalization preserves category and tags independently", () => {
    const normalized = normalizeWorkPackage(
      {
        ...emptyWP(),
        projectId: "project-a",
        categoryKey: "incident",
        categoryLabel: "Störung",
        tags: ["Azure", "Firewall"],
      },
      new Set(["project-a"]),
    );

    expect(normalized.categoryKey).toBe("incident");
    expect(normalized.categoryLabel).toBe("Störung");
    expect(normalized.tags).toEqual(["Azure", "Firewall"]);
  });
});
