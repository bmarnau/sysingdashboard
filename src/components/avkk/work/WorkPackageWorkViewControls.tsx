import type {
  DueGroup,
  WorkPackageWorkViewRow,
  WorkPackageWorkViewSelection,
} from "@/lib/avkk/work-package-work-view.types";
import { inputCls } from "@/components/dashboard/constants";
import { dueGroupLabels, workStatusLabel } from "./work-view-presentation";

function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputCls}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function WorkPackageWorkViewControls({
  rows,
  selection,
  onChange,
  disabled,
}: {
  rows: readonly WorkPackageWorkViewRow[];
  selection: WorkPackageWorkViewSelection;
  onChange: (selection: WorkPackageWorkViewSelection) => void;
  disabled: boolean;
}) {
  const customers = [...new Map(rows.map((row) => [row.customerId, row.customerName])).entries()];
  const owners = [
    ...new Map(
      rows.flatMap((row) =>
        row.owner === "UNASSIGNED" ? [] : [[row.owner.personId, row.owner.displayName] as const],
      ),
    ).entries(),
  ];
  const sortOptions = (options: [string, string][]) =>
    options
      .sort((a, b) => a[1].localeCompare(b[1], "de"))
      .map(([value, label]) => ({ value, label }));
  const filters = selection.filters ?? {};
  const filter = (next: WorkPackageWorkViewSelection["filters"]) =>
    onChange({ ...selection, filters: { ...filters, ...next } });

  return (
    <fieldset
      disabled={disabled}
      aria-label="Darstellung und Filter"
      className="grid min-w-0 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <SelectControl
        label="Gruppieren nach"
        value={selection.groupBy}
        options={[
          { value: "customer", label: "Kunde" },
          { value: "owner", label: "Verantwortlicher" },
          { value: "due", label: "Fälligkeit" },
        ]}
        onChange={(value) =>
          onChange({ ...selection, groupBy: value as WorkPackageWorkViewSelection["groupBy"] })
        }
      />
      <SelectControl
        label="Sortieren nach"
        value={selection.sortBy}
        options={[
          { value: "due", label: "Fälligkeit" },
          { value: "title", label: "Titel" },
          { value: "customer", label: "Kunde" },
          { value: "owner", label: "Verantwortlicher" },
        ]}
        onChange={(value) =>
          onChange({ ...selection, sortBy: value as WorkPackageWorkViewSelection["sortBy"] })
        }
      />
      <SelectControl
        label="Sortierrichtung"
        value={selection.sortDirection}
        options={[
          { value: "asc", label: "Aufsteigend" },
          { value: "desc", label: "Absteigend" },
        ]}
        onChange={(value) =>
          onChange({
            ...selection,
            sortDirection: value as WorkPackageWorkViewSelection["sortDirection"],
          })
        }
      />
      <label className="grid min-w-0 gap-1.5 text-sm">
        Arbeitspakete suchen
        <input
          type="search"
          aria-label="Arbeitspakete suchen"
          value={filters.text ?? ""}
          onChange={(event) => filter({ text: event.target.value })}
          className={inputCls}
          placeholder="Titel, Kunde oder Verantwortlicher"
        />
      </label>
      <SelectControl
        label="Kunde filtern"
        value={filters.customerIds?.[0] ?? ""}
        options={[{ value: "", label: "Alle Kunden" }, ...sortOptions(customers)]}
        onChange={(value) => filter({ customerIds: value ? [value] : undefined })}
      />
      <SelectControl
        label="Verantwortlichen filtern"
        value={filters.ownerIds?.[0] ?? ""}
        options={[
          { value: "", label: "Alle Verantwortlichen" },
          ...sortOptions(owners),
          { value: "UNASSIGNED", label: "Nicht zugeordnet" },
        ]}
        onChange={(value) => filter({ ownerIds: value ? [value] : undefined })}
      />
      <SelectControl
        label="Status filtern"
        value={filters.status?.[0] ?? ""}
        options={[
          { value: "", label: "Alle Status" },
          ...sortOptions(
            [...new Set(rows.map((row) => row.status))].map((status) => [
              status,
              workStatusLabel(status),
            ]),
          ),
        ]}
        onChange={(value) => filter({ status: value ? [value] : undefined })}
      />
      <SelectControl
        label="Fälligkeit filtern"
        value={filters.dueGroups?.[0] ?? ""}
        options={[
          { value: "", label: "Alle Fälligkeiten" },
          ...Object.entries(dueGroupLabels).map(([value, label]) => ({ value, label })),
        ]}
        onChange={(value) => filter({ dueGroups: value ? [value as DueGroup] : undefined })}
      />
      <button
        type="button"
        onClick={() => onChange({ ...selection, filters: {} })}
        className="justify-self-start rounded-md border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Filter zurücksetzen
      </button>
    </fieldset>
  );
}
