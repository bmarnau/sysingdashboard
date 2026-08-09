/**
 * Repository-Schicht: kapselt Datenquelle (Adapter) und Cache und liefert
 * ausschließlich Domänenobjekte. Kein Supabase-Import hier.
 */

import { logger } from "@/lib/logger";
import { ReferenceDataError } from "@/lib/errors";
import { isOnline } from "@/lib/online-status";
import * as adapter from "./adapter";
import { isStale, readCache, writeCache } from "./cache";
import type { ReferenceDataSnapshot, ReferenceDataState } from "./types";

/**
 * Read-Through: Cache lesen → falls online neu laden → Cache atomar ersetzen.
 * Bei Netzfehler bleibt der letzte gültige Stand nutzbar (gekennzeichnet).
 */
export async function load(options: { forceRefresh?: boolean } = {}): Promise<ReferenceDataState> {
  const cached = readCache();

  if (!isOnline()) {
    if (!cached) {
      throw new ReferenceDataError(
        "REFDATA_UNAVAILABLE_OFFLINE",
        "Keine Verbindung und kein lokaler Katalogstand vorhanden.",
      );
    }
    return { snapshot: cached, stale: isStale(cached), source: "cache" };
  }

  if (cached && !options.forceRefresh && !isStale(cached)) {
    // Frischer Cache: sofort nutzbar, kein Netzwerkzugriff nötig.
    return { snapshot: cached, stale: false, source: "cache" };
  }

  try {
    const { catalogs, values } = await adapter.fetchAll();
    const snapshot: ReferenceDataSnapshot = {
      cacheVersion: 1,
      fetchedAt: new Date().toISOString(),
      catalogs,
      values,
    };
    writeCache(snapshot);
    return { snapshot, stale: false, source: "network" };
  } catch (error) {
    if (cached) {
      logger.warn("Reference Data konnte nicht geladen werden — verwende Cache", {
        error: String(error),
      });
      return { snapshot: cached, stale: true, source: "cache" };
    }
    throw error;
  }
}

export const write = {
  insertValue: adapter.insertValue,
  updateValue: adapter.updateValueRow,
};
