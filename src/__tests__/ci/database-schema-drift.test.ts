import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readText(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("database schema source-of-truth", () => {
  it("exposes deterministic local schema rebuild and drift commands", () => {
    const pkg = JSON.parse(readText("package.json")) as {
      scripts?: Record<string, string>;
    };

    expect(pkg.scripts?.["db:schema:rebuild"]).toBe("supabase db reset --local --no-seed");
    expect(pkg.scripts?.["db:schema:snapshot"]).toBe(
      "supabase db dump --local --schema public -f supabase/schema/public-schema.generated.sql",
    );
    expect(pkg.scripts?.["db:types:generate"]).toBe(
      "supabase gen types --lang typescript --local --schema public > src/integrations/supabase/types.generated.ts",
    );
    expect(pkg.scripts?.["db:schema:check"]).toBe("node scripts/database-schema/check-drift.mjs");
  });

  it("gates CI on a local migration rebuild and schema drift check", () => {
    const workflow = readText(".github/workflows/ci.yml");

    expect(workflow).toContain("name: Database Schema Drift");
    expect(workflow).toContain("version: 2.117.0");
    expect(workflow).toContain("supabase start");
    expect(workflow).toContain("bun run db:schema:rebuild");
    expect(workflow).toContain("bun run db:schema:snapshot");
    expect(workflow).toContain("bun run db:types:generate");
    expect(workflow).toContain("bun run db:schema:check");
    expect(workflow).toContain("supabase stop --no-backup");
  });
});
