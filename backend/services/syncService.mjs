/**
 * Sync Service (ESM)
 *
 * Kapselt den Datenabgleich. Im development-Mode liefert er ausschließlich
 * Mock-Daten; nur in production darf eine echte Azure-Verbindung aufgebaut
 * werden (siehe config/env.mjs → assertAzureAllowed).
 *
 * Framework-frei: wird sowohl vom lokalen Node-Server (backend/server.mjs)
 * als auch von den TanStack-Server-Routes (src/routes/api/*) importiert.
 */
import { isDev, assertAzureAllowed } from "../../config/env.mjs";
import { has } from "../../config/secretManager.mjs";

let lastRun = null;
let lastError = null;
let lastDurationMs = null;
let runCount = 0;

export async function runSync({ source = "manual" } = {}) {
  const startedAt = new Date();
  runCount += 1;

  try {
    let result;
    if (isDev()) {
      result = { mode: "mock", recordsProcessed: 42, source };
    } else {
      assertAzureAllowed();
      if (!has("AZURE_SQL_CONNECTION") || !has("AZURE_TABLE_CONNECTION")) {
        throw new Error("Required Azure secrets are not configured");
      }
      // TODO: echte Sync-Implementierung anbinden
      result = { mode: "live", recordsProcessed: 0, source };
    }

    lastRun = startedAt.toISOString();
    lastError = null;
    lastDurationMs = Date.now() - startedAt.getTime();
    return { ok: true, startedAt: lastRun, durationMs: lastDurationMs, ...result };
  } catch (err) {
    lastError = err?.message || String(err);
    lastDurationMs = Date.now() - startedAt.getTime();
    throw err;
  }
}

export function getSyncMeta() {
  return { lastRun, lastError, lastDurationMs, runCount };
}
