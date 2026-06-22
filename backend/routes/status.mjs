/**
 * GET /api/status — Node-HTTP-Adapter für den lokalen Standalone-Server.
 */
import { getStatus } from "../services/statusService.mjs";

export function handleStatus(req, res) {
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "application/json", Allow: "GET" });
    res.end(JSON.stringify({ error: "Method Not Allowed" }));
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(getStatus()));
}
