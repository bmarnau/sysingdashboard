/**
 * BSF-03D (#103) — Fail-safe-Prüfung der Arbeitspaket-Kategorien im Backup.
 *
 * Vergleicht `categoryKey`s aller Arbeitspakete in den Datendateien mit dem
 * Katalog `workpackage.category` aus `reference-data.json`. Ergebnis sind
 * ausschließlich Warnungen: Werte werden nie verändert, ein Restore nie
 * blockiert. Ohne Reference-Data im Archiv findet keine Prüfung statt.
 */

import { strFromU8 } from "fflate";
import type { ReferenceValue } from "@/lib/reference-data/types";
import { CATALOG_KEYS } from "@/lib/reference-data/types";
import { validateCategoryKeys, type CategoryValidationReport } from "@/lib/workpackage-category";
import type { BackupManifestV2 } from "./types";

export interface CategoryCheckResult extends CategoryValidationReport {
  /** false, wenn keine Reference-Data im Archiv lag (keine Aussage möglich). */
  checked: boolean;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseJson(bytes: Uint8Array | undefined): unknown {
  if (!bytes) return null;
  try {
    return JSON.parse(strFromU8(bytes));
  } catch {
    return null;
  }
}

function categoryValuesFrom(refRaw: unknown): ReferenceValue[] | null {
  if (!isRecord(refRaw) || !Array.isArray(refRaw["values"])) return null;
  const out: ReferenceValue[] = [];
  for (const v of refRaw["values"] as unknown[]) {
    if (!isRecord(v) || v["catalogKey"] !== CATALOG_KEYS.workPackageCategory) continue;
    if (typeof v["key"] !== "string") continue;
    out.push({
      id: typeof v["id"] === "string" ? v["id"] : v["key"],
      catalogId: "",
      catalogKey: CATALOG_KEYS.workPackageCategory,
      key: v["key"],
      label: typeof v["label"] === "string" ? v["label"] : v["key"],
      description: "",
      sortOrder: typeof v["sortOrder"] === "number" ? v["sortOrder"] : 0,
      isActive: v["isActive"] !== false,
      isDefault: false,
      parentValueId: null,
      attributes: {},
      validFrom: typeof v["validFrom"] === "string" ? v["validFrom"] : "",
      validTo: typeof v["validTo"] === "string" ? v["validTo"] : null,
      systemhouseId: typeof v["systemhouseId"] === "string" ? v["systemhouseId"] : null,
    });
  }
  return out;
}

function workPackagesFrom(raw: unknown): Array<{ id: string; categoryKey?: string | null }> {
  if (!isRecord(raw) || !Array.isArray(raw["workPackages"])) return [];
  const out: Array<{ id: string; categoryKey?: string | null }> = [];
  for (const wp of raw["workPackages"] as unknown[]) {
    if (!isRecord(wp) || typeof wp["id"] !== "string") continue;
    const key = wp["categoryKey"];
    out.push({ id: wp["id"], categoryKey: typeof key === "string" ? key : null });
  }
  return out;
}

export function checkWorkPackageCategories(
  manifest: BackupManifestV2,
  zip: Record<string, Uint8Array>,
): CategoryCheckResult {
  const refEntry = manifest.entries.find((e) => e.logicalName === "reference-data");
  const values = refEntry ? categoryValuesFrom(parseJson(zip[refEntry.path])) : null;
  if (!values) return { checked: false, unknown: [], inactive: [], warnings: [] };

  const workPackages = manifest.entries
    .filter((e) => e.storageKey !== null)
    .flatMap((e) => workPackagesFrom(parseJson(zip[e.path])));

  return { checked: true, ...validateCategoryKeys(workPackages, values) };
}
