import { createFileRoute } from "@tanstack/react-router";
import { getStatus } from "../../../backend/services/statusService.mjs";
import { ensureEnv } from "../../../backend/services/ensure-env.mjs";

export const Route = createFileRoute("/api/status")({
  server: {
    handlers: {
      GET: async () => {
        try {
          ensureEnv();
        } catch {
          // PROD-Throw bei fehlenden Pflicht-ENVs — generische Antwort,
          // keine Variablennamen/Werte im Body.
          return new Response(
            JSON.stringify({ ok: false, error: "Service not configured" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
        return Response.json(getStatus());
      },
    },
  },
});
