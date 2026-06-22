/**
 * Status Service
 *
 * Liefert den aktuellen Betriebszustand: Modus, Secret-Verfügbarkeit
 * (maskiert), letzter Sync-Lauf.
 */
const { getMode, isDev } = require('../../config/env.cjs');
const secrets = require('../../config/secretManager.cjs');
const { getSyncMeta } = require('./syncService.cjs');

function getStatus() {
  return {
    mode: getMode(),
    azure: {
      allowed: !isDev(),
      secrets: secrets.status(), // boolean map, keine Klartexte
    },
    sync: getSyncMeta(),
    timestamp: new Date().toISOString(),
  };
}

module.exports = { getStatus };
