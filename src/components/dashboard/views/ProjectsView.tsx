/**
 * Projekt-Tab: Filterleiste und Projekttabelle.
 * Verhaltensneutral aus dashboard.tsx extrahiert (Sprint 05).
 */
import { useState } from "react";
import { FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import type { Project, ProjectStatus, WorkPackage } from "@/lib/dashboard-data";
import { fmtDate } from "../formatters";
import { projectStatusLabel, projectStatusStyles } from "../constants";
import { Card, IconBtn, PeriodToggle, SearchInput } from "../primitives";
import { ProjectDetailView } from "./ProjectDetailView";

export function ProjectsView({
  projects,
  workPackages,
  spentByProject,
  periodProjectIds,
  periodLabel,
  onNew,
  onEdit,
  onDelete,
  canEdit,
}: {
  projects: Project[];
  workPackages: WorkPackage[];
  spentByProject: Map<string, number>;
  periodProjectIds: Set<string>;
  periodLabel: string;
  onNew: () => void;
  onEdit: (p: Project) => void;
  onDelete: (id: string) => void;
  /** RBAC: Schreibaktionen werden nur bei `project.edit` angeboten. */
  canEdit: boolean;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"alle" | ProjectStatus>("alle");
  const [periodOnly, setPeriodOnly] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const selectedProject = selectedProjectId
    ? projects.find((project) => project.id === selectedProjectId) ?? null
    : null;

  if (selectedProject) {
    return (
      <ProjectDetailView
        project={selectedProject}
        projects={projects}
        workPackages={workPackages}
        canEditProject={canEdit}
        onBack={() => setSelectedProjectId(null)}
        onEditProject={onEdit}
      />
    );
  }

  const periodCount = projects.filter((p) => periodProjectIds.has(p.id)).length;
  const filtered = projects.filter((p) => {
    if (periodOnly && !periodProjectIds.has(p.id)) return false;
    if (status !== "alle" && p.status !== status) return false;
    if (q) {
      const s = q.toLowerCase();
      return (
        p.name.toLowerCase().includes(s) ||
        p.client.toLowerCase().includes(s) ||
        (p.lead ?? "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold">Projekte</h2>
          <p className="text-xs text-muted-foreground">Übergeordnete Klammer für Arbeitspakete</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodToggle
            active={periodOnly}
            onToggle={() => setPeriodOnly((v) => !v)}
            periodLabel={periodLabel}
            count={periodCount}
            total={projects.length}
          />
          <SearchInput value={q} onChange={setQ} placeholder="Projekte suchen…" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="h-9 rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none focus:border-ring"
          >
            <option value="alle">Alle Status</option>
            {(["on_track", "at_risk", "delayed", "abgeschlossen"] as ProjectStatus[]).map((s) => (
              <option key={s} value={s}>
                {projectStatusLabel[s]}
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
      <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => {
          const spent = spentByProject.get(p.id) ?? 0;
          const budget = p.budget ?? 0;
          const usage = budget > 0 ? (spent / budget) * 100 : 0;
          const overBudget = budget > 0 && spent > budget;
          const wpCount = workPackages.filter((w) => w.projectId === p.id).length;
          return (
            <div key={p.id} className="group bg-card p-5 transition hover:bg-secondary/20">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {p.id}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedProjectId(p.id)}
                    className="mt-1 block max-w-full truncate text-left font-semibold leading-tight hover:text-primary hover:underline"
                    title={`${p.name} öffnen`}
                  >
                    {p.name}
                  </button>
                  <p className="mt-1 text-xs text-muted-foreground">{p.client}</p>
                </div>
                <span
                  className={`rounded-md border px-2 py-1 text-[11px] font-medium ${projectStatusStyles[p.status]}`}
                >
                  {projectStatusLabel[p.status]}
                </span>
              </div>

              {p.description && (
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
              )}

              <div className="mt-4">
                <div className="mb-1.5 flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">Aufwand (aus Tätigkeiten)</span>
                  <span
                    className={`font-mono ${overBudget ? "text-destructive font-semibold" : ""}`}
                  >
                    {spent.toFixed(1)} {budget ? `/ ${budget}` : ""} h
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(usage, 100)}%`,
                      background: overBudget
                        ? "var(--destructive)"
                        : usage > 85
                          ? "var(--warning)"
                          : "var(--gradient-primary)",
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span>{wpCount} Arbeitspakete</span>
                <span>Deadline {fmtDate(p.deadline)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {(p.team ?? []).map((m) => (
                    <div
                      key={m}
                      className="grid size-7 place-items-center rounded-full border-2 border-card bg-secondary font-mono text-[10px] font-bold"
                    >
                      {m}
                    </div>
                  ))}
                </div>
                <div className="flex gap-1 no-print">
                  <IconBtn onClick={() => setSelectedProjectId(p.id)} title="Projekt öffnen">
                    <FolderOpen className="size-3.5" />
                  </IconBtn>
                  {canEdit && (
                    <>
                      <IconBtn onClick={() => onEdit(p)} title="Bearbeiten">
                        <Pencil className="size-3.5" />
                      </IconBtn>
                      <IconBtn onClick={() => onDelete(p.id)} variant="danger" title="Löschen">
                        <Trash2 className="size-3.5" />
                      </IconBtn>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full bg-card px-6 py-10 text-center text-sm text-muted-foreground">
            Keine Projekte gefunden.
          </p>
        )}
      </div>
    </Card>
  );
}
