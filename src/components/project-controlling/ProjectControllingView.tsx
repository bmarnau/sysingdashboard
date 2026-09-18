import { ProjectControllingDrilldown } from "@/components/project-controlling/ProjectControllingDrilldown";
import { ProjectControllingFilters } from "@/components/project-controlling/ProjectControllingFilters";
import { ProjectControllingSummary } from "@/components/project-controlling/ProjectControllingSummary";
import type {
  ProjectControllingFilters as ProjectControllingFilterValue,
  ProjectControllingResult,
} from "@/lib/project-controlling/project-controlling-contract";

export type ProjectControllingViewState =
  | { kind: "loading" }
  | { kind: "ready"; result: ProjectControllingResult }
  | { kind: "error" };

function formatHours(value: number): string {
  return `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} h`;
}

export function ProjectControllingView({
  state,
  onFiltersChange,
}: {
  state: ProjectControllingViewState;
  onFiltersChange?: (filters: ProjectControllingFilterValue) => void;
}) {
  return (
    <section aria-labelledby="project-controlling-title" className="space-y-4">
      <div>
        <p className="text-sm font-medium text-primary">BSF-03A</p>
        <h1 id="project-controlling-title" className="text-2xl font-semibold tracking-tight">
          Projektcontrolling
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only Leistungssicht für den zulässigen Kunden- und Projektscope.
        </p>
      </div>

      {state.kind === "loading" && (
        <p role="status" className="text-sm text-muted-foreground">
          Controlling-Daten werden geladen …
        </p>
      )}

      {state.kind === "ready" && (
        <>
          <ProjectControllingFilters
            filters={state.result.filters}
            scopeOptions={state.result.scopeOptions}
            onChange={onFiltersChange}
          />
          <ProjectControllingSummary summary={state.result.summary} />
          <section aria-label="Täglicher Stundenverlauf" className="rounded-lg border bg-card p-4">
            <div className="mb-3">
              <h2 className="text-lg font-semibold">Täglicher Stundenverlauf</h2>
              <p className="text-sm text-muted-foreground">
                Gesamt-, abrechenbare und nicht abrechenbare Stunden je Kalendertag.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Datum</th>
                    <th className="py-2 pr-3 text-right">Gesamt</th>
                    <th className="py-2 pr-3 text-right">Abrechenbar</th>
                    <th className="py-2 text-right">Nicht abrechenbar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {state.result.trend.map((point) => (
                    <tr key={point.date}>
                      <td className="py-2 pr-3">{point.date}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatHours(point.totalHours)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatHours(point.billableHours)}</td>
                      <td className="py-2 text-right tabular-nums">{formatHours(point.nonBillableHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <ProjectControllingDrilldown
            rows={state.result.rows}
            completeness={state.result.completeness}
          />
        </>
      )}

      {state.kind === "error" && (
        <p role="alert" className="text-sm text-destructive">
          Projektcontrolling konnte nicht geladen werden.
        </p>
      )}
    </section>
  );
}
