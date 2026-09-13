/**
 * BSF-03D (#103) — JSON-Schema 1.2.0: optionales `categoryKey` am Arbeitspaket.
 * Rückwärtskompatibel: fehlend/null = keine Kategorie, ältere Schemaversionen
 * bleiben importierbar (nur Hinweis, kein Fehler).
 */
import { describe, expect, it } from "vitest";
import { JSON_SCHEMA_VERSION, WorkPackageSchema, DashboardJsonExportSchema } from "@/lib/json-schema";
import { JsonSchemaValidationService } from "@/lib/json-schema-validation-service";

const base = { id: "wp-1", title: "AP", status: "offen", priority: "mittel" };

describe("JSON-Schema — categoryKey", () => {
  it("should_beVersion_1_2_0", () => {
    expect(JSON_SCHEMA_VERSION).toBe("1.2.0");
  });

  it("should_acceptMissingNullAndString", () => {
    expect(WorkPackageSchema.safeParse(base).success).toBe(true);
    expect(WorkPackageSchema.safeParse({ ...base, categoryKey: null }).success).toBe(true);
    const ok = WorkPackageSchema.safeParse({ ...base, categoryKey: "netzwerk" });
    expect(ok.success && ok.data.categoryKey).toBe("netzwerk");
  });

  it("should_rejectNonStringOrOverlongKey", () => {
    expect(WorkPackageSchema.safeParse({ ...base, categoryKey: 42 }).success).toBe(false);
    expect(WorkPackageSchema.safeParse({ ...base, categoryKey: "x".repeat(129) }).success).toBe(
      false,
    );
  });

  it("should_stillAcceptOlderSchemaVersions_withWarningOnly", () => {
    const doc = DashboardJsonExportSchema.parse({
      schemaVersion: "1.1.0",
      exportedAt: new Date().toISOString(),
      workPackages: [base],
    });
    const result = JsonSchemaValidationService.validate(doc);
    expect(result.schemaValid).toBe(true);
    expect(result.issues.some((i) => i.severity === "warning" && i.path === "schemaVersion")).toBe(
      true,
    );
    expect(result.issues.some((i) => i.severity === "error")).toBe(false);
  });
});

describe("Import — Kategorie fail-safe", () => {
  it("should_warnButKeepValue_when_categoryUnknownOrInactive", async () => {
    const { JsonImportService } = await import("@/lib/json-import-service");
    const doc = DashboardJsonExportSchema.parse({
      schemaVersion: JSON_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      workPackages: [
        { ...base, id: "wp-known", categoryKey: "netzwerk" },
        { ...base, id: "wp-ghost", categoryKey: "ghost" },
        { ...base, id: "wp-old", categoryKey: "legacy" },
        { ...base, id: "wp-none" },
      ],
    });
    const mk = (key: string, isActive: boolean) => ({
      id: key,
      catalogId: "c",
      catalogKey: "workpackage.category",
      key,
      label: key,
      description: "",
      sortOrder: 0,
      isActive,
      isDefault: false,
      parentValueId: null,
      attributes: {},
      validFrom: "2026-01-01",
      validTo: null,
      systemhouseId: "sh",
    });
    const plan = JsonImportService.buildPlan(doc, {
      strategy: "merge",
      categoryValues: [mk("netzwerk", true), mk("legacy", false)],
    });
    expect(plan.categoryReport.unknown).toEqual([{ workPackageId: "wp-ghost", key: "ghost" }]);
    expect(plan.categoryReport.inactive).toEqual([{ workPackageId: "wp-old", key: "legacy" }]);
    const ghost = plan.diffs.workPackages.find((d) => d.id === "wp-ghost");
    expect(ghost?.incoming.categoryKey).toBe("ghost");
    const none = plan.diffs.workPackages.find((d) => d.id === "wp-none");
    expect(none?.incoming.categoryKey).toBeNull();
  });

  it("should_notWarn_when_noCatalogProvided", async () => {
    const { JsonImportService } = await import("@/lib/json-import-service");
    const doc = DashboardJsonExportSchema.parse({
      schemaVersion: JSON_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      workPackages: [{ ...base, categoryKey: "ghost" }],
    });
    const plan = JsonImportService.buildPlan(doc);
    expect(plan.categoryReport.warnings).toEqual([]);
  });
});
