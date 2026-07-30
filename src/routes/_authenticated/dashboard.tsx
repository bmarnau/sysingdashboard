import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Activity as ActivityIcon,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Euro,
  Eye,
  EyeOff,
  FileJson,
  FolderKanban,
  Gauge,
  HardDrive,
  HelpCircle,
  Layers,
  Plus,
  Printer,
  ScrollText,
  Search,
  Server,
  Settings,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  dashboardData,
  type Activity,
  type Engineer,
  type Project,
  type WorkPackage,
} from "@/lib/dashboard-data";
// Schwere Dashboard-Dialoge werden lazy geladen, damit `jspdf`, `jspdf-autotable`,
// `recharts` und ~5.000 LOC Dialog-Code den Initial-Chunk verlassen. Jeder Dialog
// hat einen eigenen Suspense-Wrapper — ein langsam ladender Chunk blockiert keinen
// anderen. Rendering ist gegen den jeweiligen `open`-State gegated, damit der
// Chunk erst beim ersten Öffnen geladen wird (nicht beim Dashboard-Mount).
const ExportDialog = lazy(() =>
  import("@/components/ExportDialog").then((m) => ({ default: m.ExportDialog })),
);
const LocalArchiveDialog = lazy(() =>
  import("@/components/SaveTargetDialog").then((m) => ({ default: m.LocalArchiveDialog })),
);
const PerformanceReport = lazy(() =>
  import("@/components/PerformanceReport").then((m) => ({ default: m.PerformanceReport })),
);
const WorkingTimeModelsDialog = lazy(() =>
  import("@/components/WorkingTimeModelsDialog").then((m) => ({
    default: m.WorkingTimeModelsDialog,
  })),
);
const UserManagementDialog = lazy(() =>
  import("@/components/UserManagementDialog").then((m) => ({ default: m.UserManagementDialog })),
);
const UserManualDialog = lazy(() =>
  import("@/components/UserManualDialog").then((m) => ({ default: m.UserManualDialog })),
);
const BackupDialog = lazy(() =>
  import("@/components/BackupDialog").then((m) => ({ default: m.BackupDialog })),
);
const SystemStatusDialog = lazy(() =>
  import("@/components/SystemStatusDialog").then((m) => ({ default: m.SystemStatusDialog })),
);
const TechnicalReportDialog = lazy(() =>
  import("@/components/TechnicalReportDialog").then((m) => ({ default: m.TechnicalReportDialog })),
);
const DownloadCenterDialog = lazy(() =>
  import("@/components/DownloadCenterDialog").then((m) => ({ default: m.DownloadCenterDialog })),
);
const ImportExportDialog = lazy(() =>
  import("@/components/ImportExportDialog").then((m) => ({ default: m.ImportExportDialog })),
);
const AzureDataDialog = lazy(() =>
  import("@/components/azure/AzureDataDialog").then((m) => ({ default: m.AzureDataDialog })),
);
const LogViewerDialog = lazy(() =>
  import("@/components/LogViewerDialog").then((m) => ({ default: m.LogViewerDialog })),
);
import { HelpDocumentationService } from "@/lib/help-documentation";
import { BackupService } from "@/lib/backup-service";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { UserManagementService, ROLE_LABEL, initialsOf } from "@/lib/user-management";
import { can } from "@/lib/rbac/permissions";
import {
  TimePeriodService,
  getISOWeek,
  type DashboardViewMode,
  type ChartBucket,
} from "@/lib/time-period";
import {
  EngineerTargetTimeService,
  type EngineerTargetTimeModel,
} from "@/lib/engineer-target-time";
import { dashboardStore } from "@/lib/store/dashboard-store";
import {
  useActivities,
  useEngineer,
  useProjects,
  useWorkPackages,
} from "@/lib/store/useDashboardStore";
import { initDashboardPersistence } from "@/lib/store/dashboard-persistence";
// Sprint 05: Präsentation, Fachlogik und Konstanten liegen in src/components/dashboard/.
import { type Tab } from "@/components/dashboard/constants";
import { fmtDate, fmtEuro } from "@/components/dashboard/formatters";
import {
  perfReportKey,
  periodKey,
  storageKey,
  viewmodeKey,
} from "@/components/dashboard/keys";
import {
  emptyActivity,
  emptyProject,
  emptyWP,
  normalizeActivity,
  normalizeWorkPackage,
  validateActivity,
} from "@/components/dashboard/domain";
import { KpiCard, TabButton } from "@/components/dashboard/primitives";
import { ProjectsView } from "@/components/dashboard/views/ProjectsView";
import { WorkPackagesView } from "@/components/dashboard/views/WorkPackagesView";
import { ActivitiesView } from "@/components/dashboard/views/ActivitiesView";
import { BillingView } from "@/components/dashboard/views/BillingView";
import { ProjectDialog } from "@/components/dashboard/dialogs/ProjectDialog";
import { WorkPackageDialog } from "@/components/dashboard/dialogs/WorkPackageDialog";
import { ActivityDialog } from "@/components/dashboard/dialogs/ActivityDialog";
import { EngineerDialog } from "@/components/dashboard/dialogs/EngineerDialog";



export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: `Engineer Console – ${dashboardData.engineer.company}` },
      {
        name: "description",
        content:
          "Senior Systems Engineer Dashboard: Projekte, Arbeitspakete und Tätigkeiten verwalten und abrechnen.",
      },
    ],
  }),
  component: Dashboard,
});


/* ---------------------------------- Component --------------------------------- */


function Dashboard() {
  // Domain-State kommt aus dem zentralen dashboardStore (useSyncExternalStore).
  // UI-State (Dialoge, Suche, Menüs) bleibt bewusst lokal.
  const projects = useProjects();
  const workPackages = useWorkPackages();
  const activities = useActivities();
  const engineerState = useEngineer();

  // Wrapper mit der gewohnten setState-Signatur (Wert oder Updater-Fn).
  // Ziel: alle bestehenden Call-Sites bleiben unverändert.
  type Updater<T> = T | ((prev: T) => T);
  const applyUpdater = <T,>(u: Updater<T>, prev: T): T =>
    typeof u === "function" ? (u as (p: T) => T)(prev) : u;
  const setProjects = (u: Updater<Project[]>) =>
    dashboardStore.setProjects(applyUpdater(u, dashboardStore.getState().projects));
  const setWorkPackages = (u: Updater<WorkPackage[]>) =>
    dashboardStore.setWorkPackages(applyUpdater(u, dashboardStore.getState().workPackages));
  const setActivities = (u: Updater<Activity[]>) =>
    dashboardStore.setActivities(applyUpdater(u, dashboardStore.getState().activities));
  const setEngineer = (u: Updater<Engineer>) =>
    dashboardStore.setEngineer(applyUpdater(u, dashboardStore.getState().engineer));

  const [hydrated, setHydrated] = useState(false);

  const [tab, setTab] = useState<Tab>("projekte");
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showServiceMenu, setShowServiceMenu] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  // Dialog state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingWP, setEditingWP] = useState<WorkPackage | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showEngineer, setShowEngineer] = useState(false);
  const [showWorkingTimeDialog, setShowWorkingTimeDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualTopicId, setManualTopicId] = useState<string | undefined>(undefined);
  const [manualQuery, setManualQuery] = useState<string | undefined>(undefined);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const openManualTopic = (topicId?: string, q?: string) => {
    setManualTopicId(topicId);
    setManualQuery(q);
    setShowHelpMenu(false);
    setShowManual(true);
  };
  const HELP_QUICKLINKS: { id: string; label: string }[] = [
    { id: "local-operation", label: "Lokaler Betrieb ohne Azure" },
    { id: "azure-service-area", label: "Azure Servicebereich" },
    { id: "azure-database-build", label: "Azure Datenbank aufbauen" },
    { id: "azure-connection-test", label: "Azure Verbindung testen" },
    { id: "azure-export", label: "Nach Azure exportieren" },
    { id: "azure-import", label: "Aus Azure importieren" },
    { id: "azure-conflict-handling", label: "Konflikthandling" },
    { id: "backup-before-import", label: "Backup vor Import" },
    { id: "rbac-rollen-berechtigungen", label: "Rollen & Berechtigungen" },
    { id: "system-status", label: "Systemstatus" },
    { id: "env-validation", label: "ENV-Validierung" },
    { id: "security-principles", label: "Sicherheitsprinzipien" },
    { id: "azure-outage", label: "Was bei Azure-Ausfall passiert" },
    { id: "test-instance", label: "Testinstanz und Qualitätssicherung" },
    { id: "tech-debt", label: "Technical-Debt-Analyse" },
    { id: "api-endpoint-tests", label: "API- und Endpoint-Tests" },
  ];
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showSystemStatus, setShowSystemStatus] = useState(false);
  const [showTechnicalReport, setShowTechnicalReport] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showAzureData, setShowAzureData] = useState(false);
  const [showLogViewer, setShowLogViewer] = useState(false);
  const currentUser = useCurrentUser();
  const [targetTimeModels, setTargetTimeModels] = useState<EngineerTargetTimeModel[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [now, setNow] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<DashboardViewMode>("month");
  /** Offset relativ zur aktuellen Periode (0 = aktuell, -1 = vorherige, +1 = nächste). */
  const [periodOffset, setPeriodOffset] = useState(0);
  const [isSwitching, startSwitch] = useTransition();
  const [showPerfReport, setShowPerfReport] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const v = window.localStorage.getItem(perfReportKey());
      return v !== "false";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    UserManagementService.bootstrap();
    // Store einmalig hydratisieren (liest user-scoped Blob, storage-Event, User-Wechsel).
    initDashboardPersistence();
    // Nach Hydration: Referenzielle Integrität sicherstellen und normalisiert zurückschreiben.
    const s = dashboardStore.getState();
    const projectIds = new Set<string>(s.projects.map((x) => x.id));
    const normWPs = s.workPackages.map((w) => normalizeWorkPackage(w, projectIds));
    const wpIds = new Set<string>(normWPs.map((w) => w.id));
    const normActs = s.activities.map((a) => normalizeActivity(a, wpIds));
    dashboardStore.replaceAll({
      engineer: s.engineer,
      projects: s.projects,
      workPackages: normWPs,
      activities: normActs,
    });
    setNow(new Date());
    try {
      const stored = window.localStorage.getItem(viewmodeKey());
      if (stored === "week" || stored === "month") setViewMode(stored);
      const offRaw = window.localStorage.getItem(periodKey());
      if (offRaw) {
        const off = Number(offRaw);
        if (Number.isFinite(off)) setPeriodOffset(off);
      }
      const prRaw = window.localStorage.getItem(perfReportKey());
      if (prRaw === "false") setShowPerfReport(false);
    } catch {
      /* ignore */
    }
    setTargetTimeModels(EngineerTargetTimeService.loadTargetTimeModels());
    setHydrated(true);
    // Tägliches automatisches Backup anstoßen (max. 1x pro Kalendertag).
    BackupService.scheduleDaily();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(viewmodeKey(), viewMode);
      window.localStorage.setItem(periodKey(), String(periodOffset));
      window.localStorage.setItem(perfReportKey(), String(showPerfReport));
    } catch {
      /* ignore */
    }
  }, [hydrated, viewMode, periodOffset, showPerfReport]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // (Domain-Persistenz übernimmt initDashboardPersistence() — debounced, kein Full-Blob-Write pro Keystroke mehr.)

  useEffect(() => {
    if (!hydrated) return;
    EngineerTargetTimeService.saveTargetTimeModels(targetTimeModels);
  }, [hydrated, targetTimeModels]);

  const resetData = () => {
    if (!confirm("Lokale Daten zurücksetzen?")) return;
    window.localStorage.removeItem(storageKey());
    dashboardStore.reset();
  };

  const exportData = () => {
    const payload = {
      projects,
      workPackages,
      activities,
      engineer: engineerState,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `engineer-dashboard-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowServiceMenu(false);
  };

  /* ---------- Derived ---------- */

  /** Tages-Sollzeit-Quelle: bevorzugt aktive Arbeitszeitmodelle, sonst Legacy-Profil. */
  const targetSource = useMemo(
    () => EngineerTargetTimeService.buildDailyTargetFnFromEngineer(engineerState, targetTimeModels),
    [engineerState.monthlyTargetHours, engineerState.workloadPercent, targetTimeModels],
  );

  /** Aktuell betrachteter Referenzzeitpunkt (heute + Offset im aktuellen Modus). */
  const periodRef = useMemo(() => {
    if (!now) return null;
    const d = new Date(now);
    if (viewMode === "month") d.setMonth(d.getMonth() + periodOffset);
    else d.setDate(d.getDate() + periodOffset * 7);
    return d;
  }, [now, viewMode, periodOffset]);

  const metrics = useMemo(() => {
    if (!periodRef) return null;
    return TimePeriodService.computePeriodMetrics(activities, viewMode, periodRef, targetSource);
  }, [activities, periodRef, viewMode, targetSource]);

  const chartBuckets = useMemo<ChartBucket[]>(() => {
    if (!periodRef) return [];
    return TimePeriodService.buildChartBuckets(activities, viewMode, periodRef);
  }, [activities, periodRef, viewMode]);

  const chartMax = Math.max(10, ...chartBuckets.map((b) => b.hours));
  const periodActual = metrics?.actual ?? 0;
  const periodBillable = metrics?.billable ?? 0;
  const periodTarget = metrics?.target ?? 0;
  const periodDiff = metrics?.diff ?? 0;
  const periodUtilization = metrics?.utilization ?? 0;

  /** Tätigkeiten im aktuellen Periodenfenster. */
  const periodActivities = useMemo(() => {
    if (!metrics) return activities;
    return activities.filter((a) => {
      if (!a.date) return false;
      const d = new Date(a.date);
      if (Number.isNaN(d.getTime())) return false;
      return d >= metrics.range.start && d < metrics.range.end;
    });
  }, [activities, metrics]);

  /** WP- und Projekt-IDs mit mindestens einer Tätigkeit in der aktuellen Periode. */
  const activeInPeriod = useMemo(() => {
    const wpIds = new Set<string>();
    const projectIds = new Set<string>();
    const wpToProj = new Map(workPackages.map((wp) => [wp.id, wp.projectId ?? null] as const));
    for (const a of periodActivities) {
      if (!a.workPackageId) continue;
      wpIds.add(a.workPackageId);
      const pid = wpToProj.get(a.workPackageId);
      if (pid) projectIds.add(pid);
    }
    return { wpIds, projectIds };
  }, [periodActivities, workPackages]);

  // Aufwand je Arbeitspaket aus Tätigkeiten
  const spentByWP = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of activities) {
      if (!a.workPackageId) continue;
      m.set(a.workPackageId, (m.get(a.workPackageId) ?? 0) + (a.duration || 0));
    }
    return m;
  }, [activities]);

  // Aufwand je Projekt = Summe der Tätigkeiten der zugeordneten Arbeitspakete
  const spentByProject = useMemo(() => {
    const m = new Map<string, number>();
    const wpToProj = new Map(workPackages.map((wp) => [wp.id, wp.projectId ?? null] as const));
    for (const a of activities) {
      if (!a.workPackageId) continue;
      const pid = wpToProj.get(a.workPackageId);
      if (!pid) continue;
      m.set(pid, (m.get(pid) ?? 0) + (a.duration || 0));
    }
    return m;
  }, [activities, workPackages]);

  const totalRevenue = useMemo(
    () =>
      activities
        .filter((a) => a.billable === true && a.billingStatus !== "nicht_abrechenbar")
        .reduce((s, a) => s + (Number(a.duration) || 0) * (Number(a.hourlyRate) || 0), 0),
    [activities],
  );
  const openRevenue = useMemo(
    () =>
      activities
        .filter((a) => a.billable === true && a.billingStatus === "offen")
        .reduce((s, a) => s + (Number(a.duration) || 0) * (Number(a.hourlyRate) || 0), 0),
    [activities],
  );

  const openWPs = workPackages.filter((w) => w.status !== "erledigt").length;
  const activeProjects = projects.filter((p) => p.status !== "abgeschlossen").length;

  /* ---------- CRUD ---------- */

  const saveProject = (p: Project) => {
    setProjects((arr) =>
      arr.some((x) => x.id === p.id) ? arr.map((x) => (x.id === p.id ? p : x)) : [p, ...arr],
    );
  };
  const deleteProject = (id: string) => {
    if (!confirm("Projekt wirklich löschen? Arbeitspakete bleiben projektlos erhalten.")) return;
    setProjects((arr) => arr.filter((x) => x.id !== id));
    setWorkPackages((arr) => arr.map((w) => (w.projectId === id ? { ...w, projectId: null } : w)));
  };

  const saveWP = (w: WorkPackage) => {
    const projectIds = new Set(projects.map((x) => x.id));
    const normalized = normalizeWorkPackage(w, projectIds);
    setWorkPackages((arr) =>
      arr.some((x) => x.id === normalized.id)
        ? arr.map((x) => (x.id === normalized.id ? normalized : x))
        : [normalized, ...arr],
    );
  };
  const deleteWP = (id: string) => {
    if (!confirm("Arbeitspaket löschen? Tätigkeiten bleiben ohne Arbeitspaket erhalten.")) return;
    setWorkPackages((arr) => arr.filter((x) => x.id !== id));
    setActivities((arr) =>
      arr.map((a) => (a.workPackageId === id ? { ...a, workPackageId: null } : a)),
    );
  };

  const saveActivity = (a: Activity) => {
    const errs = validateActivity(a);
    if (Object.keys(errs).length > 0) {
      // Defensive: UI verhindert den Aufruf bereits, aber kein inkonsistenter State darf entstehen.
      return;
    }
    const wpIds = new Set(workPackages.map((w) => w.id));
    const normalized = normalizeActivity(a, wpIds);
    setActivities((arr) =>
      arr.some((x) => x.id === normalized.id)
        ? arr.map((x) => (x.id === normalized.id ? normalized : x))
        : [normalized, ...arr],
    );
  };

  const deleteActivity = (id: string) => {
    if (!confirm("Tätigkeit löschen?")) return;
    setActivities((arr) => arr.filter((x) => x.id !== id));
  };

  /* ---------- Render ---------- */

  const dateLine = (() => {
    if (!now || !metrics) return "…";
    const rStart = metrics.range.start.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const rEnd = new Date(metrics.range.end.getTime() - 86400000).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const today = now.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const suffix = periodOffset === 0 ? ` · ${today}` : "";
    let kwInfo = "";
    if (viewMode === "month") {
      const kwStart = getISOWeek(metrics.range.start);
      const kwEnd = getISOWeek(new Date(metrics.range.end.getTime() - 86400000));
      kwInfo = kwStart === kwEnd ? ` · KW ${kwStart}` : ` · KW ${kwStart}–${kwEnd}`;
    }
    return `${metrics.range.label} · ${rStart} – ${rEnd}${kwInfo}${suffix}`;
  })();

  const switchView = (next: DashboardViewMode) =>
    startSwitch(() => {
      setViewMode(next);
      setPeriodOffset(0);
    });
  const shiftPeriod = (delta: number) => startSwitch(() => setPeriodOffset((p) => p + delta));
  const resetPeriod = () => startSwitch(() => setPeriodOffset(0));

  return (
    <div className="min-h-screen bg-background text-foreground" suppressHydrationWarning>
      <header className="app-header sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl no-print">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div
              className="grid size-9 place-items-center rounded-lg"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Server className="size-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {engineerState.company}
              </p>
              <p className="text-sm font-semibold">Engineer Console</p>
            </div>
          </div>

          {/* Global Search */}
          <div ref={searchRef} className="relative hidden flex-1 max-w-lg md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQ}
                onChange={(e) => {
                  setSearchQ(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Kunde, Tätigkeit, Arbeitspaket, Projekt…"
                aria-label="Globale Suche"
                type="search"
                suppressHydrationWarning
                className="h-10 w-full rounded-lg border border-input bg-secondary/40 pl-9 pr-8 text-sm outline-none transition focus:border-ring"
              />
              {searchQ && (
                <button
                  type="button"
                  aria-label="Suche zurücksetzen"
                  onClick={() => {
                    setSearchQ("");
                    setSearchOpen(false);
                  }}
                  className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  ×
                </button>
              )}
            </div>
            {searchOpen && searchQ.trim() && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-hidden overflow-y-auto rounded-xl border border-border bg-background shadow-[var(--shadow-elevated)]">
                {(() => {
                  const q = searchQ.toLowerCase().trim();
                  const pRes = projects
                    .filter(
                      (p) =>
                        p.name.toLowerCase().includes(q) ||
                        p.client.toLowerCase().includes(q) ||
                        (p.description ?? "").toLowerCase().includes(q),
                    )
                    .slice(0, 4);
                  const wpRes = workPackages
                    .filter(
                      (w) =>
                        w.title.toLowerCase().includes(q) ||
                        (w.client ?? "").toLowerCase().includes(q) ||
                        (w.tags ?? []).some((t) => t.toLowerCase().includes(q)),
                    )
                    .slice(0, 4);
                  const aRes = activities
                    .filter(
                      (a) =>
                        a.title.toLowerCase().includes(q) ||
                        (a.client ?? "").toLowerCase().includes(q) ||
                        (a.description ?? "").toLowerCase().includes(q),
                    )
                    .slice(0, 4);
                  const hRes = HelpDocumentationService.searchTopics(
                    q,
                    currentUser?.role ?? null,
                  ).slice(0, 4);
                  const hasAny = pRes.length + wpRes.length + aRes.length + hRes.length > 0;
                  if (!hasAny)
                    return (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        Keine Ergebnisse.
                      </div>
                    );
                  return (
                    <>
                      {pRes.length > 0 && (
                        <div className="px-3 py-2">
                          <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Projekte
                          </p>
                          {pRes.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setSearchQ("");
                                setSearchOpen(false);
                                setTab("projekte");
                                setEditingProject(p);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-secondary/60"
                            >
                              <FolderKanban className="size-4 text-primary opacity-70" />
                              <div className="min-w-0">
                                <p className="truncate font-medium">{p.name}</p>
                                <p className="text-xs text-muted-foreground">{p.client}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {wpRes.length > 0 && (
                        <div className="border-t border-border px-3 py-2">
                          <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Arbeitspakete
                          </p>
                          {wpRes.map((w) => {
                            const proj = w.projectId
                              ? projects.find((p) => p.id === w.projectId)
                              : null;
                            return (
                              <button
                                key={w.id}
                                onClick={() => {
                                  setSearchQ("");
                                  setSearchOpen(false);
                                  setTab("arbeitspakete");
                                  setEditingWP(w);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-secondary/60"
                              >
                                <Layers className="size-4 text-info opacity-70" />
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{w.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {proj ? proj.name : "projektlos"} · {w.client ?? "—"}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {aRes.length > 0 && (
                        <div className="border-t border-border px-3 py-2">
                          <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Tätigkeiten
                          </p>
                          {aRes.map((a) => (
                            <button
                              key={a.id}
                              onClick={() => {
                                setSearchQ("");
                                setSearchOpen(false);
                                setTab("taetigkeiten");
                                setEditingActivity(a);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-secondary/60"
                            >
                              <Clock className="size-4 text-success opacity-70" />
                              <div className="min-w-0">
                                <p className="truncate font-medium">{a.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {fmtDate(a.date)} · {a.client ?? "—"}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {hRes.length > 0 && (
                        <div className="border-t border-border px-3 py-2">
                          <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Handbuch
                          </p>
                          {hRes.map((h) => (
                            <button
                              key={h.id}
                              onClick={() => {
                                const qNow = searchQ;
                                setSearchQ("");
                                setSearchOpen(false);
                                openManualTopic(h.id, qNow);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-secondary/60"
                            >
                              <BookOpen className="size-4 text-primary opacity-70" />
                              <div className="min-w-0">
                                <p className="truncate font-medium">{h.title}</p>
                                <p className="text-xs text-muted-foreground">{h.category}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowHelpMenu((v) => !v)}
                title="Hilfe zu dieser Seite"
                aria-label="Hilfe zu dieser Seite"
                aria-expanded={showHelpMenu}
                suppressHydrationWarning
                className="relative grid size-10 place-items-center rounded-lg border border-border bg-secondary/40 transition hover:bg-secondary"
              >
                <HelpCircle className="size-4" aria-hidden="true" />
              </button>
              {showHelpMenu && (
                <>
                  <button
                    aria-label="Hilfe-Menü schließen"
                    className="fixed inset-0 z-30 cursor-default"
                    onClick={() => setShowHelpMenu(false)}
                  />
                  <div className="absolute right-0 z-40 mt-2 max-h-[70vh] w-72 overflow-y-auto rounded-lg border border-border bg-background shadow-[var(--shadow-elevated)]">
                    <button
                      onClick={() => openManualTopic(undefined)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium hover:bg-secondary/60"
                    >
                      Handbuch öffnen
                    </button>
                    <div className="border-t border-border px-4 pb-1 pt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                      Kapitel direkt öffnen
                    </div>
                    {HELP_QUICKLINKS.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => openManualTopic(q.id)}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-secondary/60"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowServiceMenu((v) => !v)}
                aria-label="Einstellungen und Services"
                aria-expanded={showServiceMenu}
                title="Einstellungen"
                suppressHydrationWarning
                className="relative grid size-10 place-items-center rounded-lg border border-border bg-secondary/40 transition hover:bg-secondary"
              >
                <Settings className="size-4" aria-hidden="true" />
              </button>
              {showServiceMenu && (
                <>
                  <button
                    aria-label="Menü schließen"
                    className="fixed inset-0 z-30 cursor-default"
                    onClick={() => setShowServiceMenu(false)}
                  />
                  <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-background shadow-[var(--shadow-elevated)]">
                    <button
                      onClick={() => {
                        setShowServiceMenu(false);
                        setShowExportDialog(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
                    >
                      <Download className="size-4 opacity-70" /> Export…
                    </button>
                    <button
                      onClick={() => {
                        setShowServiceMenu(false);
                        setShowPerfReport((v) => !v);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
                    >
                      {showPerfReport ? (
                        <>
                          <EyeOff className="size-4 opacity-70" /> Leistungsreport ausblenden
                        </>
                      ) : (
                        <>
                          <Eye className="size-4 opacity-70" /> Leistungsreport anzeigen
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowServiceMenu(false);
                        setShowUserDialog(true);
                      }}
                      className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
                    >
                      <Server className="size-4 opacity-70" /> Benutzer & Profile…
                    </button>
                    <button
                      onClick={() => {
                        setShowServiceMenu(false);
                        setShowEngineer(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
                    >
                      <Server className="size-4 opacity-70" /> Engineer-Stammdaten…
                    </button>
                    <button
                      onClick={() => {
                        setShowServiceMenu(false);
                        setShowWorkingTimeDialog(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
                    >
                      <Clock className="size-4 opacity-70" /> Arbeitszeitmodell…
                    </button>
                    <button
                      onClick={() => {
                        setShowServiceMenu(false);
                        setShowDownloads(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
                    >
                      <Download className="size-4 opacity-70" /> Downloads…
                    </button>
                    {can(currentUser, "backup.restore") && (
                      <button
                        onClick={() => {
                          setShowServiceMenu(false);
                          setShowBackupDialog(true);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
                      >
                        <HardDrive className="size-4 opacity-70" /> Backup…
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowServiceMenu(false);
                        setShowLogViewer(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
                    >
                      <ScrollText className="size-4 opacity-70" /> Log Viewer…
                    </button>
                    {can(currentUser, "azure.export") && (
                      <button
                        onClick={() => {
                          setShowServiceMenu(false);
                          setShowImportExport(true);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
                      >
                        <FileJson className="size-4 opacity-70" /> Import / Export…
                      </button>
                    )}
                    {can(currentUser, "systemstatus.view") && (
                      <button
                        onClick={() => {
                          setShowServiceMenu(false);
                          setShowAzureData(true);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
                      >
                        <HardDrive className="size-4 opacity-70" /> Azure Daten…
                      </button>
                    )}
                    {can(currentUser, "systemstatus.view") && (
                      <button
                        onClick={() => {
                          setShowServiceMenu(false);
                          setShowSystemStatus(true);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
                      >
                        <Gauge className="size-4 opacity-70" /> Systemstatus…
                      </button>
                    )}
                    {can(currentUser, "systemstatus.view") && (
                      <button
                        onClick={() => {
                          setShowServiceMenu(false);
                          setShowTechnicalReport(true);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
                      >
                        <ScrollText className="size-4 opacity-70" /> Technischer Prüfbericht…
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowServiceMenu(false);
                        window.print();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
                    >
                      <Printer className="size-4 opacity-70" /> PDF Drucken
                    </button>
                    <button
                      onClick={() => {
                        setShowServiceMenu(false);
                        setShowManual(true);
                      }}
                      className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
                    >
                      <BookOpen className="size-4 opacity-70" /> Handbuch…
                    </button>
                    <button
                      onClick={() => {
                        setShowServiceMenu(false);
                        resetData();
                      }}
                      className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4 opacity-70" /> Reset
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowUserDialog(true)}
              title="Benutzer & Profile"
              aria-label="Benutzer & Profile öffnen"
              suppressHydrationWarning
              className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 py-1.5 pl-1.5 pr-3 transition hover:bg-secondary"
            >
              {currentUser?.profileImage ? (
                <img
                  src={currentUser.profileImage}
                  alt=""
                  className="size-8 rounded-md object-cover"
                />
              ) : (
                <div
                  className="grid size-8 place-items-center rounded-md font-mono text-sm font-bold text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {currentUser ? initialsOf(currentUser) : engineerState.initials}
                </div>
              )}
              <div className="hidden text-left leading-tight sm:block">
                <p className="text-sm font-semibold">
                  {currentUser?.displayName ?? engineerState.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentUser ? ROLE_LABEL[currentUser.role] : engineerState.role}
                </p>
              </div>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
        {/* Hero */}
        <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{dateLine}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
              Guten Tag,{" "}
              {
                (currentUser?.firstName || currentUser?.displayName || engineerState.name).split(
                  " ",
                )[0]
              }
              .
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeProjects} aktive Projekte · {openWPs} offene Arbeitspakete ·{" "}
              {activities.length} Tätigkeiten
            </p>
          </div>
          <div className="flex items-center gap-2 no-print">
            <div
              role="tablist"
              aria-label="Zeitraum"
              className="inline-flex rounded-lg border border-border bg-secondary/40 p-1 text-sm"
            >
              <button
                role="tab"
                aria-selected={viewMode === "week"}
                onClick={() => switchView("week")}
                className={`rounded-md px-3 py-1.5 font-medium transition ${
                  viewMode === "week"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Woche
              </button>
              <button
                role="tab"
                aria-selected={viewMode === "month"}
                onClick={() => switchView("month")}
                className={`rounded-md px-3 py-1.5 font-medium transition ${
                  viewMode === "month"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monat
              </button>
            </div>
            <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/40 p-1 text-sm">
              <button
                onClick={() => shiftPeriod(-1)}
                className="grid size-7 place-items-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label={viewMode === "month" ? "Vorheriger Monat" : "Vorherige Woche"}
              >
                ◀
              </button>
              <button
                onClick={resetPeriod}
                disabled={periodOffset === 0}
                className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-50"
              >
                Heute
              </button>
              <button
                onClick={() => shiftPeriod(1)}
                className="grid size-7 place-items-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label={viewMode === "month" ? "Nächster Monat" : "Nächste Woche"}
              >
                ▶
              </button>
            </div>
            {isSwitching && (
              <span
                role="status"
                aria-label="Lädt"
                className="inline-block size-3 animate-pulse rounded-full bg-primary"
              />
            )}
            <div className="relative no-print">
              <button
                onClick={() => setShowNewMenu((v) => !v)}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:opacity-90"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Plus className="size-4" /> Neu
                <ChevronDown className="size-4 opacity-80" />
              </button>
              {showNewMenu && (
                <>
                  <button
                    aria-label="Menü schließen"
                    className="fixed inset-0 z-30 cursor-default"
                    onClick={() => setShowNewMenu(false)}
                  />
                  <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-background shadow-[var(--shadow-elevated)]">
                    <button
                      onClick={() => {
                        setShowNewMenu(false);
                        setEditingActivity(emptyActivity());
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
                    >
                      <Clock className="size-4 opacity-70" /> Neue Tätigkeit
                    </button>
                    <button
                      onClick={() => {
                        setShowNewMenu(false);
                        setEditingWP(emptyWP());
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
                    >
                      <CheckCircle2 className="size-4 opacity-70" /> Neues Arbeitspaket
                    </button>
                    <button
                      onClick={() => {
                        setShowNewMenu(false);
                        setEditingProject(emptyProject());
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
                    >
                      <FolderKanban className="size-4 opacity-70" /> Neues Projekt
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<Clock className="size-5" />}
            label={viewMode === "month" ? "Aufwand diesen Monat" : "Aufwand diese Woche"}
            value={`${periodActual.toFixed(1)} h`}
            sub={`Soll ${periodTarget.toFixed(1)} h · ${periodDiff >= 0 ? "+" : ""}${periodDiff.toFixed(1)} h`}
            progress={periodUtilization}
          />
          <KpiCard
            icon={<TrendingUp className="size-5" />}
            label={viewMode === "month" ? "Verrechenbar (Monat)" : "Verrechenbar (KW)"}
            value={`${periodBillable.toFixed(1)} h`}
            sub={`${periodActual > 0 ? Math.round((periodBillable / periodActual) * 100) : 0}% Billable · Auslastung ${periodUtilization.toFixed(1)}%`}
            tone="success"
          />

          <KpiCard
            icon={<Euro className="size-5" />}
            label="Umsatz gesamt"
            value={fmtEuro(totalRevenue)}
            sub={`${fmtEuro(openRevenue)} noch offen`}
            tone="info"
          />
          <KpiCard
            icon={<AlertTriangle className="size-5" />}
            label="Offene Arbeitspakete"
            value={String(openWPs)}
            sub={`${workPackages.filter((w) => w.priority === "kritisch" && w.status !== "erledigt").length} kritisch`}
            tone="warning"
          />
        </section>

        {/* Persönlicher Leistungsreport (lazy — recharts-Chunk lädt on-demand) */}
        {showPerfReport && now && (
          <Suspense fallback={null}>
            <PerformanceReport
              activities={activities}
              workPackages={workPackages}
              projects={projects}
              engineer={engineerState}
              reference={now}
              targetTimeModels={targetTimeModels}
            />
          </Suspense>
        )}

        {/* Tabs */}
        <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-border bg-secondary/40 p-1 text-sm no-print">
          <TabButton
            active={tab === "projekte"}
            onClick={() => setTab("projekte")}
            icon={<FolderKanban className="size-4" />}
          >
            Projekte ({projects.length})
          </TabButton>
          <TabButton
            active={tab === "arbeitspakete"}
            onClick={() => setTab("arbeitspakete")}
            icon={<Layers className="size-4" />}
          >
            Arbeitspakete ({workPackages.length})
          </TabButton>
          <TabButton
            active={tab === "taetigkeiten"}
            onClick={() => setTab("taetigkeiten")}
            icon={<Clock className="size-4" />}
          >
            Tätigkeiten ({periodActivities.length}/{activities.length})
          </TabButton>
          <TabButton
            active={tab === "abrechnung"}
            onClick={() => setTab("abrechnung")}
            icon={<Euro className="size-4" />}
          >
            Abrechnung
          </TabButton>
        </div>

        {tab === "projekte" && (
          <ProjectsView
            projects={projects}
            spentByProject={spentByProject}
            workPackages={workPackages}
            periodProjectIds={activeInPeriod.projectIds}
            periodLabel={metrics?.range.label ?? ""}
            onNew={() => setEditingProject(emptyProject())}
            onEdit={setEditingProject}
            onDelete={deleteProject}
          />
        )}
        {tab === "arbeitspakete" && (
          <WorkPackagesView
            workPackages={workPackages}
            projects={projects}
            spentByWP={spentByWP}
            periodWpIds={activeInPeriod.wpIds}
            periodLabel={metrics?.range.label ?? ""}
            onNew={() => setEditingWP(emptyWP())}
            onEdit={setEditingWP}
            onDelete={deleteWP}
          />
        )}
        {tab === "taetigkeiten" && (
          <ActivitiesView
            activities={activities}
            periodActivities={periodActivities}
            periodLabel={metrics?.range.label ?? ""}
            workPackages={workPackages}
            projects={projects}
            onNew={() => setEditingActivity(emptyActivity())}
            onEdit={setEditingActivity}
            onDelete={deleteActivity}
          />
        )}
        {tab === "abrechnung" && (
          <BillingView
            activities={activities}
            workPackages={workPackages}
            projects={projects}
            buckets={chartBuckets}
            chartMax={chartMax}
            viewMode={viewMode}
            onEdit={setEditingActivity}
          />
        )}

        <footer className="mt-10 flex items-center justify-between border-t border-border pt-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ActivityIcon className="size-3.5 text-success" />
            <span>Alle Systeme operativ</span>
          </div>
          <p className="font-mono">{engineerState.company}</p>
        </footer>
      </main>

      {editingProject && (
        <ProjectDialog
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={(p) => {
            saveProject(p);
            setEditingProject(null);
          }}
        />
      )}
      {editingWP && (
        <WorkPackageDialog
          wp={editingWP}
          projects={projects}
          onClose={() => setEditingWP(null)}
          onSave={(w) => {
            saveWP(w);
            setEditingWP(null);
          }}
        />
      )}
      {editingActivity && (
        <ActivityDialog
          activity={editingActivity}
          workPackages={workPackages}
          projects={projects}
          onClose={() => setEditingActivity(null)}
          onSave={(a) => {
            saveActivity(a);
            setEditingActivity(null);
          }}
        />
      )}
      {showEngineer && (
        <EngineerDialog
          engineerState={engineerState}
          currentUser={currentUser}
          targetTimeModels={targetTimeModels}
          onOpenWorkingTime={() => {
            setShowEngineer(false);
            setShowWorkingTimeDialog(true);
          }}
          onClose={() => setShowEngineer(false)}
          onSave={(e, userPatch) => {
            setEngineer(e);
            if (currentUser && userPatch) {
              UserManagementService.updateUser(currentUser.id, userPatch);
            }
            setShowEngineer(false);
          }}
        />
      )}
      {showWorkingTimeDialog && (
        <Suspense fallback={null}>
          <WorkingTimeModelsDialog
            models={targetTimeModels}
            onChange={setTargetTimeModels}
            onClose={() => setShowWorkingTimeDialog(false)}
          />
        </Suspense>
      )}
      {showUserDialog && currentUser && (
        <Suspense fallback={null}>
          <UserManagementDialog
            open={showUserDialog}
            onClose={() => setShowUserDialog(false)}
            currentUser={currentUser}
            onProfileSwitch={() => {
              // Datenscope ist per-User; sicherster Weg: vollständiger Reload.
              window.location.reload();
            }}
          />
        </Suspense>
      )}

      {/* Alle folgenden Dialoge sind gegen ihren open-State gegated, damit der
          Lazy-Chunk erst beim ersten Öffnen geladen wird (nicht bei Route-Mount). */}
      {showManual && (
        <Suspense fallback={null}>
          <UserManualDialog
            open={showManual}
            onClose={() => {
              setShowManual(false);
              setManualTopicId(undefined);
              setManualQuery(undefined);
            }}
            initialRoute="/"
            initialTopicId={manualTopicId}
            initialQuery={manualQuery}
          />
        </Suspense>
      )}

      {showBackupDialog && (
        <Suspense fallback={null}>
          <BackupDialog open={showBackupDialog} onOpenChange={setShowBackupDialog} />
        </Suspense>
      )}

      {showSystemStatus && (
        <Suspense fallback={null}>
          <SystemStatusDialog open={showSystemStatus} onOpenChange={setShowSystemStatus} />
        </Suspense>
      )}

      {showTechnicalReport && (
        <Suspense fallback={null}>
          <TechnicalReportDialog
            open={showTechnicalReport}
            onOpenChange={setShowTechnicalReport}
          />
        </Suspense>
      )}

      {showExportDialog && (
        <Suspense fallback={null}>
          <ExportDialog
            open={showExportDialog}
            onOpenChange={setShowExportDialog}
            projects={projects}
            workPackages={workPackages}
            activities={activities}
            engineer={engineerState}
            onJsonBackup={exportData}
          />
        </Suspense>
      )}

      {showArchiveDialog && (
        <Suspense fallback={null}>
          <LocalArchiveDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog} />
        </Suspense>
      )}
      {showDownloads && (
        <Suspense fallback={null}>
          <DownloadCenterDialog open={showDownloads} onOpenChange={setShowDownloads} />
        </Suspense>
      )}
      {showImportExport && (
        <Suspense fallback={null}>
          <ImportExportDialog
            open={showImportExport}
            onOpenChange={setShowImportExport}
            onOpenBackup={() => {
              setShowImportExport(false);
              setShowBackupDialog(true);
            }}
          />
        </Suspense>
      )}
      {showAzureData && (
        <Suspense fallback={null}>
          <AzureDataDialog open={showAzureData} onOpenChange={setShowAzureData} />
        </Suspense>
      )}
      {showLogViewer && (
        <Suspense fallback={null}>
          <LogViewerDialog open={showLogViewer} onOpenChange={setShowLogViewer} />
        </Suspense>
      )}
    </div>
  );
}
