/**
 * MSW-Handler für die eigenen `/api/*`-TSS-Routen. Wird gebraucht, wenn
 * ein Frontend-Test unter jsdom `fetch("/api/status")` aufruft, ohne den
 * Dev-Server zu starten.
 */
import { http, HttpResponse } from "msw";

export const apiHandlers = [
  http.get("/api/status", () =>
    HttpResponse.json({
      ok: true,
      mode: "test",
      version: "test",
      timestamp: "2026-01-01T00:00:00.000Z",
    }),
  ),
  http.post("/api/sync", () =>
    HttpResponse.json({
      ok: true,
      source: "test",
      at: "2026-01-01T00:00:00.000Z",
      durationMs: 5,
    }),
  ),
];
