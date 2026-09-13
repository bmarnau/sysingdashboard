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
