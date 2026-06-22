/**
 * GET /api/status
 *
 * Liefert Betriebsstatus (Modus, Secret-Status maskiert, letzter Sync).
 */
const { getStatus } = require('../services/statusService.cjs');

function handleStatus(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json', Allow: 'GET' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(getStatus()));
}

module.exports = { handleStatus };
