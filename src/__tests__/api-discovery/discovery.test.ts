/**
 * Tests für das Discovery-Framework selbst.
 *
 * Bewusst gegen Fixtures unter `fixtures/`, nicht gegen den echten
 * `src/routes/api/`. So sind neu/entfernt/archiviert Szenarien
 * deterministisch prüfbar.
 */
import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { discover } from "../../../scripts/api-discovery/discover.mjs";
import { isExcluded } from "../../../scripts/api-discovery/exclude.mjs";
import {
  analyzeMethods,
  analyzePath,
  analyzeValidation,
  analyzeCorrelation,
  analyzeArchivedImports,
  classify,
} from "../../../scripts/api-discovery/analyzers.mjs";

const FIX_ROOT = resolve(process.cwd(), "src/__tests__/api-discovery/fixtures/routes-api");

function writeFixture(name: string, src: string) {
  mkdirSync(FIX_ROOT, { recursive: true });
  writeFileSync(join(FIX_ROOT, name), src);
}

function resetFixtures() {
  rmSync(FIX_ROOT, { recursive: true, force: true });
  mkdirSync(FIX_ROOT, { recursive: true });
}

describe("api-discovery analyzers", () => {
  it("extracts route path from createFileRoute", () => {
    expect(analyzePath('createFileRoute("/api/hello")({})')).toBe("/api/hello");
    expect(analyzePath("no route here")).toBeNull();
  });

  it("detects registered HTTP methods", () => {
    const src = `handlers: {
        GET: async () => {},
        POST: async () => {},
      }`;
    const src2 = `handlers: {
        ${src}
      }`;
    expect(analyzeMethods(src2).sort()).toEqual(["GET", "POST"]);
  });

  it("recognises zod validation", () => {
    expect(analyzeValidation("z.object({ id: z.string() })")).toBe(true);
    expect(analyzeValidation("JSON.parse(x)")).toBe(false);
  });

  it("recognises withCorrelation wrapper", () => {
    expect(analyzeCorrelation("withCorrelation(async () => {})")).toBe(true);
    expect(analyzeCorrelation("async () => {}")).toBe(false);
  });

  it("flags imports from archive/", () => {
    const src = `import x from "../../archive/legacy/foo";`;
    expect(analyzeArchivedImports(src)).toEqual(["../../archive/legacy/foo"]);
  });

  it("classifies endpoints by auth + prefix", () => {
    expect(classify({ path: "/api/foo", methods: ["GET"], authRequired: false })).toBe(
      "unclassified",
    );
    expect(classify({ path: "/api/public/webhook", methods: ["POST"], authRequired: false })).toBe(
      "public",
    );
    expect(classify({ path: "/api/admin", methods: ["POST"], authRequired: true })).toBe(
      "authenticated",
    );
    expect(
      classify({ path: "/api/admin", methods: ["POST"], authRequired: true, permission: "admin" }),
    ).toBe("privileged");
  });
});

describe("api-discovery exclude", () => {
  it("excludes archive/, tests, and __tests__ paths", () => {
    expect(isExcluded("archive/legacy-standalone-backend/routes/foo.ts")).toBe(true);
    expect(isExcluded("src/routes/api/foo.test.ts")).toBe(true);
    expect(isExcluded("src/__tests__/api/registry/endpoints.ts")).toBe(true);
    expect(isExcluded("src/routes/api/status.ts")).toBe(false);
  });
});

describe("api-discovery walker + inventory (fixtures)", () => {
  it("detects a new route, ignores archived, sorts deterministically", () => {
    resetFixtures();
    writeFixture(
      "hello.ts",
      `import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/hello")({
  server: { handlers: { GET: async () => Response.json({ ok: true }) } },
});`,
    );
    writeFixture(
      "submit.ts",
      `import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withCorrelation } from "../../lib/correlation-context.server";
const Body = z.object({ name: z.string() });
export const Route = createFileRoute("/api/submit")({
  server: { handlers: { POST: withCorrelation(async () => Response.json({})) } },
});`,
    );
    writeFixture(
      "legacy.ts",
      `import x from "../../../archive/legacy-standalone-backend/routes/old";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/legacy")({
  server: { handlers: { GET: async () => Response.json({}) } },
});`,
    );

    const inv = discover(FIX_ROOT);
    const paths = inv.endpoints.map((e) => e.path);
    expect(paths).toEqual(["/api/hello", "/api/legacy", "/api/submit"]);

    const submit = inv.endpoints.find((e) => e.path === "/api/submit")!;
    expect(submit.methods).toEqual(["POST"]);
    expect(submit.requestValidation).toBe(true);
    expect(submit.correlationId).toBe(true);

    const legacy = inv.endpoints.find((e) => e.path === "/api/legacy")!;
    expect(legacy.archivedImports.length).toBeGreaterThan(0);

    const findings = inv.findings;
    expect(findings.some((f) => f.category === "active-to-archived-import")).toBe(true);
    // Unclassified + no-correlation für /api/hello, /api/legacy
    expect(findings.some((f) => f.category === "unclassified-endpoint")).toBe(true);
    // Reihenfolge deterministisch
    const ids = findings.map((f) => f.id);
    expect([...ids].sort()).toEqual(ids);

    resetFixtures();
  });
});
