/** Domänentypen des Reference-Data-Plattformdienstes (Sprint 07B). */

/**
 * Geltungsbereich eines Katalogs (BSF-03D):
 * - `global`: ein Wertebestand für alle (AVKK-Kataloge).
 * - `systemhouse`: Werte gehören genau einem Systemhaus; Lesen/Schreiben ist
 *   serverseitig (RLS) an eine aktive Membership gebunden.
 */
export type ReferenceScopeType = "global" | "systemhouse";

export interface ReferenceCatalog {
  id: string;
  key: string;
  name: string;
  description: string;
  domain: string;
  isSystem: boolean;
  isHierarchical: boolean;
  version: number;
  scopeType: ReferenceScopeType;
}

export interface ReferenceValue {
  id: string;
  catalogId: string;
  catalogKey: string;
  key: string;
  label: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  isDefault: boolean;
  parentValueId: string | null;
  attributes: Record<string, unknown>;
  validFrom: string;
  validTo: string | null;
  /** null bei globalen Katalogen, sonst das besitzende Systemhaus. */
  systemhouseId: string | null;
}

/** Was im Read-Through-Cache liegt. Enthält bewusst keine Tokens. */
export interface ReferenceDataSnapshot {
  cacheVersion: 1;
  fetchedAt: string;
  catalogs: ReferenceCatalog[];
  values: ReferenceValue[];
}

export interface ReferenceDataState {
  snapshot: ReferenceDataSnapshot;
  /** true, wenn die Daten aus dem Cache stammen und älter als `MAX_CACHE_AGE_MS` sind. */
  stale: boolean;
  source: "network" | "cache";
}

/** Katalogschlüssel der AVKK-Erstkataloge (nur Schlüssel, keine Werte!). */
export const CATALOG_KEYS = {
  responsibilityType: "avkk.responsibility_type",
  responsibilityRole: "avkk.responsibility_role",
  competenceDimension: "avkk.competence_dimension",
  competenceRating: "avkk.competence_rating",
  consequenceArea: "avkk.consequence_area",
  consequenceSeverity: "avkk.consequence_severity",
  scheduleImpact: "avkk.schedule_impact",
  /** BSF-03D: systemhausweite Arbeitspaket-Kategorien (scope `systemhouse`). */
  workPackageCategory: "workpackage.category",
} as const;

export type CatalogKey = (typeof CATALOG_KEYS)[keyof typeof CATALOG_KEYS];
