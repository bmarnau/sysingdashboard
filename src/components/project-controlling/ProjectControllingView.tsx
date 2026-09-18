import { ProjectControllingSummary } from "@/components/project-controlling/ProjectControllingSummary";
import type { ProjectControllingResult } from "@/lib/project-controlling/project-controlling-contract";

export type ProjectControllingViewState =
  | { kind: "loading" }
  | { kind: "ready"; result: ProjectControllingResult }
  | { kind: "error" };

export function ProjectControllingView({ state }: { state: ProjectControllingViewState }) {
  return (
    <section aria-labelledby="project-controlling-title" className="space-y-4">
      <div>
        <p className="text-sm font-medium text-primary">BSF-03A</p>
        <h1 id="project-controlling-title" className="text-2xl font-semibold tracking-tight">
          Projektcontrolling
        </h1>
      </div>
      {state.kind === "loading" && (
        <p role="status" className="text-sm text-muted-foreground">
          Controlling-Daten werden geladen …
        </p>
      )}
      {state.kind === "ready" && <ProjectControllingSummary summary={state.result.summary} />}
      {state.kind === "error" && (
        <p role="alert" className="text-sm text-destructive">
          Projektcontrolling konnte nicht geladen werden.
        </p>
      )}
    </section>
  );
}
