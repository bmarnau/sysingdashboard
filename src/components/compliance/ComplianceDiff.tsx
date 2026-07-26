import type { Report } from "./types";

interface Props {
  diff: NonNullable<Report["diff"]>;
}

/**
 * Diff-Sektion mit Zählern und klappbaren ID-Listen (max. 20 pro Gruppe).
 */
export function ComplianceDiff({ diff }: Props) {
  return (
    <section className="card-print rounded border border-border p-3 text-sm">
      <h3 className="mb-2 font-semibold">Vergleich zum vorherigen Bericht</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Bucket tone="warning" label="Neu" ids={diff.new} />
        <Bucket tone="success" label="Behoben" ids={diff.fixed} />
        <Bucket tone="destructive" label="Verschlechtert" ids={diff.worse} />
        <Bucket tone="muted" label="Unverändert" ids={diff.same} />
        <Bucket tone="warning" label="Wieder aufgetreten" ids={diff.reappeared} />
      </div>
    </section>
  );
}

function Bucket({
  label,
  ids,
  tone,
}: {
  label: string;
  ids: string[];
  tone: "warning" | "success" | "destructive" | "muted";
}) {
  const dot =
    tone === "success"
      ? "bg-success"
      : tone === "destructive"
        ? "bg-destructive"
        : tone === "warning"
          ? "bg-warning"
          : "bg-muted-foreground/50";
  return (
    <details className="rounded border border-border bg-secondary/20 p-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${dot}`} aria-hidden />
          {label}
        </span>
        <strong className="tabular-nums">{ids.length}</strong>
      </summary>
      {ids.length > 0 && (
        <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-[11px] font-mono text-muted-foreground">
          {ids.slice(0, 20).map((id) => (
            <li key={id} className="truncate">
              {id}
            </li>
          ))}
          {ids.length > 20 && <li>… {ids.length - 20} weitere</li>}
        </ul>
      )}
    </details>
  );
}
