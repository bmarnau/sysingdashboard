import "../env/test-instance";
import { beforeEach, describe, expect, it } from "vitest";
import { JsonImportService } from "@/lib/json-import-service";
import {
  DashboardJsonExportSchema,
  JSON_SCHEMA_VERSION,
  WorkPackageSchema,
  type DashboardJsonExport,
} from "@/lib/json-schema";
import type { ReferenceValue } from "@/lib/reference-data";

function category(overrides: Partial<ReferenceValue> = {}): ReferenceValue {
  return {
    id: "cat-value-1",
    catalogId: "cat-workpackage",
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

function doc(workPackage: Record<string, unknown>): DashboardJsonExport {
  return DashboardJsonExportSchema.parse({
    schemaVersion: JSON_SCHEMA_VERSION,
    exportType: "full",
    exportedAt: "2026-09-13T00:00:00.000Z",
    exportedBy: "test",
    dashboardVersion: "1.61.0",
    workPackages: [
      {
        id: "wp-1",
        title: "AP 1",
        projectId: null,
        status: "offen",
        priority: "mittel",
        ...workPackage,
      },
    ],
  });
}

beforeEach(() => window.localStorage.clear());

describe("WorkPackage category JSON contract", () => {
  it("keeps old JSON without category backward compatible", () => {
    expect(
      WorkPackageSchema.parse({
        id: "wp-old",
        title: "Alt",
        status: "offen",
        priority: "mittel",
      }),
    ).not.toHaveProperty("categoryKey");
  });

  it("round-trips categoryKey and categoryLabel through the schema", () => {
    const parsed = WorkPackageSchema.parse({
      id: "wp-new",
      title: "Neu",
      status: "offen",
      priority: "mittel",
      categoryKey: "incident",
      categoryLabel: "Störung",
    });
    expect(parsed).toMatchObject({ categoryKey: "incident", categoryLabel: "Störung" });
  });

  it("accepts an active category from the target systemhouse without warning", () => {
    const plan = JsonImportService.buildPlan(doc({ categoryKey: "incident", categoryLabel: "Störung" }), {
      strategy: "merge",
      workPackageCategoryContext: { systemhouseId: "sh-a", values: [category()] },
    });
    expect(plan.categoryWarnings).toEqual([]);
    expect(plan.diffs.workPackages[0].incoming).toMatchObject({
      categoryKey: "incident",
      categoryLabel: "Störung",
    });
  });

  it("preserves an unknown category snapshot and reports it explicitly", () => {
    const plan = JsonImportService.buildPlan(
      doc({ categoryKey: "foreign", categoryLabel: "Fremde Kategorie" }),
      {
        strategy: "merge",
        workPackageCategoryContext: { systemhouseId: "sh-a", values: [category()] },
      },
    );
    expect(plan.diffs.workPackages[0].incoming).toMatchObject({
      categoryKey: "foreign",
      categoryLabel: "Fremde Kategorie",
    });
    expect(plan.categoryWarnings).toEqual([
      expect.objectContaining({ workPackageId: "wp-1", categoryKey: "foreign", reason: "unknown" }),
    ]);
  });

  it("preserves an inactive historic category but reports it as non-selectable", () => {
    const plan = JsonImportService.buildPlan(doc({ categoryKey: "legacy", categoryLabel: "Training" }), {
      strategy: "merge",
      workPackageCategoryContext: {
        systemhouseId: "sh-a",
        values: [category({ key: "legacy", label: "Training", isActive: false })],
      },
    });
    expect(plan.categoryWarnings).toEqual([
      expect.objectContaining({ workPackageId: "wp-1", categoryKey: "legacy", reason: "inactive" }),
    ]);
  });

  it("does not accept a value from another systemhouse as a valid target category", () => {
    const plan = JsonImportService.buildPlan(doc({ categoryKey: "incident", categoryLabel: "Störung" }), {
      strategy: "merge",
      workPackageCategoryContext: {
        systemhouseId: "sh-a",
        values: [category({ systemhouseId: "sh-b" })],
      },
    });
    expect(plan.categoryWarnings).toEqual([
      expect.objectContaining({ workPackageId: "wp-1", categoryKey: "incident", reason: "foreign" }),
    ]);
  });
});
