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
} from "../../../lib/correlation-context.server";

export const endpointMeta = {
  public: true,
  reason:
    "Auth-Config-Bootstrap — liefert nur SUPABASE_URL und den öffentlichen Publishable-Key, damit der Browser-Client sich initialisieren kann, wenn der Publish-Build ohne VITE_SUPABASE_* gebaut wurde.",
  classification: "public",
} as const;

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

export const Route = createFileRoute("/api/public/auth-config")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env.SUPABASE_URL;
        const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

        if (!url || !publishableKey) {
          return json(
            { status: "missing", provider: "supabase" },
            { status: 503 },
          );
        }
        if (publishableKey.startsWith("sb_secret_")) {
          // Defense-in-Depth: niemals einen Service-Role-Key ausliefern.
          return json(
            { status: "invalid", provider: "supabase" },
            { status: 500 },
          );
        }
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
            return json({ status: "invalid", provider: "supabase" }, { status: 500 });
          }
        } catch {
          return json({ status: "invalid", provider: "supabase" }, { status: 500 });
        }

        return json({
          status: "configured",
          provider: "supabase",
          url,
          publishableKey,
        });
      },
    },
  },
});
