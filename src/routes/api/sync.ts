import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { runSync } from "../../../backend/services/syncService.mjs";
import { ensureEnv } from "../../../backend/services/ensure-env.mjs";
import {
  withCorrelation,
  jsonErrorWithCorrelation,
  getCurrentCorrelationId,
} from "../../lib/correlation-context.server";
import { createClient } from "@supabase/supabase-js";

const BodySchema = z
  .object({
    source: z.string().min(1).max(64).optional(),
    direction: z.enum(["import", "export"]).optional(),
  })
  .partial();

function buildAuthedClient(token: string) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (h.get("Authorization") === `Bearer ${process.env.SUPABASE_PUBLISHABLE_KEY!}`) {
          h.delete("Authorization");
        }
        h.set("apikey", process.env.SUPABASE_PUBLISHABLE_KEY!);
        h.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers: h });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

/**
 * `/api/sync` — benutzerinitiiert.
 *
 * Autorisierung:
 *  1. Bearer-Token aus `Authorization`-Header (Supabase-Session).
 *  2. Session-User muss `azure.import` (bei direction=import) bzw.
 *     `azure.export` (sonst) besitzen. Check über `public.has_permission`.
 *
 * Damit ist SEC-CRIT-001 („Backend prüft keine Rolle") strukturell
 * geschlossen: kein Endpoint-Aufruf mehr ohne Session + Berechtigung.
 * Der frühere `X-Sync-Token`-Pfad wurde entfernt (SEC-HIGH-AZURE-001).
 */
export const Route = createFileRoute("/api/sync")({
  server: {
    handlers: {
      POST: withCorrelation(async ({ request }) => {
        try {
          ensureEnv();
        } catch {
          return jsonErrorWithCorrelation(500, "SERVICE_NOT_CONFIGURED", "Service not configured");
        }

        const authHeader = request.headers.get("authorization") ?? "";
        if (!authHeader.startsWith("Bearer ")) {
          return jsonErrorWithCorrelation(401, "UNAUTHORIZED", "Unauthorized");
        }
        const token = authHeader.slice("Bearer ".length).trim();
        if (!token) {
          return jsonErrorWithCorrelation(401, "UNAUTHORIZED", "Unauthorized");
        }

        let parsed: { source?: string; direction?: "import" | "export" } = {};
        try {
          const text = await request.text();
          parsed = text ? BodySchema.parse(JSON.parse(text)) : {};
        } catch {
          return jsonErrorWithCorrelation(400, "INVALID_JSON", "Invalid JSON body");
        }

        const client = buildAuthedClient(token);
        const { data: userData, error: userErr } = await client.auth.getUser();
        if (userErr || !userData?.user) {
          return jsonErrorWithCorrelation(401, "UNAUTHORIZED", "Unauthorized");
        }
        const perm = parsed.direction === "import" ? "azure.import" : "azure.export";
        const { data: allowed, error: rpcErr } = await client.rpc("has_permission", {
          _user_id: userData.user.id,
          _perm: perm,
        });
        if (rpcErr) {
          return jsonErrorWithCorrelation(500, "AUTHZ_FAILED", "Authorization check failed");
        }
        if (allowed !== true) {
          return jsonErrorWithCorrelation(403, "FORBIDDEN", "Forbidden");
        }

        try {
          const result = await runSync({ source: parsed.source ?? "manual" });
          return Response.json({
            ...result,
            correlationId: getCurrentCorrelationId(),
            actorId: userData.user.id,
          });
        } catch {
          return jsonErrorWithCorrelation(500, "SYNC_FAILED", "Sync failed");
        }
      }),
    },
  },
});
