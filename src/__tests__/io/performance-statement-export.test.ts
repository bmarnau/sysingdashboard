import { describe, expect, it } from "vitest";
import { JsonExportService } from "@/lib/json-export-service";
import { performanceStatementFixture } from "../fixtures/backup";

describe("BSF-03B administrativer JSON-Gesamtdatenvertrag", () => {
  it("exportiert die interne Statement-Serie additiv in Schema 1.3.0", async () => {
    const performanceStatements = performanceStatementFixture();
    const result = JsonExportService.exportFullJson({
      exportedBy: "backup-test",
      performanceStatements,
    });

    expect(result.document.schemaVersion).toBe("1.3.0");
    expect(result.document.performanceStatements?.statements).toHaveLength(2);
    expect(result.document.performanceStatements?.claims).toHaveLength(2);
    expect(result.document.performanceStatements?.statements[0].snapshotHash).toBe(
      "1".repeat(64),
    );
    expect(result.document.performanceStatements?.statements[1].snapshotHash).toBe(
      "2".repeat(64),
    );

    const serialized = await result.blob.text();
    expect(serialized).toContain("source-hash-1");
    expect(serialized).not.toMatch(/password|refresh_token|service_role/i);
  });
});
