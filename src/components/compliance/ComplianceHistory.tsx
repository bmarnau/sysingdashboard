import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import prevRaw from "../../../test-report/technical-test-report.prev.json?raw";
import { parseReport, type Report } from "./types";

interface Props {
  current: Report;
}

/**
 * Historie: Delta zwischen aktuellem und vorherigem Prüfbericht.
 * Zeigt nichts, wenn kein Vorgänger vorhanden oder unparsbar.
 */
export function ComplianceHistory({ current }: Props) {
  const prev = parseReport(prevRaw);
  if (!prev) return null;

  const rows: { label: string; now: number; then: number }[] = [
    { label: "CRITICAL", now: current.summary.critical, then: prev.summary.critical },
    { label: "HIGH", now: current.summary.high, then: prev.summary.high },
    { label: "MEDIUM", now: current.summary.medium, then: prev.summary.medium },
    { label: "LOW", now: current.summary.low, then: prev.summary.low },
    {
      label: "Gesamt offen",
      now: current.summary.openTotal ?? current.summary.total,
      then: prev.summary.openTotal ?? prev.summary.total,
    },
  ];

  return (
    <section className="card-print rounded border border-border p-3 text-sm">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">Historie</h3>
        <div className="text-xs text-muted-foreground">
          Vergleich {prev.identity.dashboardVersion} → {current.identity.dashboardVersion}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {rows.map((r) => {
          const delta = r.now - r.then;
          const Icon = delta === 0 ? ArrowRight : delta > 0 ? ArrowUpRight : ArrowDownRight;
          const tone =
            delta === 0 ? "text-muted-foreground" : delta > 0 ? "text-destructive" : "text-success";
          return (
            <div key={r.label} className="rounded border border-border bg-secondary/20 p-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {r.label}
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-lg font-semibold tabular-nums">{r.now}</span>
                <span className={`inline-flex items-center gap-0.5 text-xs ${tone}`}>
                  <Icon className="size-3" />
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground tabular-nums">vorher: {r.then}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
