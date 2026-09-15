import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260914062100_bsf_kiosk_01_permission_and_exclusivity.sql",
  ),
  "utf8",
);

function functionBlock(name: string): string {
  const start = MIGRATION.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  expect(start).toBeGreaterThan(-1);
  const next = MIGRATION.indexOf("CREATE OR REPLACE FUNCTION public.", start + 10);
  return MIGRATION.slice(start, next === -1 ? undefined : next);
}

describe("BSF-KIOSK-01 migration security contract", () => {
  it("preserves has_permission as SECURITY DEFINER with a fixed search_path", () => {
    const block = functionBlock("has_permission");

    expect(block).toMatch(/SECURITY DEFINER/i);
    expect(block).toMatch(/SET search_path (?:=|TO) ['"]?public['"]?/i);
  });

  it("keeps the kiosk exclusivity trigger non-callable by application roles", () => {
    expect(MIGRATION).toContain(
      "REVOKE ALL ON FUNCTION public.enforce_kiosk_role_exclusive() FROM PUBLIC, anon, authenticated;",
    );
  });
});
