/**
 * Status Service (ESM)
 *
 * Liefert den aktuellen Betriebszustand: Modus, Secret-Verfügbarkeit
 * (maskiert/Boolean) und letzten Sync-Lauf.
 */
import { getMode, isDev } from "../../config/env.mjs";
import { status as secretStatus } from "../../config/secretManager.mjs";
import { getSyncMeta } from "./syncService.mjs";

export function getStatus() {
  return {
    mode: getMode(),
    azure: {
      allowed: !isDev(),
      secrets: secretStatus(),
    },
    sync: getSyncMeta(),
    timestamp: new Date().toISOString(),
  };
}
