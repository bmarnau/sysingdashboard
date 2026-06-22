/**
 * POST /api/sync
 *
 * Triggert einen Sync-Lauf. Body (optional): { "source": "manual" | "cron" }
 */
const { runSync } = require('../services/syncService.cjs');

async function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

async function handleSync(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json', Allow: 'POST' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }
  try {
    const body = await readJson(req);
    const source = typeof body.source === 'string' ? body.source : 'manual';
    const result = await runSync({ source });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: err.message || 'Sync failed' }));
  }
}

module.exports = { handleSync };
