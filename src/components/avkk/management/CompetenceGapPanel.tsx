/**
 * Kompetenz / Voraussetzungen — aggregiert **pro Dimension**, nie pro Person.
 */
import type { CompetenceGap } from "@/lib/avkk/management";

export function CompetenceGapPanel({
  gaps,
  activeDimension,
  onSelect,
}: {
  gaps: readonly CompetenceGap[];
  activeDimension: string | null;
  onSelect: (dimensionKey: string) => void;
}) {
  return (
    <section aria-labelledby="avkk-competence-heading" className="space-y-3">
      <div>
        <h3 id="avkk-competence-heading" className="text-sm font-semibold">
          Kompetenz / Voraussetzungen
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Dargestellt wird, welche Voraussetzung bei wie vielen Aufgaben fehlt — bewusst ohne
          personenbezogene Bewertung.
        </p>
      </div>
      {gaps.length === 0 ? (
        <p className="rounded-xl border border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
          In der aktuellen Auswahl ist keine fehlende Voraussetzung erfasst.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {gaps.map((gap) => (
            <li key={gap.dimensionKey}>
              <button
                type="button"
                aria-pressed={activeDimension === gap.dimensionKey}
                onClick={() => onSelect(gap.dimensionKey)}
                className={`w-full min-h-11 rounded-lg border border-border bg-secondary/30 p-3 text-left transition hover:bg-secondary/60 ${
                  activeDimension === gap.dimensionKey ? "ring-2 ring-primary" : ""
                }`}
              >
                <span className="block text-sm font-medium">{gap.dimensionLabel}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  fehlt bei {gap.missing} · teilweise bei {gap.partial} · Unterstützung angefragt:{" "}
                  {gap.supportNeeded}
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  {gap.keys.length} betroffene Aufgabe(n)
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
