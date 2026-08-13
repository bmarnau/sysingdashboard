/**
 * Konsequenzen — betroffene Bereiche mit Schweregrad und Terminwirkung.
 */
import type { ConsequenceGroup } from "@/lib/avkk/management";

export function ConsequencePanel({
  groups,
  activeArea,
  onSelect,
}: {
  groups: readonly ConsequenceGroup[];
  activeArea: string | null;
  onSelect: (areaKey: string) => void;
}) {
  return (
    <section aria-labelledby="avkk-consequence-heading" className="space-y-3">
      <div>
        <h3 id="avkk-consequence-heading" className="text-sm font-semibold">
          Konsequenzen
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Zeigt, welche Bereiche bei Nichterfüllung betroffen sind — Grundlage für Priorisierung.
        </p>
      </div>
      {groups.length === 0 ? (
        <p className="rounded-xl border border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
          In der aktuellen Auswahl ist keine Konsequenz erfasst.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <li key={group.areaKey}>
              <button
                type="button"
                aria-pressed={activeArea === group.areaKey}
                onClick={() => onSelect(group.areaKey)}
                className={`w-full min-h-11 rounded-lg border border-border bg-secondary/30 p-3 text-left transition hover:bg-secondary/60 ${
                  activeArea === group.areaKey ? "ring-2 ring-primary" : ""
                }`}
              >
                <span className="block text-sm font-medium">{group.areaLabel}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  kritisch: {group.critical} · hoch: {group.high} · gesamt: {group.total}
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  Terminwirkung: {group.scheduleImpacts.join(", ") || "—"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
