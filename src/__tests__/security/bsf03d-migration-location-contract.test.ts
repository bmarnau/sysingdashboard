/**
 * BSF-03D ARCH-DRIZZLE-01 — Architekturvertrag fuer den kanonischen
 * Migrationspfad. Dieser Test ist absichtlich vor der Korrektur eingefuehrt
 * worden und muss gegen den Ausgangsstand mit Drizzle RED sein.
 */
import { describe, expect, it } from "vitest";
import "../env/test-instance";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CANONICAL_MIGRATION = join(
  ROOT,
  "supabase",
  "migrations",
  "20260913213000_bsf03d_workpackage_category_reference_data.sql",
);
const MIGRATION_CONTRACT_TEST = join(
  ROOT,
  "src",
  "__tests__",
  "security",
  "bsf03d-migration-contract.test.ts",
);

describe("BSF-03D migration location architecture contract", () => {
  it("should_not_haveDrizzleMigrationFramework_when_supabaseIsCanonical", () => {
    expect(existsSync(join(ROOT, "drizzle.config.ts"))).toBe(false);
    expect(existsSync(join(ROOT, "drizzle"))).toBe(false);
  });

  it("should_not_dependOnDrizzlePackages_when_supabaseMigrationsAreCanonical", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(pkg.dependencies?.["drizzle-orm"]).toBeUndefined();
    expect(pkg.dependencies?.["drizzle-kit"]).toBeUndefined();
    expect(pkg.devDependencies?.["drizzle-orm"]).toBeUndefined();
    expect(pkg.devDependencies?.["drizzle-kit"]).toBeUndefined();
  });

  it("should_storeBsf03dMigrationUnderCanonicalSupabasePath", () => {
    expect(existsSync(CANONICAL_MIGRATION)).toBe(true);
  });

  it("should_makeMigrationContractTestReadCanonicalSupabaseMigration", () => {
    const contract = readFileSync(MIGRATION_CONTRACT_TEST, "utf8");

    expect(contract).toContain(
      "20260913213000_bsf03d_workpackage_category_reference_data.sql",
    );
    expect(contract).toContain('"supabase"');
    expect(contract).toContain('"migrations"');
    expect(contract).not.toContain('"drizzle"');
  });
});
