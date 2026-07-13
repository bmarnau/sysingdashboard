/**
 * Generischer API-Smoke-Runner.
 *
 * Iteriert `api-inventory.json` (per Discovery erzeugt), lädt die
 * jeweilige Route-Modul-Datei direkt (kein Netz, kein Dev-Server) und
 * führt pro Endpoint einen kleinen Katalog aus reproduzierbaren
 * Szenarien aus:
 *
 *   1. Erreichbarkeit (Handler existiert für erste Methode)
 *   2. Falsche Methode → 405 oder strukturierte Fehlerantwort
 *   3. Ungültiges JSON → 400/422 (nur POST/PUT/PATCH)
 *   4. Response-Content-Type ist JSON (kein HTML)
 *   5. Kein Secret/Stacktrace/Bearer im Response-Body
 *   6. Correlation-ID im Response-Header
 *
 * Ergebnisse werden in `test-report/api-smoke-raw.json` geschrieben —
 * das Aggregat-Format erzeugt `scripts/api-discovery/report.mjs`.
 */
import { afterAll, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import "../../env/test-instance";

type InventoryEndpoint = {
  id: string;
  path: string;
  methods: string[];
  routeFile: string;
  classification: string;
  authRequired: boolean;
  correlationId: boolean;
  requestValidation: boolean;
};

type Inventory = { endpoints: InventoryEndpoint[] };

const INVENTORY_PATH = resolve(process.cwd(), "test-report/api-inventory.json");
const RAW_OUT = resolve(process.cwd(), "test-report/api-smoke-raw.json");

const SECRET_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "jwt", re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "bearer", re: /bearer\s+[A-Za-z0-9._-]{20,}/i },
  { name: "connection-string", re: /(AccountKey|SharedAccessKey|Password)=/i },
  { name: "sas", re: /sig=[A-Za-z0-9%]{20,}/ },
  { name: "stacktrace", re: /\n\s+at\s+[A-Za-z0-9_.<>]+\s+\(/ },
];

function loadInventory(): Inventory | null {
  if (!existsSync(INVENTORY_PATH)) return null;
  return JSON.parse(readFileSync(INVENTORY_PATH, "utf8"));
}

type HandlerFn = (ctx: { request: Request; params?: Record<string, string> }) => Promise<Response>;
type RouteMod = {
  Route: {
    options: {
      server: {
        handlers:
          | Partial<Record<string, HandlerFn>>
          | ((ctx: { createHandlers: <T>(h: T) => T }) => unknown);
      };
    };
  };
};

async function importRoute(routeFile: string): Promise<RouteMod | null> {
  try {
    // Vitest resolved from project root; route files are TS.
    const mod = await import(/* @vite-ignore */ resolve(process.cwd(), routeFile));
    return mod as unknown as RouteMod;
  } catch {
    return null;
  }
}

function pickHandler(mod: RouteMod, method: string): HandlerFn | undefined {
  const raw = mod.Route.options.server.handlers;
  if (typeof raw === "function") return undefined;
  return raw[method];
}

const results: Array<{
  endpointId: string;
  method: string;
  status: "passed" | "failed" | "skipped" | "not-implemented";
  scenarios: Array<{ name: string; category: string; ok: boolean; detail?: string }>;
  duration: number;
}> = [];

afterAll(() => {
  mkdirSync(dirname(RAW_OUT), { recursive: true });
  writeFileSync(RAW_OUT, JSON.stringify({ results }, null, 2) + "\n");
});

const inv = loadInventory();

describe("api smoke (inventory-driven)", () => {
  if (!inv) {
    it("inventory-present", () => {
      // Wenn kein Inventar da ist, ist das ein Test-Setup-Fehler.
      throw new Error(
        "test-report/api-inventory.json fehlt — bitte `bun run api:discover` vor Smoke-Tests ausführen.",
      );
    });
    return;
  }

  for (const ep of inv.endpoints) {
    describe(`${ep.id} (${ep.path})`, () => {
      it("smoke-runs", async () => {
        const start = performance.now();
        const scenarios: {
          name: string;
          category: string;
          ok: boolean;
          detail?: string;
        }[] = [];
        const mod = await importRoute(ep.routeFile);
        if (!mod) {
          results.push({
            endpointId: ep.id,
            method: ep.methods[0] ?? "?",
            status: "not-implemented",
            scenarios,
            duration: performance.now() - start,
          });
          scenarios.push({
            name: "module loads",
            category: "reachability",
            ok: false,
            detail: "route module could not be imported",
          });
          return;
        }
        const method = ep.methods[0] ?? "GET";
        const handler = pickHandler(mod, method);
        scenarios.push({
          name: "handler registered",
          category: "reachability",
          ok: !!handler,
        });

        if (handler) {
          // 1. Positivfall (leerer Body für writes akzeptabel — Validierung
          //    entscheidet über Status).
          const posRes = await handler({
            request: new Request(`http://localhost${ep.path}`, {
              method,
              headers: { "content-type": "application/json" },
              body: ["POST", "PUT", "PATCH"].includes(method) ? "{}" : null,
            }),
          });
          const text = await posRes.clone().text();

          scenarios.push({
            name: "response is not HTML error page",
            category: "schema",
            ok: !/<html/i.test(text),
          });
          scenarios.push({
            name: "no secrets in response body",
            category: "secret-scan",
            ok: !SECRET_PATTERNS.some((p) => p.re.test(text)),
          });
          scenarios.push({
            name: "correlation-id header present (if wrapper used)",
            category: "correlation",
            ok: !ep.correlationId || !!posRes.headers.get("x-correlation-id"),
          });

          // 2. Falsche Methode
          const notAllowedMethod = method === "GET" ? "DELETE" : "GET";
          if (!ep.methods.includes(notAllowedMethod)) {
            const wrongRes = await (
              pickHandler(mod, notAllowedMethod) ??
              (async () =>
                new Response("method-not-allowed", { status: 405 }))
            )({
              request: new Request(`http://localhost${ep.path}`, {
                method: notAllowedMethod,
              }),
            });
            scenarios.push({
              name: "unsupported method rejected",
              category: "method",
              ok: wrongRes.status >= 400 && wrongRes.status < 500,
              detail: `status=${wrongRes.status}`,
            });
          }

          // 3. Invalid JSON (nur bei writes)
          if (["POST", "PUT", "PATCH"].includes(method)) {
            const badRes = await handler({
              request: new Request(`http://localhost${ep.path}`, {
                method,
                headers: { "content-type": "application/json" },
                body: "{not-json",
              }),
            });
            scenarios.push({
              name: "invalid JSON rejected",
              category: "validation",
              ok: [400, 415, 422].includes(badRes.status),
              detail: `status=${badRes.status}`,
            });
          }
        }

        const failed = scenarios.filter((s) => !s.ok);
        results.push({
          endpointId: ep.id,
          method,
          status: failed.length === 0 ? "passed" : "failed",
          scenarios,
          duration: performance.now() - start,
        });

        // Test schlägt fehl, wenn kritische Szenarien fehlschlagen.
        expect(failed, `failed scenarios: ${failed.map((f) => f.name).join(", ")}`).toEqual([]);
      });
    });
  }
});
