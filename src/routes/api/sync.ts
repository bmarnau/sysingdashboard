import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { runSync } from "../../../backend/services/syncService.mjs";
import { isProd } from "../../../config/env.mjs";
import { getEnv } from "../../../config/secretManager.mjs";
import { ensureEnv } from "../../../backend/services/ensure-env.mjs";
import {
  withCorrelation,
  jsonErrorWithCorrelation,
  getCurrentCorrelationId,
} from "../../lib/correlation-context.server";

const BodySchema = z.object({ source: z.string().min(1).max(64).optional() }).partial();

/**
 * Auth-Gate für /api/sync:
 *  - Development-Modus: offen (liefert ohnehin nur Mock-Daten).
 *  - Production-Modus: erfordert Header `X-Sync-Token`, der mit dem
 *    Server-Secret `SYNC_TRIGGER_TOKEN` übereinstimmt. Ist das Secret
 *    nicht gesetzt, ist der Endpunkt in Production hart deaktiviert.
 */
function checkAuth(request: Request): Response | null {
  if (!isProd()) return null;
  const expected = getEnv("SYNC_TRIGGER_TOKEN", false) ?? "";
  if (!expected) return jsonErrorWithCorrelation(503, "SYNC_DISABLED", "Sync trigger disabled");
  const provided = request.headers.get("x-sync-token") ?? "";
  // Konstante Laufzeit: gleich lange Strings vergleichen.
  if (provided.length !== expected.length || provided !== expected) {
    return jsonErrorWithCorrelation(401, "UNAUTHORIZED", "Unauthorized");
  }
  return null;
}

export const Route = createFileRoute("/api/sync")({
  server: {
    handlers: {
      POST: withCorrelation(async ({ request }) => {
        try {
          ensureEnv();
        } catch {
          return jsonErrorWithCorrelation(500, "SERVICE_NOT_CONFIGURED", "Service not configured");
        }
        const denied = checkAuth(request);
        if (denied) return denied;

        let parsed: { source?: string } = {};
        try {
          const text = await request.text();
          parsed = text ? BodySchema.parse(JSON.parse(text)) : {};
        } catch {
          return jsonErrorWithCorrelation(400, "INVALID_JSON", "Invalid JSON body");
        }
        try {
          const result = await runSync({ source: parsed.source ?? "manual" });
          return Response.json({ ...result, correlationId: getCurrentCorrelationId() });
        } catch {
          // Generische Antwort — niemals Stacktraces oder Secrets durchreichen
          return jsonErrorWithCorrelation(500, "SYNC_FAILED", "Sync failed");
        }
      }),
    },
  },
});
