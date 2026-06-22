import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { runSync } from "../../../backend/services/syncService.mjs";

const BodySchema = z
  .object({ source: z.string().min(1).max(64).optional() })
  .partial();

export const Route = createFileRoute("/api/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed: { source?: string } = {};
        try {
          const text = await request.text();
          parsed = text ? BodySchema.parse(JSON.parse(text)) : {};
        } catch {
          return new Response(
            JSON.stringify({ ok: false, error: "Invalid JSON body" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        try {
          const result = await runSync({ source: parsed.source ?? "manual" });
          return Response.json(result);
        } catch {
          // Generische Antwort — niemals Stacktraces oder Secrets durchreichen
          return new Response(
            JSON.stringify({ ok: false, error: "Sync failed" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
