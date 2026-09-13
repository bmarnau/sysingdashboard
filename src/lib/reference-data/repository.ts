/**
 * Repository-Schicht: kapselt Datenquelle (Adapter) und Cache und liefert
 * ausschließlich Domänenobjekte. Kein Supabase-Import hier.
 */

import { logger } from "@/lib/logger";
import { ReferenceDataError } from "@/lib/errors";
import { isOnline } from "@/lib/online-status";
import * as adapter from "./adapter";
import {
  CACHE_VERSION,
  isStale,
  readCache,
  readLatestCacheForPrincipal,
  writeCache,
} from "./cache";
import type { ReferenceDataSnapshot, ReferenceDataState } from "./types";

function stateFromCache(
  snapshot: ReferenceDataSnapshot,
  stale = isStale(snapshot),
): ReferenceDataState {
  return { snapshot, stale, source: "cache" };
}

async function requirePrincipalId(): Promise<string> {
  const principalId = await adapter.getPrincipalId();
  if (!principalId) {
    throw new ReferenceDataError(
      "REFDATA_AUTH_REQUIRED",
      "Anmeldung für Katalogzugriff erforderlich.",
    );
  }
  return principalId;
}

/**
 * Read-Through V2:
 * - Offline: nur letzter Cache desselben Principals.
 * - Online: aktuellen Membership-Kontext bestimmen, dann exakt passenden Cache
 *   nutzen oder RLS-gefiltert neu laden.
 * - Bei temporärem Netzfehler ist nur ein Cache desselben Principals zulässig.
 */
export async function load(options: { forceRefresh?: boolean } = {}): Promise<ReferenceDataState> {
  const principalId = await requirePrincipalId();

  if (!isOnline()) {
    const cached = readLatestCacheForPrincipal(principalId);
    if (!cached) {
      throw new ReferenceDataError(
        "REFDATA_UNAVAILABLE_OFFLINE",
        "Keine Verbindung und kein lokaler Katalogstand für diesen Benutzer vorhanden.",
      );
    }
    return stateFromCache(cached);
  }

  let context;
  try {
    context = await adapter.getAccessContext();
  } catch (error) {
    const fallback = readLatestCacheForPrincipal(principalId);
    if (fallback) {
      logger.warn("Reference-Data-Scope konnte nicht aktualisiert werden — verwende Cache", {
        error: String(error),
      });
      return stateFromCache(fallback, true);
    }
    throw error;
  }

  const cached = readCache(context);
  if (cached && !options.forceRefresh && !isStale(cached)) {
    return stateFromCache(cached, false);
  }

  try {
    const { catalogs, values } = await adapter.fetchAll(context);
    const snapshot: ReferenceDataSnapshot = {
      cacheVersion: CACHE_VERSION,
      accessContext: context,
      fetchedAt: new Date().toISOString(),
      catalogs,
      values,
    };
    writeCache(context, snapshot);
    return { snapshot, stale: false, source: "network" };
  } catch (error) {
    if (cached) {
      logger.warn("Reference Data konnte nicht geladen werden — verwende Cache", {
        error: String(error),
      });
      return stateFromCache(cached, true);
    }
    throw error;
  }
}

export const write = {
  insertValue: adapter.insertValue,
  updateValue: adapter.updateValueRow,
};
