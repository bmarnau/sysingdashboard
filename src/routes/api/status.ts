import { createFileRoute } from "@tanstack/react-router";
import { getStatus } from "../../../backend/services/statusService.mjs";
import { ensureEnv } from "../../../backend/services/ensure-env.mjs";
import {
  withCorrelation,
  jsonErrorWithCorrelation,
  getCurrentCorrelationId,
} from "../../lib/correlation-context.server";

export const endpointMeta = {
  public: true,
  reason:
    "Health-/Statusanzeige — kein Secret, kein State, wird vom Dashboard und CI ohne Auth abgefragt.",
  classification: "public",
} as const;

export const Route = createFileRoute("/api/status")({
  server: {
    handlers: {
      GET: withCorrelation(async () => {
        try {
          ensureEnv();
        } catch {
          // PROD-Throw bei fehlenden Pflicht-ENVs — generische Antwort,
          // keine Variablennamen/Werte im Body.
          return jsonErrorWithCorrelation(500, "SERVICE_NOT_CONFIGURED", "Service not configured");
        }
        const payload = { ...getStatus(), correlationId: getCurrentCorrelationId() };
        return Response.json(payload);
      }),
    },
  },
});
