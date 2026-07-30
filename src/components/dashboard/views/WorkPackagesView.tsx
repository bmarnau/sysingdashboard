/**
 * Arbeitspaket-Tab: Filterleiste und Arbeitspakettabelle.
 * Verhaltensneutral aus dashboard.tsx extrahiert (Sprint 05).
 */
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Project, WorkPackage, WorkPackageStatus } from "@/lib/dashboard-data";
import { fmtDate } from "../formatters";
import { priorityStyles, wpStatusLabel, wpStatusStyles } from "../constants";
import { Card, IconBtn, PeriodToggle, SearchInput } from "../primitives";

export function WorkPackagesView({
  workPackages,
  projects,
  spentByWP,
  periodWpIds,
  periodLabel,
  onNew,
  onEdit,
  onDelete,
}: {
  workPackages: WorkPackage[];
  projects: Project[];
  spentByWP: Map<string, number>;
  periodWpIds: Set<string>;
  periodLabel: string;
  onNew: () => void;
  onEdit: (w: WorkPackage) => void;
  onDelete: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"alle" | WorkPackageStatus>("alle");
  const [proj, setProj] = useState<string>("alle");
  const [periodOnly, setPeriodOnly] = useState(false);
  const projMap = new Map(projects.map((p) => [p.id, p]));
  const periodCount = workPackages.filter((w) => periodWpIds.has(w.id)).length;

  const filtered = workPackages.filter((w) => {
    if (periodOnly && !periodWpIds.has(w.id)) return false;
    if (status !== "alle" && w.status !== status) return false;
    if (proj !== "alle") {
      if (proj === "ohne" && w.projectId) return false;
      if (proj !== "ohne" && w.projectId !== proj) return false;
    }
    if (q) {
      const s = q.toLowerCase();
      return (
        w.title.toLowerCase().includes(s) ||
        (w.client ?? "").toLowerCase().includes(s) ||
        (w.assignee ?? "").toLowerCase().includes(s) ||
        (w.tags ?? []).some((t) => t.toLowerCase().includes(s))
      );
    }
    return true;
  });

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold">Arbeitspakete</h2>
          <p className="text-xs text-muted-foreground">
            Optional einem Projekt zuordnen – kann auch projektlos existieren
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodToggle
            active={periodOnly}
            onToggle={() => setPeriodOnly((v) => !v)}
            periodLabel={periodLabel}
            count={periodCount}
            total={workPackages.length}
          />
          <SearchInput value={q} onChange={setQ} placeholder="Arbeitspakete suchen…" />
          <select
            value={proj}
            onChange={(e) => setProj(e.target.value)}
            className="h-9 rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none focus:border-ring"
          >
            <option value="alle">Alle Projekte</option>
            <option value="ohne">Ohne Projekt</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="h-9 rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none focus:border-ring"
          >
            <option value="alle">Alle Status</option>
            {(Object.keys(wpStatusLabel) as WorkPackageStatus[]).map((s) => (
              <option key={s} value={s}>
                {wpStatusLabel[s]}
              </option>
            ))}
          </select>
          <button
            onClick={onNew}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 text-sm font-medium hover:bg-secondary"
          >
            <Plus className="size-4" /> Neu
          </button>
        </div>
      </div>
      <div className="divide-y divide-border">
        {filtered.map((w) => {
          const project = w.projectId ? projMap.get(w.projectId) : null;
          const spent = spentByWP.get(w.id) ?? 0;
          const est = w.estimated ?? 0;
          const overrun = est > 0 && spent > est;
          const pct = est > 0 ? Math.min((spent / est) * 100, 100) : 0;
          return (
            <div
              key={w.id}
              className="group grid grid-cols-12 items-center gap-3 px-4 py-4 transition hover:bg-secondary/30 sm:px-6"
            >
              <div className="col-span-12 md:col-span-5">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${priorityStyles[w.priority]}`}
                  >
                    {w.priority.toUpperCase()}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{w.id}</span>
                </div>
                <p className="mt-1.5 font-medium leading-snug">{w.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {w.client ?? "—"} ·{" "}
                  {project ? (
                    <span className="text-foreground/70">{project.name}</span>
                  ) : (
                    <span className="italic text-muted-foreground">projektlos</span>
                  )}
                </p>
                {(w.tags?.length ?? 0) > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {w.tags!.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-secondary/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-span-6 md:col-span-2">
                <span
                  className={`inline-block rounded-md border px-2 py-1 text-xs font-medium ${wpStatusStyles[w.status]}`}
                >
                  {wpStatusLabel[w.status]}
                </span>
              </div>
              <div className="col-span-6 md:col-span-3">
                <div className="flex items-baseline gap-1 font-mono text-sm">
                  <span className={overrun ? "text-destructive font-semibold" : ""}>
                    {spent.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">/ {est || "—"} h</span>
                </div>
                {est > 0 && (
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: overrun ? "var(--destructive)" : "var(--gradient-primary)",
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="col-span-10 md:col-span-1 text-right">
                <p className="font-mono text-[10px] text-muted-foreground">Fällig</p>
                <p className="text-xs font-medium">{fmtDate(w.due)}</p>
              </div>
              <div className="col-span-2 md:col-span-1 flex justify-end gap-1 no-print">
                <IconBtn onClick={() => onEdit(w)} title="Bearbeiten">
                  <Pencil className="size-3.5" />
                </IconBtn>
                <IconBtn onClick={() => onDelete(w.id)} variant="danger" title="Löschen">
                  <Trash2 className="size-3.5" />
                </IconBtn>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Keine Arbeitspakete in dieser Ansicht.
          </p>
        )}
      </div>
    </Card>
  );
}
