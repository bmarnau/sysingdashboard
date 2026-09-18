export type ProjectControllingLoadState = "loading" | "ready" | "error";

export function ProjectControllingView({ state }: { state: ProjectControllingLoadState }) {
  return (
    <section aria-labelledby="project-controlling-title" className="space-y-4">
      <div>
        <p className="text-sm font-medium text-primary">BSF-03A</p>
        <h1 id="project-controlling-title" className="text-2xl font-semibold tracking-tight">
          Projektcontrolling
        </h1>
      </div>
      {state === "loading" && (
        <p role="status" className="text-sm text-muted-foreground">
          Controlling-Daten werden geladen …
        </p>
      )}
      {state === "ready" && (
        <p className="text-sm text-muted-foreground">
          Die read-only Controlling-Sicht wird vorbereitet.
        </p>
      )}
      {state === "error" && (
        <p role="alert" className="text-sm text-destructive">
          Projektcontrolling konnte nicht geladen werden.
        </p>
      )}
    </section>
  );
}
