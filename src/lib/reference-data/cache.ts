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
import type { ReferenceCatalog, ReferenceDataSnapshot, ReferenceValue } from "./types";

export const CACHE_KEY = "sysing.referencedata.v1";
export const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * BSF-03D-Normalisierung (Review-Fix MEDIUM-2): Snapshots, die vor Einführung
 * des Systemhaus-Scopes geschrieben wurden, tragen weder `scopeType` noch
 * `systemhouseId`. Statt den Cache-Key zu brechen, werden Legacy-Inhalte beim
 * Lesen fail-safe ergänzt: Katalog → `global`, Wert → `null`. Alle vorhandenen
 * Felder bleiben unverändert. Ungültige Einträge (kein Objekt) machen den
 * gesamten Snapshot unbrauchbar (→ null, Netzwerk lädt neu).
 */
function normalizeSnapshot(parsed: unknown): ReferenceDataSnapshot | null {
  if (!isRecord(parsed) || parsed["cacheVersion"] !== 1) return null;
  if (!Array.isArray(parsed["values"]) || !Array.isArray(parsed["catalogs"])) return null;
  if (typeof parsed["fetchedAt"] !== "string") return null;

  const catalogs: ReferenceCatalog[] = [];
  for (const c of parsed["catalogs"] as unknown[]) {
    if (!isRecord(c)) return null;
    catalogs.push({
      ...(c as unknown as ReferenceCatalog),
      scopeType: c["scopeType"] === "systemhouse" ? "systemhouse" : "global",
    });
  }
  const values: ReferenceValue[] = [];
  for (const v of parsed["values"] as unknown[]) {
    if (!isRecord(v)) return null;
    values.push({
      ...(v as unknown as ReferenceValue),
      systemhouseId: typeof v["systemhouseId"] === "string" ? v["systemhouseId"] : null,
    });
  }
  return { cacheVersion: 1, fetchedAt: parsed["fetchedAt"], catalogs, values };
}

export function readCache(): ReferenceDataSnapshot | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(CACHE_KEY);
    if (!raw) return null;
    return normalizeSnapshot(JSON.parse(raw));
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
