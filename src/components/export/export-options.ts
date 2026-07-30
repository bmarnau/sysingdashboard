/**
 * Statische Auswahl-Optionen und Defaults des Export-Dialogs.
 * Verhaltensneutral aus ExportDialog.tsx extrahiert (Sprint 05).
 */
import type { ExportFormat, GroupingId, SortKey } from "@/lib/export-data";

export const FORMAT_OPTIONS: { value: ExportFormat; label: string; ext: string }[] = [
  { value: "pdf", label: "PDF", ext: "pdf" },
  { value: "json", label: "JSON", ext: "json" },
  { value: "csv", label: "CSV", ext: "csv" },
  { value: "azure-table", label: "Azure Table (NDJSON)", ext: "ndjson" },
];

export const GROUPING_OPTIONS: { value: GroupingId; label: string }[] = [
  {
    value: "customer-project-workpackage-task",
    label: "Kunde → Projekt → Arbeitspaket → Tätigkeit",
  },
  { value: "project-workpackage-task", label: "Projekt → Arbeitspaket → Tätigkeit" },
  { value: "employee-project-task", label: "Mitarbeiter → Projekt → Tätigkeit" },
  { value: "customer-month-project", label: "Kunde → Monat → Projekt" },
];

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date", label: "Datum aufsteigend" },
  { value: "date-desc", label: "Datum absteigend" },
  { value: "project", label: "Projektname" },
  { value: "customer", label: "Kunde" },
  { value: "employee", label: "Mitarbeiter" },
  { value: "duration", label: "Dauer" },
];

export const sortLabel = (k: SortKey) => SORT_OPTIONS.find((o) => o.value === k)?.label ?? k;
export const groupingLabel = (g: GroupingId) =>
  GROUPING_OPTIONS.find((o) => o.value === g)?.label ?? g;

export const DEFAULTS = {
  format: "pdf" as ExportFormat,
  grouping: "customer-project-workpackage-task" as GroupingId,
  sorting: ["date"] as SortKey[],
};

export const PREFS_KEY = "engineer-dashboard:export-prefs";

export const MONTH_NAMES_DE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];
