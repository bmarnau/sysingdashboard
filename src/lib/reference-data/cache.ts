/**
 * Principal- und Systemhouse-gebundener Read-Through-Cache für Reference Data.
 *
 * V2 verhindert, dass ein nachfolgend angemeldeter Benutzer Katalogwerte aus
 * dem Cache eines vorherigen Principals sieht. Die Cache-Nutzdaten enthalten
 * weiterhin keine Tokens oder Secrets.
 */

import { logger } from "@/lib/logger";
import type { ReferenceDataAccessContext, ReferenceDataSnapshot } from "./types";

export const CACHE_VERSION = 2 as const;
export const CACHE_KEY_PREFIX = "sysing.referencedata.v2";
export const LEGACY_CACHE_KEY = "sysing.referencedata.v1";
/** @deprecated Nur für Übergangstests; V2 liest diesen Key nicht. */
export const CACHE_KEY = LEGACY_CACHE_KEY;
export const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function normalizeAccessContext(
  context: ReferenceDataAccessContext,
): ReferenceDataAccessContext {
  return {
    principalId: context.principalId,
    systemhouseIds: [...new Set(context.systemhouseIds)].sort(),
  };
}

export function cacheKey(context: ReferenceDataAccessContext): string {
  const normalized = normalizeAccessContext(context);
  const houses = normalized.systemhouseIds.map(encodeURIComponent).join(",");
  return `${CACHE_KEY_PREFIX}:${encodeURIComponent(normalized.principalId)}:${houses}`;
}

function sameContext(a: ReferenceDataAccessContext, b: ReferenceDataAccessContext): boolean {
  const left = normalizeAccessContext(a);
  const right = normalizeAccessContext(b);
  return (
    left.principalId === right.principalId &&
    left.systemhouseIds.length === right.systemhouseIds.length &&
    left.systemhouseIds.every((value, index) => value === right.systemhouseIds[index])
  );
}

function parseSnapshot(raw: string, expected?: ReferenceDataAccessContext): ReferenceDataSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as ReferenceDataSnapshot;
    if (
      parsed?.cacheVersion !== CACHE_VERSION ||
      !parsed.accessContext ||
      !Array.isArray(parsed.accessContext.systemhouseIds) ||
      !Array.isArray(parsed.catalogs) ||
      !Array.isArray(parsed.values)
    ) {
      return null;
    }
    if (expected && !sameContext(parsed.accessContext, expected)) return null;
    return {
      ...parsed,
      accessContext: normalizeAccessContext(parsed.accessContext),
    };
  } catch (error) {
    logger.warn("Reference-Data-Cache unlesbar, wird ignoriert", { error: String(error) });
    return null;
  }
}

export function readCache(context: ReferenceDataAccessContext): ReferenceDataSnapshot | null {
  const s = storage();
  if (!s) return null;
  const raw = s.getItem(cacheKey(context));
  if (!raw) return null;
  return parseSnapshot(raw, context);
}

/**
 * Offline-Fallback: nur Caches desselben Principals betrachten und davon den
 * zuletzt erfolgreich geschriebenen Stand wählen. Fremde Principals sind
 * ausgeschlossen; ein alter V1-Key wird bewusst ignoriert.
 */
export function readLatestCacheForPrincipal(principalId: string): ReferenceDataSnapshot | null {
  const s = storage();
  if (!s || !principalId) return null;
  const prefix = `${CACHE_KEY_PREFIX}:${encodeURIComponent(principalId)}:`;
  let latest: ReferenceDataSnapshot | null = null;

  for (let index = 0; index < s.length; index += 1) {
    const key = s.key(index);
    if (!key?.startsWith(prefix)) continue;
    const raw = s.getItem(key);
    if (!raw) continue;
    const candidate = parseSnapshot(raw);
    if (!candidate || candidate.accessContext.principalId !== principalId) continue;
    if (!latest || Date.parse(candidate.fetchedAt) > Date.parse(latest.fetchedAt)) {
      latest = candidate;
    }
  }
  return latest;
}

export function writeCache(
  context: ReferenceDataAccessContext,
  snapshot: ReferenceDataSnapshot,
): void {
  const s = storage();
  if (!s) return;
  const normalized = normalizeAccessContext(context);
  try {
    s.setItem(
      cacheKey(normalized),
      JSON.stringify({
        ...snapshot,
        cacheVersion: CACHE_VERSION,
        accessContext: normalized,
      } satisfies ReferenceDataSnapshot),
    );
  } catch (error) {
    logger.warn("Reference-Data-Cache konnte nicht geschrieben werden", { error: String(error) });
  }
}

/**
 * Ohne Kontext werden alle Reference-Data-Caches des Browsers entfernt. Das
 * wird bei Tests/Logout genutzt und beseitigt zugleich den unsicheren V1-Key.
 */
export function clearCache(context?: ReferenceDataAccessContext): void {
  const s = storage();
  if (!s) return;
  if (context) {
    s.removeItem(cacheKey(context));
    return;
  }

  const remove: string[] = [LEGACY_CACHE_KEY];
  for (let index = 0; index < s.length; index += 1) {
    const key = s.key(index);
    if (key?.startsWith(`${CACHE_KEY_PREFIX}:`)) remove.push(key);
  }
  for (const key of remove) s.removeItem(key);
}

export function isStale(snapshot: ReferenceDataSnapshot, now = Date.now()): boolean {
  const ts = Date.parse(snapshot.fetchedAt);
  if (Number.isNaN(ts)) return true;
  return now - ts > MAX_CACHE_AGE_MS;
}
