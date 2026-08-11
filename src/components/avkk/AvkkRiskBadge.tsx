/**
 * Statusdarstellung des Frühindikators. Immer Text + Symbol, nie nur Farbe.
 */
import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";
import type { AvkkRow } from "@/lib/avkk/workspace";

export function AvkkRiskBadge({ row }: { row: AvkkRow }) {
  if (!row.hasDossier) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        <CircleDashed className="size-3.5" aria-hidden="true" />
        Nicht erfasst
      </span>
    );
  }
  if (row.atRisk) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/15 px-2 py-0.5 text-xs text-destructive">
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        Gefährdet
      </span>
    );
  }
  if (row.responsibleCount === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/15 px-2 py-0.5 text-xs text-warning">
        <CircleDashed className="size-3.5" aria-hidden="true" />
        Ohne Verantwortung
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/15 px-2 py-0.5 text-xs text-success">
      <CheckCircle2 className="size-3.5" aria-hidden="true" />
      Unauffällig
    </span>
  );
}

export function AvkkCompletenessBadge({ row }: { row: AvkkRow }) {
  const label = row.complete
    ? "Vollständig bewertet"
    : `Kompetenz ${row.ratedDimensions}/${row.totalDimensions}`;
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-secondary/40 px-2 py-0.5 text-xs text-muted-foreground">
      {label}
    </span>
  );
}
