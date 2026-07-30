/**
 * Dateinamens-Erzeugung und Präferenz-Persistenz des Export-Dialogs.
 * Rein funktional — ohne React-Bezug und damit direkt unit-testbar.
 */
import type { ExportFormat, GroupingId, SortKey } from "@/lib/export-data";
import { FORMAT_OPTIONS, MONTH_NAMES_DE, PREFS_KEY } from "./export-options";

export function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function formatMonthLabel(m: string): string {
  const [y, mm] = m.split("-").map(Number);
  if (!y || !mm) return m;
  return `${MONTH_NAMES_DE[mm - 1]} ${y}`;
}

export function buildFileName(opts: {
  format: ExportFormat;
  month: string;
  client?: string;
  project?: string;
}): string {
  const fmt = FORMAT_OPTIONS.find((f) => f.value === opts.format)!;
  const ts = timestamp();
  const client = slugify(opts.client ?? "");
  const project = slugify(opts.project ?? "");
  const base =
    client && project
      ? `${client}_${project}_${opts.month}_${opts.format}_${ts}`
      : client
        ? `${client}_${opts.month}_${opts.format}_${ts}`
        : project
          ? `${project}_${opts.month}_${opts.format}_${ts}`
          : `export_${opts.month}_${opts.format}_${ts}`;
  return `${base}.${fmt.ext}`;
}

export interface StoredPrefs {
  format: ExportFormat;
  month: string;
  clientId: string;
  projectId: string;
  grouping: GroupingId;
  sorting: SortKey[];
}

export function loadPrefs(): Partial<StoredPrefs> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as Partial<StoredPrefs>) : {};
  } catch {
    return {};
  }
}

export function savePrefs(p: StoredPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
