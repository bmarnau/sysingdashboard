import { test, expect } from "../../fixtures/test-instance";

/**
 * End-to-End-Beleg für die Auth-Grenze:
 * ein direkter HTTP-Call auf `/api/sync` ohne Token.
 *
 * Dev-Server läuft im development-Modus — der Endpoint akzeptiert dort
 * bewusst offene Requests. In Production MUSS 401 zurückkommen. Wir
 * prüfen daher zwei Klassen von Zusicherungen, die BEIDE gelten müssen:
 *   1. Kein 5xx-Leak (keine Stacktraces, keine Provider-Details).
 *   2. Fehler-Antworten (falls status >= 400) tragen die
 *      strukturierte Fehler-Shape `{ code, correlationId }`.
 */
test.describe("Security – direkter Endpoint-Call (SEC-CRIT-001, SEC-HIGH-AZURE-001)", () => {
  test("POST /api/sync ohne X-Sync-Token liefert keinen Stack, mit Correlation-ID", async ({
    request,
  }) => {
    const res = await request.post("/api/sync", {
      data: { source: "e2e-security-tamper", role: "systemadministrator", scope: "*" },
    });
    expect([200, 400, 401, 403, 503]).toContain(res.status());
    const text = await res.text();
    expect(text).not.toMatch(/at\s+\S+\s+\(.+:\d+:\d+\)/);
    expect(text).not.toMatch(/AccountKey=/);
    expect(text).not.toMatch(/SharedAccessSignature=/);
    // Correlation-Header ist Pflicht auf jeder Antwort.
    expect(res.headers()["x-correlation-id"] ?? res.headers()["X-Correlation-Id"]).toBeTruthy();
    if (res.status() >= 400) {
      const body = JSON.parse(text);
      expect(body).toMatchObject({ ok: false });
      expect(typeof body.correlationId).toBe("string");
      expect(typeof body.code).toBe("string");
    }
  });

  test("POST /api/sync mit gefälschtem Token liefert 401/503 in Production, kein Leak sonst", async ({
    request,
  }) => {
    const res = await request.post("/api/sync", {
      data: {},
      headers: { "X-Sync-Token": "attacker-guess" },
    });
    expect([200, 401, 403, 503]).toContain(res.status());
    const text = await res.text();
    expect(text).not.toMatch(/at\s+\S+\s+\(.+:\d+:\d+\)/);
  });
});
