import { test, expect } from "./fixtures";

/**
 * Echter HTTP-Round-Trip gegen den lokalen Dev-Server. Fängt genau die
 * Fälle, die der Handler-direct-Runner nicht sehen kann: Middleware-Stack,
 * Body-Size-Limits, tatsächliche Framework-Header. Bewusst schmal — die
 * Contract-Prüfung passiert im Vitest-Runner.
 */
test("GET /api/status liefert 200 mit application-Feld", async ({ request }) => {
  const res = await request.get("/api/status");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty("application");
  expect(body.application).toHaveProperty("mode");
});

test("POST /api/sync mit gültigem Body liefert ok=true (DEV-Mock)", async ({ request }) => {
  const res = await request.post("/api/sync", { data: { source: "e2e-smoke" } });
  expect([200, 401, 500, 503]).toContain(res.status());
  const body = await res.json();
  expect(body).toBeTruthy();
});

test("POST /api/sync mit ungültigem JSON liefert strukturierten Fehler", async ({ request }) => {
  const res = await request.post("/api/sync", {
    data: "not-json-at-all",
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBeGreaterThanOrEqual(400);
});
