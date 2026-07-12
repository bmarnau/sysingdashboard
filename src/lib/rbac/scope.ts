/**
 * RBAC v2 — Scope-Utilities (pur, ohne Seiteneffekte).
 *
 * Ein Scope ist eine hierarchische Kette der Form
 * `type:{id}[/type:{id}...]`. `*` gilt als Wildcard-Id **und** als
 * Root-Scope (globaler Zugriff).
 */

import { SCOPE_ROOT, type ResourceScope } from "@/lib/rbac/types";

/** Segment einer Scope-Kette. */
export interface ScopeSegment {
  type: string;
  id: string;
}

/**
 * Zerlegt einen Scope-String in Segmente.
 * `"*"` wird zu einer leeren Segmentliste (Root).
 */
export function parseScope(scope: ResourceScope): ScopeSegment[] {
  const trimmed = (scope ?? "").trim();
  if (!trimmed || trimmed === SCOPE_ROOT) return [];
  return trimmed.split("/").map((raw) => {
    const idx = raw.indexOf(":");
    if (idx < 0) throw new Error(`Invalid scope segment: "${raw}"`);
    return { type: raw.slice(0, idx), id: raw.slice(idx + 1) };
  });
}

/** Serialisiert Segmente wieder in einen Scope-String. */
export function serializeScope(segments: readonly ScopeSegment[]): ResourceScope {
  if (segments.length === 0) return SCOPE_ROOT;
  return segments.map((s) => `${s.type}:${s.id}`).join("/");
}

/**
 * Prüft, ob `outer` den `inner` Scope einschließt (Vererbung + Wildcards).
 *
 *  - `*` (Root) schließt alles ein.
 *  - Segment-Prefix zählt: `tenant:a` schließt `tenant:a/customer:c` ein.
 *  - `*` als Segment-Id matcht jede Id auf gleicher Ebene.
 *  - Unterschiedliche Typen an gleicher Ebene → kein Match.
 */
export function scopeIncludes(outer: ResourceScope, inner: ResourceScope): boolean {
  const outerSeg = parseScope(outer);
  const innerSeg = parseScope(inner);
  if (outerSeg.length === 0) return true; // Root
  if (outerSeg.length > innerSeg.length) return false;
  for (let i = 0; i < outerSeg.length; i++) {
    const o = outerSeg[i];
    const n = innerSeg[i];
    if (o.type !== n.type) return false;
    if (o.id !== "*" && o.id !== n.id) return false;
  }
  return true;
}

/**
 * Liefert den engeren (spezifischeren) der beiden Scopes.
 * `null` wenn keiner den anderen einschließt.
 */
export function narrowestScope(
  a: ResourceScope,
  b: ResourceScope,
): ResourceScope | null {
  if (scopeIncludes(a, b)) return b;
  if (scopeIncludes(b, a)) return a;
  return null;
}
