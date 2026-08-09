/** Domänentypen des Reference-Data-Plattformdienstes (Sprint 07B). */

export interface ReferenceCatalog {
  id: string;
  key: string;
  name: string;
  description: string;
  domain: string;
  isSystem: boolean;
  isHierarchical: boolean;
  version: number;
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
} as const;

export type CatalogKey = (typeof CATALOG_KEYS)[keyof typeof CATALOG_KEYS];
