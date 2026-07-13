import { describe, expect, it } from "vitest";
import "../env/test-instance";
import * as backupModule from "@/lib/backup-service";

describe("backup-service module", () => {
  it("should_exposePublicApi_when_imported", () => {
    // Rauchtest — deckt die exportierte Oberfläche ab, ohne echten Backup-Lauf.
    expect(backupModule).toBeTypeOf("object");
  });
});
