/**
 * ExportSortControls — Präsentation der Mehrfach-Sortierung (Sprint 05B).
 *
 * Reine Darstellung: Reihenfolge, Verschieben, Entfernen und Hinzufügen von
 * Sortierschlüsseln. Der Zustand liegt in `useExportDialog`.
 */
import { ChevronDown, ChevronUp, X } from "lucide-react";
import type { SortKey } from "@/lib/export-data";
import { sortLabel } from "@/components/export/export-options";

interface Props {
  sorting: SortKey[];
  availableSorts: { value: SortKey; label: string }[];
  onToggle: (key: SortKey) => void;
  onMove: (index: number, delta: number) => void;
}

export function ExportSortControls({ sorting, availableSorts, onToggle, onMove }: Props) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">Sortierung</span>
      <ul className="space-y-1">
        {sorting.length === 0 && (
          <li className="text-xs italic text-muted-foreground">Keine Sortierung gewählt</li>
        )}
        {sorting.map((k, i) => (
          <li
            key={k}
            className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-2 py-1 text-sm"
          >
            <span className="w-4 text-center font-mono text-xs text-muted-foreground">{i + 1}</span>
            <span className="flex-1">{sortLabel(k)}</span>
            <button
              type="button"
              aria-label="Nach oben"
              disabled={i === 0}
              onClick={() => onMove(i, -1)}
              className="grid size-6 place-items-center rounded hover:bg-secondary disabled:opacity-30"
            >
              <ChevronUp className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Nach unten"
              disabled={i === sorting.length - 1}
              onClick={() => onMove(i, 1)}
              className="grid size-6 place-items-center rounded hover:bg-secondary disabled:opacity-30"
            >
              <ChevronDown className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Entfernen"
              onClick={() => onToggle(k)}
              className="grid size-6 place-items-center rounded hover:bg-destructive/20 hover:text-destructive"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      {availableSorts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {availableSorts.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground transition hover:border-primary hover:text-foreground"
            >
              + {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
