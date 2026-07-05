/**
 * Sync Service (ESM)
 *
 * Kapselt den Datenabgleich. Im development-Mode liefert er ausschließlich
 * Mock-Daten; nur in production darf eine echte Azure-Verbindung aufgebaut
 * werden (siehe config/env.mjs → assertAzureAllowed).
 *
 * Framework-frei: wird sowohl vom lokalen Node-Server (backend/server.mjs)
 * als auch von den TanStack-Server-Routes (src/routes/api/*) importiert.
 *
 * Fehlerbehandlung: jeder Fehler wird über `logger.error` protokolliert
 * und als strukturiertes Objekt (`SYNC_*`-Code) neu geworfen — der
 * Aufrufer bekommt einen `Error` mit `code`- und `context`-Feld statt
 * einer unspezifischen Message.
 */
import { isDev, assertAzureAllowed } from "../../config/env.mjs";
import { has } from "../../config/secretManager.mjs";
import { logger } from "./logger.mjs";

class SyncError extends Error {
  constructor(code, message, context) {
    super(message);
    this.name = "SyncError";
    this.code = code;
    this.context = context;
  }
}

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
        throw new SyncError(
          "SYNC_MISSING_SECRETS",
          "Required Azure secrets are not configured",
          { source, missing: ["AZURE_SQL_CONNECTION", "AZURE_TABLE_CONNECTION"] },
        );
      }
      // TODO: echte Sync-Implementierung anbinden
      result = { mode: "live", recordsProcessed: 0, source };
    }

    lastRun = startedAt.toISOString();
    lastError = null;
    lastDurationMs = Date.now() - startedAt.getTime();
    logger.info("Sync completed", {
      source,
      mode: result.mode,
      recordsProcessed: result.recordsProcessed,
      durationMs: lastDurationMs,
    });
    return { ok: true, startedAt: lastRun, durationMs: lastDurationMs, ...result };
  } catch (err) {
    lastError = err?.message || String(err);
    lastDurationMs = Date.now() - startedAt.getTime();
    logger.error("Sync failed", err, { source, durationMs: lastDurationMs });
    if (err instanceof SyncError) throw err;
    throw new SyncError("SYNC_FAILED", lastError, { source, cause: err?.name });
  }
}

export function getSyncMeta() {
  return { lastRun, lastError, lastDurationMs, runCount };
}
