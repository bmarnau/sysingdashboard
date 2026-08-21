import { useMemo, useState } from "react";
import { ArrowLeft, FileText, Pencil, ShieldCheck } from "lucide-react";
import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";
import { useActivities } from "@/lib/store/useDashboardStore";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePermission } from "@/hooks/usePermission";
import { ranksOf, useReferenceData } from "@/hooks/useReferenceData";
import { useAvkkManagement } from "@/hooks/useAvkkManagement";
import { CATALOG_KEYS } from "@/lib/reference-data";
import { tasksFromLocalData } from "@/lib/avkk/workspace";
import { buildManagementSummary } from "@/lib/avkk/management";
import { selectProjectRows } from "@/lib/report/data/avkk-selectors";
import { ReportDialog } from "@/components/report/ReportDialog";
import { fmtDate, fmtEuro } from "../formatters";
import {
  billingLabel,
  priorityStyles,
  projectStatusLabel,
  projectStatusStyles,
  wpStatusLabel,
  wpStatusStyles,
} from "../constants";

const CATALOG_LIST = Object.values(CATALOG_KEYS);
const CRITICAL_SEVERITY_RANK = 3;

export function selectProjectWorkPackages(
  workPackages: readonly WorkPackage[],
  projectId: string,
): WorkPackage[] {
  return workPackages.filter((wp) => wp.projectId === projectId);
}

export function selectProjectActivities(
  activities: readonly Activity[],
  workPackages: readonly WorkPackage[],
): Activity[] {
  const wpIds = new Set(workPackages.map((wp) => wp.id));
  return activities.filter((activity) => Boolean(activity.workPackageId && wpIds.has(activity.workPackageId)));
}

export interface ProjectOperationsSummary {
  workPackages: number;
  openWorkPackages: number;
  overdueWorkPackages: number;
  activities: number;
  actualHours: number;
  billableHours: number;
  billableAmount: number;
}

export function summarizeProjectOperations(
  workPackages: readonly WorkPackage[],
  activities: readonly Activity[],
  today = new Date().toISOString().slice(0, 10),
): ProjectOperationsSummary {
  return {
    workPackages: workPackages.length,
    openWorkPackages: workPackages.filter((wp) => wp.status !== "erledigt").length,
    overdueWorkPackages: workPackages.filter(
      (wp) => wp.status !== "erledigt" && Boolean(wp.due && wp.due < today),
    ).length,
    activities: activities.length,
    actualHours: activities.reduce((sum, activity) => sum + activity.duration, 0),
    billableHours: activities
      .filter((activity) => activity.billable)
      .reduce((sum, activity) => sum + activity.duration, 0),
    billableAmount: activities
      .filter((activity) => activity.billable)
      .reduce((sum, activity) => sum + activity.duration * activity.hourlyRate, 0),
  };
}

interface ProjectDetailViewProps {
  project: Project;
  projects: readonly Project[];
  workPackages: readonly WorkPackage[];
  canEditProject: boolean;
  onBack: () => void;
  onEditProject: (project: Project) => void;
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/20 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

export function ProjectDetailView({
  project,
  projects,
  workPackages,
  canEditProject,
  onBack,
  onEditProject,
}: ProjectDetailViewProps) {
  const activities = useActivities();
  const currentUser = useCurrentUser();
  const canViewAvkk = usePermission("avkk.view");
  const [showReports, setShowReports] = useState(false);

  const projectWorkPackages = useMemo(
    () => selectProjectWorkPackages(workPackages, project.id),
    [workPackages, project.id],
  );
  const projectActivities = useMemo(
    () => selectProjectActivities(activities, projectWorkPackages),
    [activities, projectWorkPackages],
  );
  const operations = useMemo(
    () => summarizeProjectOperations(projectWorkPackages, projectActivities),
    [projectWorkPackages, projectActivities],
  );

  const tasks = useMemo(
    () => tasksFromLocalData({ projects, workPackages, activities }),
    [projects, workPackages, activities],
  );
  const catalogs = useReferenceData(CATALOG_LIST);
  const dimensionKeys = useMemo(
    () =>
      (catalogs.values[CATALOG_KEYS.competenceDimension] ?? [])
        .filter((value) => value.isActive)
        .map((value) => value.key),
    [catalogs.values],
  );
  const severityRanks = useMemo(
    () => ranksOf(catalogs.values[CATALOG_KEYS.consequenceSeverity]),
    [catalogs.values],
  );
  const avkk = useAvkkManagement({
    tasks,
    dimensionKeys,
    severityRanks,
    criticalRank: CRITICAL_SEVERITY_RANK,
    personId: currentUser?.id ?? null,
    enabled: canViewAvkk && !catalogs.loading,
  });
  const projectAvkkRows = useMemo(
    () => selectProjectRows(avkk.rows, project.id, workPackages),
    [avkk.rows, project.id, workPackages],
  );
  const avkkSummary = useMemo(() => buildManagementSummary(projectAvkkRows), [projectAvkkRows]);
  const relevantAvkkRows = useMemo(
    () => projectAvkkRows.filter((row) => row.atRisk || !row.complete),
    [projectAvkkRows],
  );

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Zurück zu Projekte
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {project.id}
                </p>
                <h2 className="mt-1 text-2xl font-semibold">{project.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{project.client}</p>
              </div>
              <span
                className={`rounded-md border px-2.5 py-1 text-xs font-medium ${projectStatusStyles[project.status]}`}
              >
                {projectStatusLabel[project.status]}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 no-print">
            {canViewAvkk && (
              <button
                type="button"
                onClick={() => setShowReports(true)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 text-sm font-medium hover:bg-secondary"
              >
                <FileText className="size-4" /> Projektbericht
              </button>
            )}
            {canEditProject && (
              <button
                type="button"
                onClick={() => onEditProject(project)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 text-sm font-medium hover:bg-secondary"
              >
                <Pencil className="size-4" /> Projekt bearbeiten
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Arbeitspakete" value={operations.workPackages} />
          <Kpi label="Offene Arbeitspakete" value={operations.openWorkPackages} />
          <Kpi label="Überfällige Arbeitspakete" value={operations.overdueWorkPackages} />
          <Kpi label="Tätigkeiten" value={operations.activities} />
          <Kpi label="Ist-Aufwand" value={`${operations.actualHours.toFixed(1)} h`} />
          <Kpi label="Abrechenbar" value={`${operations.billableHours.toFixed(1)} h`} />
          <Kpi label="Abrechenbarer Betrag" value={fmtEuro(operations.billableAmount)} />
          <Kpi label="Budget / Sollstunden" value={project.budget ? `${project.budget} h` : "—"} />
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 border-t border-border pt-5 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Projektleitung</dt>
            <dd className="mt-1 font-medium">{project.lead || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Start</dt>
            <dd className="mt-1 font-medium">{fmtDate(project.start)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Deadline</dt>
            <dd className="mt-1 font-medium">{fmtDate(project.deadline)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Team</dt>
            <dd className="mt-1 font-medium">{project.team?.join(", ") || "—"}</dd>
          </div>
          <div className="sm:col-span-2 xl:col-span-4">
            <dt className="text-xs text-muted-foreground">Beschreibung</dt>
            <dd className="mt-1 text-muted-foreground">{project.description || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h3 className="font-semibold">Arbeitspakete des Projekts</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {projectWorkPackages.length} Arbeitspakete · ausschließlich Projekt {project.id}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 sm:px-6">Arbeitspaket</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priorität</th>
                <th className="px-4 py-3">Verantwortlich</th>
                <th className="px-4 py-3">Fällig</th>
                <th className="px-4 py-3 text-right">Soll</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projectWorkPackages.map((wp) => (
                <tr key={wp.id}>
                  <td className="px-5 py-3 sm:px-6">
                    <p className="font-medium">{wp.title}</p>
                    <p className="font-mono text-xs text-muted-foreground">{wp.id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-md border px-2 py-1 text-[11px] font-medium ${wpStatusStyles[wp.status]}`}
                    >
                      {wpStatusLabel[wp.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-1.5 py-0.5 text-xs ${priorityStyles[wp.priority]}`}>
                      {wp.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">{wp.assignee || "—"}</td>
                  <td className="px-4 py-3">{fmtDate(wp.due)}</td>
                  <td className="px-4 py-3 text-right font-mono">{wp.estimated ?? "—"} h</td>
                </tr>
              ))}
              {projectWorkPackages.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    Keine Arbeitspakete für dieses Projekt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h3 className="font-semibold">Tätigkeiten des Projekts</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Zuordnung transitiv über die Arbeitspakete des Projekts
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 sm:px-6">Datum</th>
                <th className="px-4 py-3">Tätigkeit</th>
                <th className="px-4 py-3">Arbeitspaket</th>
                <th className="px-4 py-3 text-right">Dauer</th>
                <th className="px-4 py-3 text-right">Betrag</th>
                <th className="px-4 py-3">Abrechnung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projectActivities.map((activity) => {
                const wp = projectWorkPackages.find((item) => item.id === activity.workPackageId);
                const amount = activity.billable ? activity.duration * activity.hourlyRate : 0;
                return (
                  <tr key={activity.id}>
                    <td className="px-5 py-3 sm:px-6">{fmtDate(activity.date)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{activity.title}</p>
                      {activity.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{activity.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">{wp?.title ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{activity.duration.toFixed(2)} h</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {activity.billable ? fmtEuro(amount) : "—"}
                    </td>
                    <td className="px-4 py-3">{billingLabel[activity.billingStatus]}</td>
                  </tr>
                );
              })}
              {projectActivities.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    Keine Tätigkeiten für dieses Projekt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4" />
          <h3 className="font-semibold">AVKK im Projektkontext</h3>
        </div>
        {!canViewAvkk ? (
          <p className="mt-3 text-sm text-muted-foreground">Keine AVKK-Leseberechtigung.</p>
        ) : catalogs.loading || avkk.loading ? (
          <p className="mt-3 text-sm text-muted-foreground">AVKK-Projektdaten werden geladen…</p>
        ) : catalogs.error || avkk.error ? (
          <p className="mt-3 text-sm text-destructive">
            {catalogs.error ?? avkk.error ?? "AVKK-Daten nicht verfügbar."}
          </p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <Kpi label="Sachverhalte" value={avkkSummary.total} />
              <Kpi label="Mit AVKK-Stand" value={avkkSummary.withDossier} />
              <Kpi label="Gefährdet" value={avkkSummary.atRisk} />
              <Kpi label="Überfällig" value={avkkSummary.overdue} />
              <Kpi label="Kompetenzlücken" value={avkkSummary.competenceGap} />
              <Kpi label="Unvollständig" value={avkkSummary.incomplete} />
            </div>
            <div className="mt-4 divide-y divide-border rounded-lg border border-border">
              {relevantAvkkRows.map((row) => (
                <div key={row.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-medium">{row.task.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.task.subjectType} · {row.task.subjectId}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className={row.atRisk ? "font-medium text-destructive" : "text-muted-foreground"}>
                      {row.atRisk ? "Gefährdet" : row.complete ? "Vollständig" : "Unvollständig"}
                    </p>
                    <p className="mt-0.5 text-muted-foreground">
                      Kompetenz fehlt/teilweise: {row.missing}/{row.partial}
                    </p>
                  </div>
                </div>
              ))}
              {relevantAvkkRows.length === 0 && (
                <p className="px-4 py-5 text-sm text-muted-foreground">
                  Keine gefährdeten oder unvollständigen AVKK-Sachverhalte im Projekt.
                </p>
              )}
            </div>
          </>
        )}
      </section>

      <ReportDialog
        open={showReports}
        onOpenChange={setShowReports}
        tasks={tasks}
        projects={projects}
        workPackages={workPackages}
        initialReportId="avkk-project"
        initialProjectId={project.id}
      />
    </div>
  );
}
