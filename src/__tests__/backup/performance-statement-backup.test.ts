import "../env/test-instance";
import { describe, expect, it, beforeEach } from "vitest";
import { restoreFromZip } from "@/lib/backup-service";
import { validatePerformanceStatementBackupPayload } from "@/lib/backup/performance-statement-payload";
import { buildValidBackupZipV2, performanceStatementFixture } from "../fixtures/backup";

beforeEach(() => {
  window.localStorage.clear();
});

describe("BSF-03B Leistungsnachweis im Backup", () => {
  it("prüft eine unveränderbare v1 -> v2 Serie einschließlich Claim und Snapshot-Hash", async () => {
    const fixture = performanceStatementFixture();
    const zip = await buildValidBackupZipV2({ performanceStatements: fixture });

    const result = await restoreFromZip(zip, { actor: "backup-test", mode: "overwrite" });

    expect(result.ok).toBe(true);
    expect(result.performanceStatements.present).toBe(true);
    expect(result.performanceStatements.validated).toBe(true);
    expect(result.performanceStatements.counts).toEqual({
      overrides: 1,
      requests: 2,
      statements: 2,
      items: 4,
      claims: 2,
    });
    expect(result.performanceStatements.activeClaims).toEqual([
      { activitySourceId: "ACT-1", statementId: "statement-v2" },
      { activitySourceId: "ACT-2", statementId: "statement-v2" },
    ]);
    expect(result.performanceStatements.snapshotHashes).toEqual({
      "statement-v1": "1".repeat(64),
      "statement-v2": "2".repeat(64),
    });
    expect(result.performanceStatements.messages.join(" ")).toMatch(/nicht in die Datenbank/i);
  });

  it("weist gebrochene Versionsketten und Claims auf ersetzte Statements ab", () => {
    const fixture = performanceStatementFixture();
    fixture.statements[1].replacesStatementId = "does-not-exist";
    fixture.claims[0].statementId = "statement-v1";

    const validation = validatePerformanceStatementBackupPayload(fixture);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toMatch(/replacesStatementId/);
    expect(validation.errors.join(" ")).toMatch(/Claim/);
  });

  it("weist Items ohne Statement und manipulierte Item-Anzahlen ab", () => {
    const fixture = performanceStatementFixture();
    fixture.items[0].statementId = "missing-statement";
    fixture.statements[1].itemCount = 99;

    const validation = validatePerformanceStatementBackupPayload(fixture);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toMatch(/unbekanntes Statement/);
    expect(validation.errors.join(" ")).toMatch(/itemCount/);
  });

  it("bleibt kompatibel zu Archiven ohne BSF-03B Cloud-Nutzdaten", async () => {
    const zip = await buildValidBackupZipV2({ performanceStatements: null });
    const result = await restoreFromZip(zip, { actor: "backup-test", mode: "overwrite" });

    expect(result.ok).toBe(true);
    expect(result.performanceStatements.present).toBe(false);
  });
});
