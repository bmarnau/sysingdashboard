import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const MIGRATION_DIR = join(ROOT, "supabase", "migrations");

function migrations(): string {
  return readdirSync(MIGRATION_DIR)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(MIGRATION_DIR, f), "utf8"))
    .join("\n");
}

describe("BSF-03E P0 — AVKK Scope-Hardening source contract", () => {
  const sql = migrations();

  it("should_addSystemhouseAndCustomerScope_when_p0MigrationExists", () => {
    expect(sql).toMatch(/ALTER TABLE\s+public\.avkk_subject[\s\S]*ADD COLUMN[^;]*systemhouse_id\s+uuid/i);
    expect(sql).toMatch(/ALTER TABLE\s+public\.avkk_subject[\s\S]*ADD COLUMN[^;]*customer_id\s+uuid/i);
  });

  it("should_scopeSubjectIdentity_when_p0MigrationExists", () => {
    expect(sql).toMatch(/UNIQUE[\s\S]*systemhouse_id[\s\S]*subject_type[\s\S]*subject_id/i);
  });

  it("should_hardenAvkkPoliciesAgainstFlatPermissionOnlyAccess_when_p0MigrationExists", () => {
    expect(sql).toMatch(/avkk_subject[\s\S]*systemhouse_id[\s\S]*customer_id/i);
    expect(sql).toMatch(/avkk_responsibility[\s\S]*systemhouse_id|avkk_responsibility[\s\S]*customer_id/i);
    expect(sql).toMatch(/has_active_systemhouse_membership|systemhouse_membership/i);
    expect(sql).toMatch(/has_customer_access|customer_access/i);
  });

  it("should_preserveLegacyFailClosedSemantics_when_scopeCannotBeResolved", () => {
    expect(sql).toMatch(/UNRESOLVED|fail[-_ ]closed|scope_unresolved/i);
    expect(sql).not.toMatch(/subject_title_snapshot[^;]*(systemhouse_id|customer_id)/i);
  });

  it("should_keepReproducibleDatabaseContract_when_p0Implemented", () => {
    const test = readFileSync(
      join(ROOT, "supabase", "tests", "bsf03e-responsibility-scope.sql"),
      "utf8",
    );
    expect(test).toMatch(/T01 avkk_subject\.systemhouse_id exists/);
    expect(test).toMatch(/T11 no flat permission-only responsibility write policy/);
    expect(test).toMatch(/T12 no flat permission-only subject read policy/);
    expect(test).toMatch(/ROLLBACK;/);
  });
});
