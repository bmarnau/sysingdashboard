/**
 * Backend API Server (lokal, ESM)
 *
 * Start: `node backend/server.mjs`  (Standardport 8787, via PORT überschreibbar)
 *
 * WICHTIG: Dieser Server läuft NUR lokal. In Production übernehmen die
 * TanStack-Server-Routes unter src/routes/api/* dieselbe Aufgabe und
 * importieren dieselben Services aus backend/services/.
 */
import http from "node:http";
import { handleSync } from "./routes/sync.mjs";
import { handleStatus } from "./routes/status.mjs";
import { getMode } from "../config/env.mjs";

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || "127.0.0.1";

const ROUTES = {
  "POST /api/sync": handleSync,
  "GET /api/status": handleStatus,
};

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export const server = http.createServer(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const key = `${req.method} ${url.pathname}`;
  const handler = ROUTES[key];

  if (!handler) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found", path: url.pathname }));
    return;
  }

  try {
    await handler(req, res);
  } catch {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "Internal Server Error" }));
  }
});

// Direktstart: node backend/server.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, HOST, () => {
    console.log(`[backend] mode=${getMode()} listening on http://${HOST}:${PORT}`);
    for (const k of Object.keys(ROUTES)) console.log(`  - ${k}`);
  });
}
