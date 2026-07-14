import { test, expect } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

/**
 * Betrieb (Prompt 2A.7):
 *  - /api/status liefert 200 + application.mode
 *  - Payload enthält keine Secret-artigen Werte
 *  - Fehleranworten sind generisch (kein Stack-Leak)
 */
const SECRET_PATTERNS = [
  /DefaultEndpointsProtocol=/i,
  /AccountKey=/i,
  /SharedAccessSignature=/i,
  /Bearer\s+[A-Za-z0-9\-_\.]+/,
  /eyJ[A-Za-z0-9_\-]{20,}/, // JWT-Kopf
];

test("status endpoint is safe & healthy", async ({ request }) => {
  const res = await request.get("/api/status");
  expect(res.status()).toBe(200);
  const body = await res.text();
  const leaks = SECRET_PATTERNS.filter((r) => r.test(body));
  const json = JSON.parse(body);
  expect(json.application?.mode).toMatch(/^(development|production)$/);

  mkdirSync("test-report", { recursive: true });
  const prev = existsSync("test-report/ops-checks.json")
    ? JSON.parse(readFileSync("test-report/ops-checks.json", "utf8"))
    : {};
  writeFileSync(
    "test-report/ops-checks.json",
    JSON.stringify({ ...prev, healthOk: true, secretLeaks: leaks.length, checkedAt: new Date().toISOString() }, null, 2),
  );
  expect(leaks, `Secrets im /api/status-Payload: ${leaks.map(String).join(", ")}`).toHaveLength(0);
});

test("500 responses do not leak stack traces", async ({ request }) => {
  const res = await request.post("/api/sync", { data: "not-json" as unknown as object, headers: { "Content-Type": "application/json" } });
  const body = await res.text();
  expect(body).not.toMatch(/at\s+\S+\s+\(.+:\d+:\d+\)/);
});
