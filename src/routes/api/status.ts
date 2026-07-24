import { createFileRoute } from "@tanstack/react-router";
import { getStatus } from "../../../backend/services/statusService.mjs";
import {
  withCorrelation,
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
        // Health darf nicht an optionaler Azure-/Live-Sync-Konfiguration scheitern.
        // `getStatus()` fängt die ENV-Validierung intern ab und liefert nur
        // secret-freie Namen/Booleans, keine Werte.
        const payload = { ...getStatus(), correlationId: getCurrentCorrelationId() };
        return Response.json(payload);
      }),
    },
  },
});
