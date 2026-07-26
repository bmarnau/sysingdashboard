import { Search, X } from "lucide-react";
import type { Severity } from "./types";

export interface FilterState {
  severity: Severity | "ALL";
  area: string;
  category: string;
  status: string;
  bucket: string;
  effort: string;
  query: string;
}

export const EMPTY_FILTER: FilterState = {
  severity: "ALL",
  area: "ALL",
  category: "ALL",
  status: "ALL",
  bucket: "ALL",
  effort: "ALL",
  query: "",
};

interface Props {
  value: FilterState;
  onChange: (next: FilterState) => void;
  options: {
    areas: string[];
    categories: string[];
    statuses: string[];
    buckets: string[];
    efforts: string[];
  };
}

/**
 * Präsentations-Filterleiste. Hält keinen eigenen State — kontrolliert vom Container.
 */
export function ComplianceFilters({ value, onChange, options }: Props) {
  const set = <K extends keyof FilterState>(key: K, v: FilterState[K]) =>
    onChange({ ...value, [key]: v });

  const isFiltered =
    value.severity !== "ALL" ||
    value.area !== "ALL" ||
    value.category !== "ALL" ||
    value.status !== "ALL" ||
    value.bucket !== "ALL" ||
    value.effort !== "ALL" ||
    value.query.trim() !== "";

  return (
    <div className="no-print flex flex-wrap items-center gap-2 rounded-md border border-border bg-secondary/20 p-2 text-xs">
      <label className="relative flex min-w-0 flex-1 items-center">
        <Search
          className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          aria-label="Findings durchsuchen"
          placeholder="Titel, ID, Komponente, Beschreibung…"
          value={value.query}
          onChange={(e) => set("query", e.target.value)}
          className="w-full min-w-0 rounded border border-border bg-background py-1 pl-7 pr-2 text-xs"
        />
      </label>

      <FilterSelect
        label="Schweregrad"
        value={value.severity}
        onChange={(v) => set("severity", v as FilterState["severity"])}
        options={[
          { v: "ALL", l: "Alle Schweregrade" },
          { v: "CRITICAL", l: "CRITICAL" },
          { v: "HIGH", l: "HIGH" },
          { v: "MEDIUM", l: "MEDIUM" },
          { v: "LOW", l: "LOW" },
          { v: "INFO", l: "INFO" },
        ]}
      />
      <FilterSelect
        label="Bereich"
        value={value.area}
        onChange={(v) => set("area", v)}
        options={[{ v: "ALL", l: "Alle Bereiche" }, ...options.areas.map((a) => ({ v: a, l: a }))]}
      />
      <FilterSelect
        label="Kategorie"
        value={value.category}
        onChange={(v) => set("category", v)}
        options={[
          { v: "ALL", l: "Alle Kategorien" },
          ...options.categories.map((a) => ({ v: a, l: a })),
        ]}
      />
      <FilterSelect
        label="Status"
        value={value.status}
        onChange={(v) => set("status", v)}
        options={[{ v: "ALL", l: "Alle Status" }, ...options.statuses.map((a) => ({ v: a, l: a }))]}
      />
      <FilterSelect
        label="Bucket"
        value={value.bucket}
        onChange={(v) => set("bucket", v)}
        options={[{ v: "ALL", l: "Alle Buckets" }, ...options.buckets.map((a) => ({ v: a, l: a }))]}
      />
      <FilterSelect
        label="Aufwand"
        value={value.effort}
        onChange={(v) => set("effort", v)}
        options={[
          { v: "ALL", l: "Alle Aufwände" },
          ...options.efforts.map((a) => ({ v: a, l: a })),
        ]}
      />

      {isFiltered && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTER)}
          className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 hover:bg-accent"
        >
          <X className="size-3" /> Zurücksetzen
        </button>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-border bg-background px-2 py-1 sm:w-auto"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </select>
  );
}
