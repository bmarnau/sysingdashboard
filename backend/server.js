/**
 * Backend API Server (lokal)
 *
 * Minimaler Node-HTTP-Server ohne zusätzliche Dependencies.
 * Start: `node backend/server.js`  (Standardport 8787, via PORT überschreibbar)
 *
 * WICHTIG: Dieser Server läuft NUR lokal. Im Lovable-/Cloudflare-Deployment
 * wird er nicht ausgeführt — dort übernimmt die TanStack-Start-App den
 * Request-Handling-Teil. Diese Datei dient zur lokalen Trennung von UI
 * und Datenzugriff sowie für Node-only-Tests.
 */
const http = require('http');
const { handleSync } = require('./routes/sync.js');
const { handleStatus } = require('./routes/status.js');
const { getMode } = require('../config/env.js');

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || '127.0.0.1';

const ROUTES = {
  'POST /api/sync': handleSync,
  'GET /api/status': handleStatus,
};

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer(async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const key = `${req.method} ${url.pathname}`;
  const handler = ROUTES[key];

  if (!handler) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found', path: url.pathname }));
    return;
  }

  try {
    await handler(req, res);
  } catch (err) {
    // Keine Secrets oder Stacktraces an Clients durchreichen
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Internal Server Error' }));
  }
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    // Keine Secrets loggen — nur Betriebsinfos
    console.log(`[backend] mode=${getMode()} listening on http://${HOST}:${PORT}`);
    console.log('[backend] routes:');
    for (const k of Object.keys(ROUTES)) console.log(`  - ${k}`);
  });
}

module.exports = { server };
