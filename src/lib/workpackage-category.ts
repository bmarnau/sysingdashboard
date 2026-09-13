/**
 * Arbeitspaket-Kategorien (BSF-03D, #103) — providerneutrale Fachlogik.
 *
 * Ein Arbeitspaket trägt optional genau eine primäre Kategorie als stabilen
 * Schlüssel (`categoryKey`) des systemhausweiten Reference-Data-Katalogs
 * `workpackage.category`. Dieses Modul kennt weder Supabase noch UI:
 * es arbeitet ausschließlich auf Domänentypen.
 *
 * Grundsätze:
 * - Default keine Kategorie (`null`/fehlend/leer).
 * - Identität über Key, nie über Anzeigename.
 * - Deaktivierte oder unbekannte Keys bleiben erhalten und werden sichtbar
 *   gekennzeichnet — nie still umgedeutet oder gelöscht.
 * - Keine Ableitung von billable/non-billable, Priorität oder Status.
 * - `groupByCategoryKey` bereitet den Controlling-Vertrag (#106) vor.
 */

import type { WorkPackage } from "@/lib/dashboard-data";
import type { ReferenceValue } from "@/lib/reference-data/types";

export const NO_CATEGORY_LABEL = "— Keine Kategorie —";

export type CategoryResolution =
  | { state: "none"; key: null }
  | { state: "active"; key: string; value: ReferenceValue }
  | { state: "inactive"; key: string; value: ReferenceValue }
  | { state: "unknown"; key: string };

/** Normalisierter Kategorie-Key: `null` bei fehlend/leer. */
export function categoryKeyOf(wp: Pick<WorkPackage, "categoryKey">): string | null {
  const key = wp.categoryKey;
  if (typeof key !== "string") return null;
  const trimmed = key.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Löst den Key gegen den (systemhausbezogenen) Wertebestand auf. */
export function resolveCategory(
  wp: Pick<WorkPackage, "categoryKey">,
  values: readonly ReferenceValue[] | null | undefined,
): CategoryResolution {
  const key = categoryKeyOf(wp);
  if (!key) return { state: "none", key: null };
  const value = (values ?? []).find((v) => v.key === key);
  if (!value) return { state: "unknown", key };
  return value.isActive ? { state: "active", key, value } : { state: "inactive", key, value };
}

/** Anzeigename inkl. nachvollziehbarer Kennzeichnung bei Altbestand. */
export function categoryDisplayLabel(
  wp: Pick<WorkPackage, "categoryKey">,
  values: readonly ReferenceValue[] | null | undefined,
): string {
  const r = resolveCategory(wp, values);
  switch (r.state) {
    case "none":
      return NO_CATEGORY_LABEL;
    case "active":
      return r.value.label;
    case "inactive":
      return `${r.value.label} (deaktiviert)`;
    case "unknown":
      return `Unbekannte Kategorie (${r.key})`;
  }
}

/**
 * Auswahlliste für Dialoge: aktive Werte in Katalogreihenfolge, plus der
 * aktuell gesetzte deaktivierte Wert, damit Altbestand nicht verloren geht.
 */
export function selectableCategoryValues(
  values: readonly ReferenceValue[] | null | undefined,
  currentKey: string | null | undefined,
): ReferenceValue[] {
  const all = (values ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  return all.filter((v) => v.isActive || (currentKey != null && v.key === currentKey));
}

export interface CategoryValidationReport {
  unknown: Array<{ workPackageId: string; key: string }>;
  inactive: Array<{ workPackageId: string; key: string }>;
  /** Menschenlesbare, fail-safe Warnungen (keine Fehler, keine Änderung). */
  warnings: string[];
}

/**
 * Fail-safe-Prüfung für Import/Restore: meldet unbekannte und deaktivierte
 * Kategorien, verändert aber nichts. Ohne Katalog (`null`) keine Aussage.
 */
export function validateCategoryKeys(
  workPackages: readonly Pick<WorkPackage, "id" | "categoryKey">[],
  values: readonly ReferenceValue[] | null | undefined,
): CategoryValidationReport {
  const report: CategoryValidationReport = { unknown: [], inactive: [], warnings: [] };
  if (!values) return report;
  for (const wp of workPackages) {
    const r = resolveCategory(wp, values);
    if (r.state === "unknown") {
      report.unknown.push({ workPackageId: wp.id, key: r.key });
      report.warnings.push(
        `Arbeitspaket ${wp.id}: Kategorie „${r.key}“ ist im Katalog unbekannt — Wert wurde unverändert übernommen.`,
      );
    } else if (r.state === "inactive") {
      report.inactive.push({ workPackageId: wp.id, key: r.key });
      report.warnings.push(
        `Arbeitspaket ${wp.id}: Kategorie „${r.key}“ ist deaktiviert — Wert bleibt zur Nachvollziehbarkeit erhalten.`,
      );
    }
  }
  return report;
}

/**
 * Controlling-Vorbereitung (#106): Gruppierung nach stabilem Key.
 * `null` sammelt Arbeitspakete ohne Kategorie.
 */
export function groupByCategoryKey<T extends Pick<WorkPackage, "categoryKey">>(
  workPackages: readonly T[],
): Map<string | null, T[]> {
  const groups = new Map<string | null, T[]>();
  for (const wp of workPackages) {
    const key = categoryKeyOf(wp);
    const bucket = groups.get(key);
    if (bucket) bucket.push(wp);
    else groups.set(key, [wp]);
  }
  return groups;
}
