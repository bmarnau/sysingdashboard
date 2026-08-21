/**
 * Abrechnungs-Tab: Kennzahlen, Verlauf und offene Posten.
 * Verhaltensneutral aus dashboard.tsx extrahiert (Sprint 05).
 */
import { Pencil } from "lucide-react";
import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";
import type { ChartBucket, DashboardViewMode } from "@/lib/time-period";
import { fmtDate, fmtEuro } from "../formatters";
import { Card, IconBtn } from "../primitives";

export function BillingView({
  activities,
  workPackages,
  projects,
  buckets,
  chartMax,
  viewMode,
  onEdit,
  canEdit,
}: {
  activities: Activity[];
  workPackages: WorkPackage[];
  projects: Project[];
  buckets: ChartBucket[];
  chartMax: number;
  viewMode: DashboardViewMode;
  onEdit: (a: Activity) => void;
  /** RBAC: Bearbeiten nur bei `activity.edit`. */
  canEdit: boolean;
}) {
  const wpMap = new Map(workPackages.map((w) => [w.id, w]));
  const projMap = new Map(projects.map((p) => [p.id, p]));

  const open = activities.filter((a) => a.billable && a.billingStatus === "offen");
  const billed = activities.filter((a) => a.billable && a.billingStatus === "abgerechnet");

  const openSum = open.reduce((s, a) => s + a.duration * a.hourlyRate, 0);
  const billedSum = billed.reduce((s, a) => s + a.duration * a.hourlyRate, 0);

  // Group open by client
  const byClient = new Map<string, { hours: number; amount: number; count: number }>();
  for (const a of open) {
    const c = a.client ?? "Ohne Kunde";
    const cur = byClient.get(c) ?? { hours: 0, amount: 0, count: 0 };
    cur.hours += a.duration;
    cur.amount += a.duration * a.hourlyRate;
    cur.count += 1;
    byClient.set(c, cur);
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2 space-y-6">
        <Card>
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">Offene Posten</h2>
            <p className="text-xs text-muted-foreground">
              {open.length} abrechenbare Tätigkeiten · {fmtEuro(openSum)} offen
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Tätigkeit</th>
                  <th className="px-4 py-3">Kunde</th>
                  <th className="px-4 py-3">Zuordnung</th>
                  <th className="px-4 py-3 text-right">Betrag</th>
                  <th className="px-4 py-3 no-print" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {open.map((a) => {
                  const wp = a.workPackageId ? wpMap.get(a.workPackageId) : null;
                  const project = wp?.projectId ? projMap.get(wp.projectId) : null;
                  return (
                    <tr key={a.id} className="hover:bg-secondary/20">
                      <td className="px-4 py-3 font-mono text-xs">{fmtDate(a.date)}</td>
                      <td className="px-4 py-3">{a.title}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{a.client ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {wp ? (
                          <>
                            {wp.title}
                            {" · "}
                            {project ? project.name : <span className="italic">projektlos</span>}
                          </>
                        ) : (
                          <span className="italic">ohne Arbeitspaket</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {fmtEuro(a.duration * a.hourlyRate)}
                      </td>
                      <td className="px-4 py-3 no-print text-right">
                        {canEdit && (
                          <IconBtn onClick={() => onEdit(a)} title="Bearbeiten">
                            <Pencil className="size-3.5" />
                          </IconBtn>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {open.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-sm text-muted-foreground"
                    >
                      Keine offenen Posten.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">Umsatzübersicht</h2>
          </div>
          <div className="space-y-3 px-6 py-5 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Offen</span>
              <span className="font-mono text-lg font-semibold text-warning">
                {fmtEuro(openSum)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Abgerechnet</span>
              <span className="font-mono text-lg font-semibold text-success">
                {fmtEuro(billedSum)}
              </span>
            </div>
            <div className="border-t border-border pt-3 flex items-baseline justify-between">
              <span className="font-medium">Gesamt</span>
              <span className="font-mono text-lg font-semibold">
                {fmtEuro(openSum + billedSum)}
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">Offen je Kunde</h2>
          </div>
          <ul className="divide-y divide-border">
            {[...byClient.entries()]
              .sort((a, b) => b[1].amount - a[1].amount)
              .map(([client, v]) => (
                <li key={client} className="flex items-center justify-between px-6 py-3 text-sm">
                  <div>
                    <p className="font-medium">{client}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.count} Tätigkeiten · {v.hours.toFixed(1)} h
                    </p>
                  </div>
                  <span className="font-mono font-semibold">{fmtEuro(v.amount)}</span>
                </li>
              ))}
            {byClient.size === 0 && (
              <li className="px-6 py-6 text-center text-sm text-muted-foreground">
                Keine offenen Beträge.
              </li>
            )}
          </ul>
        </Card>

        <Card>
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">
              {viewMode === "month" ? "Aufwände dieses Monats" : "Aufwände dieser Woche"}
            </h2>
            <p className="text-xs text-muted-foreground">Erfasst vs. verrechenbar</p>
          </div>
          <div className="px-6 py-5">
            <div className="flex h-32 items-end justify-between gap-2">
              {buckets.map((d) => (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-md bg-secondary"
                      style={{ height: `${(d.hours / chartMax) * 100}%` }}
                    />
                    <div
                      className="absolute bottom-0 w-full rounded-t-md"
                      style={{
                        height: `${(d.billable / chartMax) * 100}%`,
                        background: "var(--gradient-primary)",
                      }}
                    />
                  </div>
                  <p className="text-[10px] font-medium">{d.label}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {d.hours.toFixed(1)}h
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
