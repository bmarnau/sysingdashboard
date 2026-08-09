/**
 * Read-Through-Cache für Reference Data.
 *
 * Key:        `sysing.referencedata.v1`
 * Inhalt:     Katalogversionen, Zeitstempel, Werte — keine Tokens, keine
 *             personenbezogenen Daten.
 * Invalidierung: Alter > MAX_CACHE_AGE_MS ⇒ „stale" (weiter nutzbar, aber
 *             gekennzeichnet). Ersetzt wird immer atomar (ein Write).
 */

import { logger } from "@/lib/logger";
import type { ReferenceDataSnapshot } from "./types";

export const CACHE_KEY = "sysing.referencedata.v1";
export const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function readCache(): ReferenceDataSnapshot | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReferenceDataSnapshot;
    if (parsed?.cacheVersion !== 1 || !Array.isArray(parsed.values)) return null;
    return parsed;
  } catch (error) {
    logger.warn("Reference-Data-Cache unlesbar, wird ignoriert", { error: String(error) });
    return null;
  }
}

/** Atomarer Austausch des Caches. */
export function writeCache(snapshot: ReferenceDataSnapshot): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    logger.warn("Reference-Data-Cache konnte nicht geschrieben werden", { error: String(error) });
  }
}

export function clearCache(): void {
  storage()?.removeItem(CACHE_KEY);
}

export function isStale(snapshot: ReferenceDataSnapshot, now = Date.now()): boolean {
  const ts = Date.parse(snapshot.fetchedAt);
  if (Number.isNaN(ts)) return true;
  return now - ts > MAX_CACHE_AGE_MS;
}
