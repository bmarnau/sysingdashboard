import { describe, expect, it } from "vitest";
import { JsonSchemaValidationService } from "@/lib/json-schema-validation-service";
import { JSON_SCHEMA_VERSION } from "@/lib/json-schema";

/**
 * Integration: Validierung der Import-Payload gegen das Schema.
 * Deckt den kritischsten Fehlerpfad ab, ohne echte Datei-/localStorage-Mutation.
 */

function baseEnvelope(): Record<string, unknown> {
  return {
    schemaVersion: JSON_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    exportedBy: "test",
    exportType: "full",
    dashboardVersion: "1.0.0",
    documentationVersion: "1.0.0",
  };
}

describe("JsonSchemaValidationService", () => {
  it("should_acceptMinimalValidDocument_when_onlyEnvelopePresent", () => {
    const result = JsonSchemaValidationService.validate(baseEnvelope());
    expect(result.schemaValid).toBe(true);
    expect(result.document?.schemaVersion).toBe(JSON_SCHEMA_VERSION);
  });

  it("should_rejectDocument_when_schemaVersionMissing", () => {
    const invalid = { ...baseEnvelope() };
    delete (invalid as Record<string, unknown>).schemaVersion;
    const result = JsonSchemaValidationService.validate(invalid);
    expect(result.schemaValid).toBe(false);
    expect(result.issues.some((i) => i.path.includes("schemaVersion"))).toBe(true);
  });

  it("should_rejectDocument_when_exportTypeInvalid", () => {
    const invalid = { ...baseEnvelope(), exportType: "bogus" };
    const result = JsonSchemaValidationService.validate(invalid);
    expect(result.schemaValid).toBe(false);
  });

  it("should_returnErrors_when_payloadNotObject", () => {
    const result = JsonSchemaValidationService.validate("not-an-object");
    expect(result.ok).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
