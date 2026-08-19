/**
 * Tätigkeiten-Tab: Filterleiste und Tätigkeitstabelle.
 * Verhaltensneutral aus dashboard.tsx extrahiert (Sprint 05).
 */
import { useState } from "react";
import { FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import type { Activity, BillingStatus, Project, WorkPackage } from "@/lib/dashboard-data";
import { fmtDate, fmtEuro } from "../formatters";
import { billingLabel, billingStyles } from "../constants";
import { Card, IconBtn, SearchInput } from "../primitives";

export function ActivitiesView({
  activities,
  periodActivities,
  periodLabel,
  workPackages,
  projects,
  onNew,
  onEdit,
  onDelete,
  canEdit = true,
}: {
  activities: Activity[];
  periodActivities: Activity[];
  periodLabel: string;
  workPackages: WorkPackage[];
  projects: Project[];
  onNew: () => void;
  onEdit: (a: Activity) => void;
  onDelete: (id: string) => void;
  /** RBAC: Schreibaktionen werden nur bei `activity.edit` angeboten. */
  canEdit?: boolean;
}) {
  const [q, setQ] = useState("");
  const [billing, setBilling] = useState<"alle" | BillingStatus>("alle");
  const [scope, setScope] = useState<
    "alle" | "billable" | "non_billable" | "ohne_wp" | "projektlos"
  >("alle");
  const [periodOnly, setPeriodOnly] = useState(true);

  const wpMap = new Map(workPackages.map((w) => [w.id, w]));
  const projMap = new Map(projects.map((p) => [p.id, p]));

  const source = periodOnly ? periodActivities : activities;
  const filtered = source.filter((a) => {
    if (billing !== "alle" && a.billingStatus !== billing) return false;
    if (scope === "billable" && !a.billable) return false;
    if (scope === "non_billable" && a.billable) return false;
    if (scope === "ohne_wp" && a.workPackageId) return false;
    if (scope === "projektlos") {
      const wp = a.workPackageId ? wpMap.get(a.workPackageId) : null;
      if (wp?.projectId) return false;
    }
    if (q) {
      const s = q.toLowerCase();
      return (
        a.title.toLowerCase().includes(s) ||
        (a.client ?? "").toLowerCase().includes(s) ||
        (a.description ?? "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  // Sort by date desc
  const sorted = [...filtered].sort((a, b) =>
    (b.date + (b.time ?? "")).localeCompare(a.date + (a.time ?? "")),
  );

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold">Tätigkeiten</h2>
          <p className="text-xs text-muted-foreground">
            {periodOnly
              ? `${periodLabel} · ${periodActivities.length} Einträge`
              : `Alle · ${activities.length} Einträge`}
            {" · "}Abrechnung erfolgt ausschließlich hier
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5 text-xs">
            <input
              type="checkbox"
              checked={periodOnly}
              onChange={(e) => setPeriodOnly(e.target.checked)}
              className="size-3.5"
            />
            Nur Zeitraum
          </label>
          <SearchInput value={q} onChange={setQ} placeholder="Tätigkeiten suchen…" />
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as typeof scope)}
            className="h-9 rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none focus:border-ring"
          >
            <option value="alle">Alle</option>
            <option value="billable">Abrechenbar</option>
            <option value="non_billable">Nicht abrechenbar</option>
            <option value="ohne_wp">Ohne Arbeitspaket</option>
            <option value="projektlos">Projektlos (inkl. WP ohne Projekt)</option>
          </select>
          <select
            value={billing}
            onChange={(e) => setBilling(e.target.value as typeof billing)}
            className="h-9 rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none focus:border-ring"
          >
            <option value="alle">Alle Abr.-Status</option>
            {(Object.keys(billingLabel) as BillingStatus[]).map((b) => (
              <option key={b} value={b}>
                {billingLabel[b]}
              </option>
            ))}
          </select>
          {canEdit && (
            <button
              onClick={onNew}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 text-sm font-medium hover:bg-secondary"
            >
              <Plus className="size-4" /> Neu
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 sm:px-6">Datum</th>
              <th className="px-4 py-3">Tätigkeit</th>
              <th className="px-4 py-3">Zuordnung</th>
              <th className="px-4 py-3 text-right">Dauer</th>
              <th className="px-4 py-3 text-right">Satz</th>
              <th className="px-4 py-3 text-right">Betrag</th>
              <th className="px-4 py-3">Abrechnung</th>
              <th className="px-4 py-3 no-print" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((a) => {
              const wp = a.workPackageId ? wpMap.get(a.workPackageId) : null;
              const project = wp?.projectId ? projMap.get(wp.projectId) : null;
              const amount = a.billable ? a.duration * a.hourlyRate : 0;
              return (
                <tr key={a.id} className="hover:bg-secondary/20">
                  <td className="px-4 py-3 sm:px-6">
                    <p className="font-medium">{fmtDate(a.date)}</p>
                    <p className="font-mono text-xs text-muted-foreground">{a.time ?? ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.client ?? "—"}</p>
                    {a.description && (
                      <p className="mt-0.5 text-xs italic text-muted-foreground">{a.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {wp ? (
                      <>
                        <p className="font-medium text-foreground">{wp.title}</p>
                        <p className="text-muted-foreground">
                          {project ? (
                            <>
                              <FolderKanban className="mr-1 inline size-3" />
                              {project.name}
                            </>
                          ) : (
                            <span className="italic">Arbeitspaket ohne Projekt</span>
                          )}
                        </p>
                      </>
                    ) : (
                      <span className="italic text-muted-foreground">ohne Arbeitspaket</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{a.duration.toFixed(2)} h</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                    {a.billable ? fmtEuro(a.hourlyRate) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">
                    {a.billable ? (
                      fmtEuro(amount)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-md border px-2 py-1 text-[11px] font-medium ${billingStyles[a.billingStatus]}`}
                    >
                      {billingLabel[a.billingStatus]}
                    </span>
                    {!a.billable && (
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        nicht abr.
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 no-print">
                    <div className="flex justify-end gap-1">
                      {canEdit && (
                        <>
                          <IconBtn onClick={() => onEdit(a)} title="Bearbeiten">
                            <Pencil className="size-3.5" />
                          </IconBtn>
                          <IconBtn onClick={() => onDelete(a.id)} variant="danger" title="Löschen">
                            <Trash2 className="size-3.5" />
                          </IconBtn>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Keine Tätigkeiten in dieser Ansicht.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
