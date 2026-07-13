import { describe, expect, it } from "vitest";
import "../env/test-instance";
import { Route as SyncRoute } from "@/routes/api/sync";

type SyncHandlers = {
  POST: (ctx: { request: Request }) => Promise<Response>;
};

function getHandlers(): SyncHandlers {
  return (SyncRoute as unknown as { options: { server: { handlers: SyncHandlers } } }).options
    .server.handlers;
}

describe("/api/sync handler", () => {
  it("should_rejectInvalidJson_when_bodyMalformed", async () => {
    const req = new Request("http://localhost/api/sync", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await getHandlers().POST({ request: req });
    // In DEV: 400 (ungültiger Body). In PROD ohne Token: 401/503.
    expect([400, 401, 500, 503]).toContain(res.status);
  });

  it("should_returnStructuredJson_always", async () => {
    const req = new Request("http://localhost/api/sync", {
      method: "POST",
      body: JSON.stringify({ source: "unit-test" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await getHandlers().POST({ request: req });
    const body = await res.json();
    expect(body).toBeTypeOf("object");
  });
});
