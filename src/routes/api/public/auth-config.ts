/**
 * Öffentlicher Auth-Config-Endpoint.
 *
 * Liefert die zwei nicht-geheimen Werte, die der Browser-Client zur
 * Initialisierung von Supabase benötigt, aus der serverseitigen
 * Runtime-Umgebung (Lovable Cloud injiziert `SUPABASE_URL` und
 * `SUPABASE_PUBLISHABLE_KEY` in den Worker). Dient als Runtime-Fallback,
 * wenn der Publish-Build ohne `VITE_SUPABASE_*` gebaut wurde und die
 * Vite-Konstanten im Bundle deshalb `undefined` sind.
 *
 * Sicherheit:
 * - Ausschließlich Publishable-Werte. `sb_secret_*` wird hart abgelehnt.
 * - `SUPABASE_SERVICE_ROLE_KEY` wird niemals ausgegeben.
 * - `Cache-Control: no-store`, damit rotierte Keys sofort greifen.
 * - Kein Logging von Werten.
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  withCorrelation,
  getCurrentCorrelationId,
  jsonErrorWithCorrelation,
} from "../../../lib/correlation-context.server";

export const endpointMeta = {
  public: true,
  reason:
    "Auth-Config-Bootstrap — liefert nur SUPABASE_URL und den öffentlichen Publishable-Key, damit der Browser-Client sich initialisieren kann, wenn der Publish-Build ohne VITE_SUPABASE_* gebaut wurde.",
  classification: "public",
} as const;

function jsonOk(body: Record<string, unknown>): Response {
  const correlationId = getCurrentCorrelationId() ?? "unknown";
  return new Response(
    JSON.stringify({ ...body, correlationId, timestamp: new Date().toISOString() }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Correlation-Id": correlationId,
      },
    },
  );
}

export const Route = createFileRoute("/api/public/auth-config")({
  server: {
    handlers: {
      GET: withCorrelation(async () => {
        const url = process.env.SUPABASE_URL;
        const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

        if (!url || !publishableKey) {
          return jsonErrorWithCorrelation(503, "not_configured", "Supabase-Konfiguration fehlt.");
        }
        if (publishableKey.startsWith("sb_secret_")) {
          // Defense-in-Depth: niemals einen Service-Role-Key ausliefern.
          return jsonErrorWithCorrelation(500, "invalid_key", "Ungültiger Publishable-Key.");
        }
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
            return jsonErrorWithCorrelation(500, "invalid_url", "Ungültige Supabase-URL.");
          }
        } catch {
          return jsonErrorWithCorrelation(500, "invalid_url", "Ungültige Supabase-URL.");
        }

        return jsonOk({
          status: "configured",
          provider: "supabase",
          url,
          publishableKey,
        });
      }),
    },
  },
});
