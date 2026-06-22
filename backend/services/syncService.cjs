/**
 * Sync Service
 *
 * Kapselt den Datenabgleich. Im development-Mode liefert er ausschließlich
 * Mock-Daten; nur in production darf eine echte Azure-Verbindung aufgebaut
 * werden (siehe config/env.js → assertAzureAllowed).
 */
const { isDev, assertAzureAllowed } = require('../../config/env.cjs');
const secrets = require('../../config/secretManager.cjs');

let lastRun = null;
let lastError = null;
let lastDurationMs = null;
let runCount = 0;

async function runSync({ source = 'manual' } = {}) {
  const startedAt = new Date();
  runCount += 1;

  try {
    let result;
    if (isDev()) {
      // DEV: nie Azure kontaktieren, immer Mock zurückgeben
      result = {
        mode: 'mock',
        recordsProcessed: 42,
        source,
      };
    } else {
      assertAzureAllowed('runSync');
      // PROD: echter Azure-Sync gehört hier rein.
      // Secrets nur via secretManager.consume() lesen, nie loggen.
      const hasSql = secrets.has('AZURE_SQL_CONNECTION');
      const hasTable = secrets.has('AZURE_TABLE_CONNECTION');
      if (!hasSql || !hasTable) {
        throw new Error('Required Azure secrets are not configured');
      }
      // TODO: echte Sync-Implementierung anbinden
      result = {
        mode: 'live',
        recordsProcessed: 0,
        source,
      };
    }

    lastRun = startedAt.toISOString();
    lastError = null;
    lastDurationMs = Date.now() - startedAt.getTime();
    return { ok: true, startedAt: lastRun, durationMs: lastDurationMs, ...result };
  } catch (err) {
    lastError = err.message || String(err);
    lastDurationMs = Date.now() - startedAt.getTime();
    throw err;
  }
}

function getSyncMeta() {
  return {
    lastRun,
    lastError,
    lastDurationMs,
    runCount,
  };
}

module.exports = { runSync, getSyncMeta };
