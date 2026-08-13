/**
 * Handlungsbedarf — zentrale Managementsicht. Jede Kategorie nennt ihre Regel
 * und führt per Klick auf die betroffenen Aufgaben (Drill-down).
 */
import { AlertTriangle } from "lucide-react";
import type { ActionCategory, ActionGroup } from "@/lib/avkk/management";

export function ActionNeedPanel({
  groups,
  activeCategory,
  onSelect,
}: {
  groups: readonly ActionGroup[];
  activeCategory: ActionCategory | null;
  onSelect: (category: ActionCategory) => void;
}) {
  const relevant = groups.filter((g) => g.count > 0);

  return (
    <section aria-labelledby="avkk-action-heading" className="space-y-3">
      <h3 id="avkk-action-heading" className="text-sm font-semibold">
        Handlungsbedarf
      </h3>
      {relevant.length === 0 ? (
        <p className="rounded-xl border border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
          Kein akuter Handlungsbedarf in der aktuellen Auswahl. Alle erfassten Aufgaben sind ohne
          Gefährdung, ohne fehlende Voraussetzung und ohne kritische Konsequenz.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          {relevant.map((group) => (
            <li key={group.category}>
              <button
                type="button"
                aria-pressed={activeCategory === group.category}
                onClick={() => onSelect(group.category)}
                className={`flex w-full min-h-11 flex-col rounded-lg border border-border bg-secondary/30 p-3 text-left transition hover:bg-secondary/60 ${
                  activeCategory === group.category ? "ring-2 ring-primary" : ""
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden="true" />
                  <span className="min-w-0 truncate">{group.label}</span>
                  <span className="ml-auto tabular-nums">{group.count}</span>
                </span>
                <span className="mt-1 text-[11px] text-muted-foreground">{group.rule}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
