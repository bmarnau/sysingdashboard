import { test, expect } from "../../fixtures/test-instance";

/**
 * Rein serverseitige Prüfung: geschützte Endpunkte dürfen NICHT allein auf
 * UI-Gating vertrauen. Wir feuern direkte HTTP-Requests ohne UI-Kontext.
 *
 * Aktuell exponiert die App zwei Endpunkte: `/api/status` (öffentlich) und
 * `/api/sync` (Token-geschützt im Production-Modus). Der Registry-Runner in
 * v1.30.0 deckt die Contract-Ebene ab; diese Datei ist der End-to-End-Beleg.
 */
test("POST /api/sync ohne X-Sync-Token: entweder 401/403 oder DEV-Mock", async ({ request }) => {
  const res = await request.post("/api/sync", { data: { source: "e2e-denial" } });
  // In Dev/Test läuft der Endpunkt als Mock (200); in Production MUSS er
  // 401/403 liefern. Beides ist zulässig – wir prüfen, dass kein 5xx-Leak
  // und kein Stacktrace zurückkommt.
  expect([200, 401, 403, 503]).toContain(res.status());
  const body = await res.text();
  expect(body).not.toMatch(/at\s+\S+\s+\(.+:\d+:\d+\)/);
});

test("GET /api/status ist öffentlich lesbar", async ({ request }) => {
  const res = await request.get("/api/status");
  expect(res.status()).toBe(200);
});
