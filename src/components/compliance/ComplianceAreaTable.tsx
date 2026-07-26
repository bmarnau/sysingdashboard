import { AlertTriangle, CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { STATUS_LABEL, type Report } from "./types";

function statusIcon(status: string) {
  if (status === "passed") return <CheckCircle2 className="size-4 text-success" />;
  if (status === "failed" || status === "blocked")
    return <XCircle className="size-4 text-destructive" />;
  if (status === "not-run") return <ShieldAlert className="size-4 text-muted-foreground" />;
  return <AlertTriangle className="size-4 text-warning" />;
}

interface Props {
  areas: Report["areas"];
}

/**
 * Bereichstabelle: unterhalb sm als Karten-Liste, ab sm als Tabelle.
 */
export function ComplianceAreaTable({ areas }: Props) {
  const entries = Object.entries(areas);
  if (entries.length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 font-semibold">Testergebnisse nach Bereich</h3>

      {/* Mobile: Karten */}
      <ul className="grid gap-2 sm:hidden">
        {entries.map(([area, row]) => (
          <li key={area} className="card-print rounded border border-border p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{area}</span>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs">
                {statusIcon(row.status)} {STATUS_LABEL[row.status] ?? row.status}
              </span>
            </div>
            <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
              <span>
                CRIT offen:{" "}
                <strong className="text-foreground tabular-nums">{row.openCritical}</strong>
              </span>
              <span>
                HIGH offen: <strong className="text-foreground tabular-nums">{row.openHigh}</strong>
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: Tabelle */}
      <div className="card-print hidden overflow-hidden rounded border border-border sm:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Bereich</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">CRIT offen</th>
              <th className="px-3 py-2 text-right font-medium">HIGH offen</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([area, row]) => (
              <tr key={area} className="border-t border-border">
                <td className="px-3 py-2">{area}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5">
                    {statusIcon(row.status)} {STATUS_LABEL[row.status] ?? row.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{row.openCritical}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.openHigh}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
