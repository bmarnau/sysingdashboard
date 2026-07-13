/**
 * Generischer Endpoint-Contract-Runner.
 *
 * Iteriert `ENDPOINTS` aus der Registry und erzeugt pro Route dieselben
 * Testkategorien: Grundfunktion, Payload-Varianten, Security-Scans,
 * Stabilität, Nachvollziehbarkeit. Neue Routen kommen ohne Testcode aus.
 *
 * Handler werden direkt aufgerufen (kein Dev-Server, kein Netz). Für den
 * echten HTTP-Round-Trip existiert die minimale Playwright-Suite
 * `e2e/api-smoke.spec.ts`.
 */
import { afterAll, describe, expect, it, test } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import "../env/test-instance";
import { ENDPOINTS, ALL_METHODS } from "./registry/endpoints";
import type { EndpointContract, HttpMethod, RouteHandler, RouteModule } from "./registry/types";

// Muster, die niemals im Response-Body/Headers erscheinen dürfen.
const SECRET_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "jwt", re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "bearer", re: /bearer\s+[A-Za-z0-9._-]{20,}/i },
  { name: "connection-string", re: /(AccountKey|SharedAccessKey|Password)=/i },
  { name: "sas", re: /sig=[A-Za-z0-9%]{20,}/ },
  { name: "stacktrace", re: /\n\s+at\s+[A-Za-z0-9_.<>]+\s+\(/ },
];

const SENSITIVE_HEADERS = ["set-cookie", "x-powered-by", "server"];

type Matrix = ReturnType<typeof buildInitialMatrix>[number];
function buildInitialMatrix() {
  return ENDPOINTS.map((e) => ({
    id: e.id,
    path: e.path,
    methods: e.methods.join(","),
    authRequired: e.authRequired,
    permission: e.permission ?? "",
    scope: e.scope ?? "",
    requestSchema: e.requestSchema ? "yes" : "no",
    responseSchema: e.responseSchema ? "yes" : "no",
    status: e.status,
    cases: 0,
    failures: 0,
    knownRisks: e.knownRisks ?? [],
  }));
}
const matrix = buildInitialMatrix();
function bump(id: string, patch: Partial<Matrix>) {
  const row = matrix.find((r) => r.id === id);
  if (row) Object.assign(row, { ...row, ...patch, cases: row.cases + 1 });
}

function getHandler(mod: RouteModule, method: HttpMethod): RouteHandler | undefined {
  const raw = mod.Route.options.server.handlers;
  if (typeof raw === "function") {
    // createHandlers-Variante ist aktuell nicht in Verwendung — Runner
    // ignoriert sie und markiert im Report.
    return undefined;
  }
  return raw[method];
}

function scanSecrets(text: string): string[] {
  return SECRET_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.name);
}

async function readBody(res: Response): Promise<{ text: string; json: unknown | null }> {
  const text = await res.clone().text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { text, json };
}

function makeReq(
  path: string,
  method: HttpMethod,
  body?: BodyInit | null,
  headers?: HeadersInit,
): Request {
  return new Request(`http://localhost${path}`, { method, body: body ?? null, headers });
}

for (const ep of ENDPOINTS) {
  describe(`endpoint ${ep.id} (${ep.path})`, () => {
    if (ep.status !== "active") {
      test.todo(`planned/${ep.status}: implementiere Handler und Runner-Cases`);
      return;
    }

    let mod: RouteModule;
    it("should_loadRouteModule_when_registryEntryActive", async () => {
      mod = await ep.loadRoute();
      expect(mod?.Route?.options?.server?.handlers).toBeDefined();
      bump(ep.id, {});
    });

    // --- Grundfunktion --------------------------------------------------
    for (const method of ep.methods) {
      it(`should_returnResponse_when_${method}Invoked`, async () => {
        const handler = getHandler(mod, method);
        expect(handler, `${method} handler missing`).toBeDefined();
        const body =
          method === "GET" || method === "DELETE"
            ? undefined
            : JSON.stringify(ep.validRequest?.() ?? {});
        const res = await handler!({
          request: makeReq(ep.path, method, body, { "Content-Type": "application/json" }),
        });
        expect(res).toBeInstanceOf(Response);
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(600);
        const ct = res.headers.get("content-type") ?? "";
        expect(ct).toMatch(/json/i);
        const { json } = await readBody(res);
        expect(json).toBeTypeOf("object");
        // Schema-Assert nur bei 2xx und wenn Schema deklariert.
        if (res.status >= 200 && res.status < 300 && ep.responseSchema) {
          const parsed = ep.responseSchema.safeParse(json);
          expect(
            parsed.success,
            `Response-Schema-Verletzung: ${!parsed.success ? parsed.error.message : ""}`,
          ).toBe(true);
        }
        bump(ep.id, {});
      });
    }

    // --- Nicht unterstützte Methoden -----------------------------------
    for (const m of ALL_METHODS) {
      if (ep.methods.includes(m)) continue;
      it(`should_notExposeHandler_when_methodNotSupported_${m}`, async () => {
        const handler = getHandler(mod, m);
        expect(handler, `${m} handler should not exist on ${ep.path}`).toBeUndefined();
        bump(ep.id, {});
      });
    }

    // --- Payload-Varianten (nur bei Body-Methoden) ---------------------
    const bodyMethods = ep.methods.filter((m) => m === "POST" || m === "PUT" || m === "PATCH");
    for (const method of bodyMethods) {
      it(`should_rejectInvalidJson_when_${method}BodyMalformed`, async () => {
        const handler = getHandler(mod, method)!;
        const res = await handler({
          request: makeReq(ep.path, method, "not-json", {
            "Content-Type": "application/json",
          }),
        });
        expect([400, 401, 500, 503]).toContain(res.status);
        if (res.status === 400 && ep.errorSchema) {
          const { json } = await readBody(res);
          expect(ep.errorSchema.safeParse(json).success).toBe(true);
        }
        bump(ep.id, {});
      });

      it(`should_acceptEmptyBody_or_returnStructuredError_when_${method}Empty`, async () => {
        const handler = getHandler(mod, method)!;
        const res = await handler({ request: makeReq(ep.path, method, "") });
        expect([200, 400, 401, 500, 503]).toContain(res.status);
        const { json } = await readBody(res);
        expect(json).toBeTypeOf("object");
        bump(ep.id, {});
      });

      it(`should_handleOversizePayload_when_${method}BodyOneMB`, async () => {
        const handler = getHandler(mod, method)!;
        const oversize = JSON.stringify({ blob: "x".repeat(1_000_000) });
        const res = await handler({
          request: makeReq(ep.path, method, oversize, {
            "Content-Type": "application/json",
          }),
        });
        // Erwartet: strukturierte Fehler, kein Crash. Genauer Statuscode
        // hängt vom Zod-Schema ab (Sync bricht auf `source`-Länge).
        expect([200, 400, 413, 500]).toContain(res.status);
        bump(ep.id, {});
      });

      it(`should_ignoreUnexpectedFields_when_${method}BodyHasExtras`, async () => {
        const handler = getHandler(mod, method)!;
        const body = JSON.stringify({
          ...(ep.validRequest?.() as Record<string, unknown> | undefined),
          __unexpected: "ignored",
        });
        const res = await handler({
          request: makeReq(ep.path, method, body, { "Content-Type": "application/json" }),
        });
        expect(res.status).toBeLessThan(500);
        bump(ep.id, {});
      });

      it(`should_notReflectInjection_when_${method}BodyContainsSqlish`, async () => {
        const handler = getHandler(mod, method)!;
        const body = JSON.stringify({ source: "'; DROP TABLE users;--" });
        const res = await handler({
          request: makeReq(ep.path, method, body, { "Content-Type": "application/json" }),
        });
        const { text } = await readBody(res);
        // Weder gecrasht noch der bösartige String 1:1 zurückreflektiert.
        expect(res.status).toBeLessThan(600);
        expect(text.toLowerCase()).not.toContain("drop table users");
        bump(ep.id, {});
      });
    }

    // --- Security --------------------------------------------------------
    it("should_notLeakSecrets_when_responseSerialized", async () => {
      const method = ep.methods[0];
      const handler = getHandler(mod, method)!;
      const body =
        method === "GET" || method === "DELETE"
          ? undefined
          : JSON.stringify(ep.validRequest?.() ?? {});
      const res = await handler({
        request: makeReq(ep.path, method, body, { "Content-Type": "application/json" }),
      });
      const { text } = await readBody(res);
      const hits = scanSecrets(text);
      expect(hits, `Secret-Muster im Response: ${hits.join(",")}`).toEqual([]);
      bump(ep.id, {});
    });

    it("should_notExposeSensitiveHeaders_when_responseSent", async () => {
      const method = ep.methods[0];
      const handler = getHandler(mod, method)!;
      const body =
        method === "GET" || method === "DELETE"
          ? undefined
          : JSON.stringify(ep.validRequest?.() ?? {});
      const res = await handler({
        request: makeReq(ep.path, method, body, { "Content-Type": "application/json" }),
      });
      const leaked = SENSITIVE_HEADERS.filter((h) => res.headers.has(h));
      // `set-cookie` ist erlaubt, wenn eine Route bewusst eine Session
      // setzt — aktuell nutzt keine der Routen Sessions.
      expect(leaked, `Sensitive Header gesetzt: ${leaked.join(",")}`).toEqual([]);
      bump(ep.id, {});
    });

    if (ep.authRequired) {
      it("should_denyAnonymous_when_authRequired", async () => {
        const method = ep.methods[0];
        const handler = getHandler(mod, method)!;
        const res = await handler({ request: makeReq(ep.path, method) });
        expect([401, 403]).toContain(res.status);
        bump(ep.id, {});
      });
    }

    // --- Stabilität ------------------------------------------------------
    it("should_survive_when_parallelRequestsFired", async () => {
      const method = ep.methods[0];
      const handler = getHandler(mod, method)!;
      const body =
        method === "GET" || method === "DELETE"
          ? undefined
          : JSON.stringify(ep.validRequest?.() ?? {});
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          handler({
            request: makeReq(ep.path, method, body, { "Content-Type": "application/json" }),
          }),
        ),
      );
      expect(results.every((r) => r.status < 600)).toBe(true);
      bump(ep.id, {});
    });

    // --- Nachvollziehbarkeit --------------------------------------------
    it("should_returnStructuredError_when_forcedToFail", async () => {
      // Wir provozieren einen Fehler über nicht-JSON-Body auf einer
      // Body-Methode; falls Route nur GET hat, überspringen wir.
      const method = bodyMethods[0];
      if (!method) return;
      const handler = getHandler(mod, method)!;
      const res = await handler({
        request: makeReq(ep.path, method, "definitely-not-json", {
          "Content-Type": "application/json",
        }),
      });
      if (res.status >= 400) {
        const { json } = await readBody(res);
        expect(json).toMatchObject({ ok: false });
        expect((json as { error?: unknown }).error).toBeTypeOf("string");
      }
      bump(ep.id, {});
    });
  });
}

afterAll(() => {
  const outDir = resolve(process.cwd(), "test-report");
  try {
    mkdirSync(outDir, { recursive: true });
  } catch {
    /* ignore */
  }
  const generated = new Date().toISOString();
  writeFileSync(
    resolve(outDir, "api-matrix.json"),
    JSON.stringify({ generated, endpoints: matrix }, null, 2),
  );
  const md = [
    `# API- und Endpoint-Matrix`,
    ``,
    `_Generiert: ${generated}_`,
    ``,
    `| Endpoint | Methoden | Auth | Permission | Scope | Req-Schema | Resp-Schema | Cases | Status | Offene Risiken |`,
    `| -------- | -------- | ---- | ---------- | ----- | ---------- | ----------- | ----- | ------ | -------------- |`,
    ...matrix.map(
      (r) =>
        `| \`${r.path}\` | ${r.methods} | ${r.authRequired ? "ja" : "nein"} | ${r.permission || "—"} | ${r.scope || "—"} | ${r.requestSchema} | ${r.responseSchema} | ${r.cases} | ${r.status} | ${r.knownRisks.join("<br>") || "—"} |`,
    ),
    ``,
    `## Legende`,
    `- **Cases**: Anzahl automatisch erzeugter Runner-Fälle (Grundfunktion, Payload, Security, Stabilität, Nachvollziehbarkeit).`,
    `- **Status**: \`active\` = im Runner geprüft, \`planned\` = Registry-Platzhalter (Runner → todo), \`archived\` = außer Betrieb.`,
    `- **Offene Risiken**: bekannte Lücken (z. B. fehlende Correlation-ID). Nicht Runner-blockierend.`,
  ].join("\n");
  writeFileSync(resolve(outDir, "api-matrix.md"), md + "\n");
});
