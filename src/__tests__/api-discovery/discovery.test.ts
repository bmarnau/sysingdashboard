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
// @ts-expect-error — .mjs sources without .d.ts, discovery is JS
import { discover } from "../../../scripts/api-discovery/discover.mjs";
// @ts-expect-error — .mjs source
import { isExcluded } from "../../../scripts/api-discovery/exclude.mjs";
import {
  analyzeMethods,
  analyzePath,
  analyzeValidation,
  analyzeCorrelation,
  analyzeAuthGuard,
  analyzeArchivedImports,
  analyzeEndpointMeta,
  classify,
  // @ts-expect-error — .mjs source
} from "../../../scripts/api-discovery/analyzers.mjs";

type InvEndpoint = {
  path: string;
  methods: string[];
  requestValidation: boolean;
  correlationId: boolean;
  archivedImports: string[];
};
type InvFinding = { id: string; category: string; severity: string };

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

  it("recognises bearer auth and permission RPC guards", () => {
    expect(
      analyzeAuthGuard(`
        const authHeader = request.headers.get("authorization") ?? "";
        const { data } = await client.auth.getUser();
        await client.rpc("has_permission", { _perm: "azure.export" });
      `),
    ).toBe(true);
    expect(analyzeAuthGuard("const x = JSON.parse(body)")).toBe(false);
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

  it("extracts endpointMeta and prefers it over heuristics in classify()", () => {
    const src = `export const endpointMeta = {
      public: true,
      reason: "Health/Status",
    } as const;`;
    const meta = analyzeEndpointMeta(src);
    expect(meta).toMatchObject({ public: true, reason: "Health/Status" });
    // meta.public overrides the unclassified default
    expect(classify({ path: "/api/status", methods: ["GET"], authRequired: false, meta })).toBe(
      "public",
    );
    // explicit meta.classification wins over meta.public
    const meta2 = analyzeEndpointMeta(
      `export const endpointMeta = { public: true, classification: "internal" } as const;`,
    );
    expect(
      classify({ path: "/api/x", methods: ["GET"], authRequired: false, meta: meta2 }),
    ).toBe("internal");
    expect(analyzeEndpointMeta("no meta here")).toBeNull();
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

    const inv = discover(FIX_ROOT) as { endpoints: InvEndpoint[]; findings: InvFinding[] };
    const paths = inv.endpoints.map((e: InvEndpoint) => e.path);
    expect(paths).toEqual(["/api/hello", "/api/legacy", "/api/submit"]);

    const submit = inv.endpoints.find((e: InvEndpoint) => e.path === "/api/submit")!;
    expect(submit.methods).toEqual(["POST"]);
    expect(submit.requestValidation).toBe(true);
    expect(submit.correlationId).toBe(true);

    const legacy = inv.endpoints.find((e: InvEndpoint) => e.path === "/api/legacy")!;
    expect(legacy.archivedImports.length).toBeGreaterThan(0);

    const findings = inv.findings;
    expect(findings.some((f: InvFinding) => f.category === "active-to-archived-import")).toBe(true);
    // Unclassified + no-correlation für /api/hello, /api/legacy
    expect(findings.some((f: InvFinding) => f.category === "unclassified-endpoint")).toBe(true);
    // Reihenfolge deterministisch
    const ids = findings.map((f: InvFinding) => f.id);
    expect([...ids].sort()).toEqual(ids);

    resetFixtures();
  });

  it("honours endpointMeta.public and demands a reason", () => {
    resetFixtures();
    writeFixture(
      "status.ts",
      `import { createFileRoute } from "@tanstack/react-router";
export const endpointMeta = {
  public: true,
  reason: "Health/Status",
} as const;
export const Route = createFileRoute("/api/status")({
  server: { handlers: { GET: async () => Response.json({ ok: true }) } },
});`,
    );
    writeFixture(
      "ping.ts",
      `import { createFileRoute } from "@tanstack/react-router";
export const endpointMeta = { public: true } as const;
export const Route = createFileRoute("/api/ping")({
  server: { handlers: { GET: async () => Response.json({ ok: true }) } },
});`,
    );

    const inv = discover(FIX_ROOT) as {
      endpoints: (InvEndpoint & { classification: string; declaredPublic: boolean })[];
      findings: InvFinding[];
    };
    const status = inv.endpoints.find((e) => e.path === "/api/status")!;
    expect(status.classification).toBe("public");
    expect(status.declaredPublic).toBe(true);

    const ping = inv.endpoints.find((e) => e.path === "/api/ping")!;
    expect(ping.classification).toBe("public");

    // /api/status must NOT be flagged unclassified anymore
    expect(
      inv.findings.some(
        (f) => f.category === "unclassified-endpoint" && f.id.includes("api-status"),
      ),
    ).toBe(false);
    // /api/ping is public but has no reason → low finding
    expect(
      inv.findings.some(
        (f) => f.category === "public-without-reason" && f.id.includes("api-ping"),
      ),
    ).toBe(true);

    resetFixtures();
  });
});
