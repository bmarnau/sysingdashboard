/**
 * Status Service
 *
 * Liefert den aktuellen Betriebszustand: Modus, Secret-Verfügbarkeit
 * (maskiert), letzter Sync-Lauf.
 */
const { getMode, isDev } = require('../../config/env.js');
const secrets = require('../../config/secretManager.js');
const { getSyncMeta } = require('./syncService.js');

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
