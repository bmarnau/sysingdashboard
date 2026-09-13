import type { ReferenceValue } from "./types";

export interface WorkPackageCategorySnapshot {
  categoryKey?: string | null;
  categoryLabel?: string | null;
}

export interface ResolvedWorkPackageCategory {
  categoryKey: string | null;
  categoryLabel: string | null;
  selectable: boolean;
}

/** Nur aktive Werte sind für neue Zuweisungen wählbar. */
export function selectableWorkPackageCategories(
  values: readonly ReferenceValue[],
): ReferenceValue[] {
  return values
    .filter((value) => value.catalogKey === "workpackage.category" && value.isActive)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

/**
 * Verbindet den gespeicherten WorkPackage-Snapshot mit dem aktuellen Katalog.
 *
 * - aktiv: aktuelles Label wird für eine neue Speicherung verwendet,
 * - deaktiviert: historischer Snapshot bleibt sichtbar, aber nicht wählbar,
 * - unbekannt/fremd: niemals still umdeuten; Snapshot bleibt fail-safe erhalten,
 * - kein Key: fachlich keine Kategorie.
 */
export function resolveWorkPackageCategory(
  input: WorkPackageCategorySnapshot,
  values: readonly ReferenceValue[],
): ResolvedWorkPackageCategory {
  const categoryKey = input.categoryKey?.trim() || null;
  if (!categoryKey) {
    return { categoryKey: null, categoryLabel: null, selectable: true };
  }

  const current = values.find(
    (value) => value.catalogKey === "workpackage.category" && value.key === categoryKey,
  );

  if (!current) {
    return {
      categoryKey,
      categoryLabel: input.categoryLabel?.trim() || categoryKey,
      selectable: false,
    };
  }

  if (!current.isActive) {
    return {
      categoryKey,
      categoryLabel: input.categoryLabel?.trim() || current.label,
      selectable: false,
    };
  }

  return {
    categoryKey,
    categoryLabel: current.label,
    selectable: true,
  };
}
