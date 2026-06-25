import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { runSync } from "../../../backend/services/syncService.mjs";
import { isProd } from "../../../config/env.mjs";

const BodySchema = z
  .object({ source: z.string().min(1).max(64).optional() })
  .partial();

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Auth-Gate für /api/sync:
 *  - Development-Modus: offen (liefert ohnehin nur Mock-Daten).
 *  - Production-Modus: erfordert Header `X-Sync-Token`, der mit dem
 *    Server-Secret `SYNC_TRIGGER_TOKEN` übereinstimmt. Ist das Secret
 *    nicht gesetzt, ist der Endpunkt in Production hart deaktiviert.
 */
function checkAuth(request: Request): Response | null {
  if (!isProd()) return null;
  const expected =
    (typeof process !== "undefined" && process.env?.SYNC_TRIGGER_TOKEN) || "";
  if (!expected) return jsonError(503, "Sync trigger disabled");
  const provided = request.headers.get("x-sync-token") ?? "";
  // Konstante Laufzeit: gleich lange Strings vergleichen.
  if (
    provided.length !== expected.length ||
    provided !== expected
  ) {
    return jsonError(401, "Unauthorized");
  }
  return null;
}

export const Route = createFileRoute("/api/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = checkAuth(request);
        if (denied) return denied;

        let parsed: { source?: string } = {};
        try {
          const text = await request.text();
          parsed = text ? BodySchema.parse(JSON.parse(text)) : {};
        } catch {
          return jsonError(400, "Invalid JSON body");
        }
        try {
          const result = await runSync({ source: parsed.source ?? "manual" });
          return Response.json(result);
        } catch {
          // Generische Antwort — niemals Stacktraces oder Secrets durchreichen
          return jsonError(500, "Sync failed");
        }
      },
    },
  },
});

