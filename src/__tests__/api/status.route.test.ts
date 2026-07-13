/**
 * API-Endpoint-Test: ruft den Handler direkt auf (kein Netz), damit der
 * Test ohne Dev-Server läuft.
 */
import { describe, expect, it } from "vitest";
import "../env/test-instance";
import { Route as StatusRoute } from "@/routes/api/status";

describe("/api/status handler", () => {
  it("should_returnJson_when_getInvoked", async () => {
    const handlers = (StatusRoute as unknown as {
      options: {
        server: { handlers: { GET: (ctx: { request: Request }) => Promise<Response> } };
      };
    }).options.server.handlers;
    const res = await handlers.GET({ request: new Request("http://localhost/api/status") });
    // ensureEnv() kann in DEV/PROD unterschiedlich reagieren — beide Fälle
    // erzeugen eine strukturierte JSON-Antwort.
    expect([200, 500]).toContain(res.status);
    const body = await res.json();
    expect(body).toBeTypeOf("object");
  });
});
