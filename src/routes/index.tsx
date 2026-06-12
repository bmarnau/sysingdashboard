import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity as ActivityIcon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Euro,
  FolderKanban,
  Layers,
  Pencil,
  Plus,
  Printer,
  Search,
  Server,
  Settings,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  dashboardData,
  type Activity,
  type BillingStatus,
  type Engineer,
  type Priority,
  type Project,
  type ProjectStatus,
  type WorkPackage,
  type WorkPackageStatus,
} from "@/lib/dashboard-data";
import { ExportDialog } from "@/components/ExportDialog";

export const Route = createFileRoute("/")({
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

/* ------------------------------ Labels & Styles ------------------------------ */

const wpStatusLabel: Record<WorkPackageStatus, string> = {
  offen: "Offen",
  in_arbeit: "In Arbeit",
  wartend: "Wartet",
  erledigt: "Erledigt",
};
const wpStatusStyles: Record<WorkPackageStatus, string> = {
  offen: "bg-info/15 text-info border-info/30",
  in_arbeit: "bg-primary/15 text-primary border-primary/30",
  wartend: "bg-warning/15 text-warning border-warning/30",
  erledigt: "bg-success/15 text-success border-success/30",
};
const priorityStyles: Record<Priority, string> = {
  niedrig: "bg-muted text-muted-foreground",
  mittel: "bg-info/20 text-info",
  hoch: "bg-warning/20 text-warning",
  kritisch: "bg-destructive/20 text-destructive",
};
const projectStatusLabel: Record<ProjectStatus, string> = {
  on_track: "Im Plan",
  at_risk: "Risiko",
  delayed: "Verzug",
  abgeschlossen: "Fertig",
};
const projectStatusStyles: Record<ProjectStatus, string> = {
  on_track: "bg-success/15 text-success border-success/30",
  at_risk: "bg-warning/15 text-warning border-warning/30",
  delayed: "bg-destructive/15 text-destructive border-destructive/30",
  abgeschlossen: "bg-muted text-muted-foreground border-border",
};
const billingLabel: Record<BillingStatus, string> = {
  offen: "Offen",
  abgerechnet: "Abgerechnet",
  nicht_abrechenbar: "Nicht abrechenbar",
};
const billingStyles: Record<BillingStatus, string> = {
  offen: "bg-warning/15 text-warning border-warning/30",
  abgerechnet: "bg-success/15 text-success border-success/30",
  nicht_abrechenbar: "bg-muted text-muted-foreground border-border",
};

/* ----------------------------- Persistence & utils ---------------------------- */

const STORAGE_KEY = "northbit-dashboard-v2";

type PersistedState = {
  engineer: Engineer;
  projects: Project[];
  workPackages: WorkPackage[];
  activities: Activity[];
};

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function getISOWeek(date: Date): number {
  const tmp = new Date(date.getTime());
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
  const yearStart = new Date(tmp.getFullYear(), 0, 1);
  return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

const WEEK_DAYS = ["Mo", "Di", "Mi", "Do", "Fr"] as const;

function startOfISOWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeWeeklyHours(activities: Activity[], reference: Date) {
  const weekStart = startOfISOWeek(reference);
  const weekEnd = new Date(weekStart.getTime());
  weekEnd.setDate(weekEnd.getDate() + 5);
  const buckets = WEEK_DAYS.map((day) => ({ day, hours: 0, billable: 0 }));
  for (const a of activities) {
    if (!a.date) continue;
    const d = new Date(a.date);
    if (Number.isNaN(d.getTime())) continue;
    if (d < weekStart || d >= weekEnd) continue;
    const idx = (d.getDay() || 7) - 1;
    if (idx < 0 || idx > 4) continue;
    const dur = Number(a.duration) || 0;
    buckets[idx].hours = +(buckets[idx].hours + dur).toFixed(2);
    if (a.billable) buckets[idx].billable = +(buckets[idx].billable + dur).toFixed(2);
  }
  return buckets;
}

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "2-digit" });
}

function fmtEuro(v: number) {
  return v.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

/* ----------------------------- Validation & normalization ---------------------- */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidISODate(s?: string): boolean {
  if (!s || !ISO_DATE_RE.test(s)) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

export type ActivityErrors = {
  title?: string;
  date?: string;
  duration?: string;
  hourlyRate?: string;
  billingStatus?: string;
};

function validateActivity(a: Activity): ActivityErrors {
  const errs: ActivityErrors = {};
  if (!a.title || a.title.trim().length < 2) errs.title = "Titel ist erforderlich (mind. 2 Zeichen).";
  if (!isValidISODate(a.date)) errs.date = "Gültiges Datum erforderlich.";
  if (!(Number(a.duration) > 0)) errs.duration = "Dauer muss größer als 0 sein.";
  if (a.billable) {
    if (!(Number(a.hourlyRate) >= 0) || Number.isNaN(Number(a.hourlyRate)))
      errs.hourlyRate = "Stundensatz erforderlich für abrechenbare Tätigkeiten.";
    if (a.billingStatus !== "offen" && a.billingStatus !== "abgerechnet")
      errs.billingStatus = "Abrechnungsstatus muss 'Offen' oder 'Abgerechnet' sein.";
  }
  return errs;
}

/** Erzwingt Invarianten:
 *  - !billable ⇒ status="nicht_abrechenbar", hourlyRate=0
 *  - billable ⇒ status ∈ {offen,abgerechnet}, hourlyRate≥0
 *  - workPackageId zeigt entweder auf existierendes WP oder null
 *  - duration/hourlyRate sind nicht-negative Zahlen
 */
function normalizeActivity(a: Activity, validWpIds: Set<string>): Activity {
  const duration = Math.max(0, Number(a.duration) || 0);
  const hourlyRateRaw = Math.max(0, Number(a.hourlyRate) || 0);
  const workPackageId = a.workPackageId && validWpIds.has(a.workPackageId) ? a.workPackageId : null;
  if (!a.billable) {
    return {
      ...a,
      duration,
      hourlyRate: 0,
      billable: false,
      billingStatus: "nicht_abrechenbar",
      workPackageId,
      title: (a.title ?? "").trim() === "" ? a.title : a.title.trim(),
    };
  }
  const billingStatus: BillingStatus =
    a.billingStatus === "abgerechnet" ? "abgerechnet" : "offen";
  return {
    ...a,
    duration,
    hourlyRate: hourlyRateRaw,
    billable: true,
    billingStatus,
    workPackageId,
    title: (a.title ?? "").trim() === "" ? a.title : a.title.trim(),
  };
}

function normalizeWorkPackage(w: WorkPackage, validProjectIds: Set<string>): WorkPackage {
  return {
    ...w,
    projectId: w.projectId && validProjectIds.has(w.projectId) ? w.projectId : null,
  };
}


/* ---------------------------------- Component --------------------------------- */

type Tab = "projekte" | "arbeitspakete" | "taetigkeiten" | "abrechnung";

function Dashboard() {
  const [projects, setProjects] = useState<Project[]>(dashboardData.projects);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>(dashboardData.workPackages);
  const [activities, setActivities] = useState<Activity[]>(dashboardData.activities);
  const [engineerState, setEngineer] = useState<Engineer>(dashboardData.engineer);
  const [hydrated, setHydrated] = useState(false);

  const [tab, setTab] = useState<Tab>("projekte");
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showServiceMenu, setShowServiceMenu] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Dialog state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingWP, setEditingWP] = useState<WorkPackage | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showEngineer, setShowEngineer] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const p = loadPersisted();
    const rawProjects = p?.projects ?? dashboardData.projects;
    const rawWPs = p?.workPackages ?? dashboardData.workPackages;
    const rawActs = p?.activities ?? dashboardData.activities;
    const projectIds = new Set(rawProjects.map((x) => x.id));
    const normWPs = rawWPs.map((w) => normalizeWorkPackage(w, projectIds));
    const wpIds = new Set(normWPs.map((w) => w.id));
    const normActs = rawActs.map((a) => normalizeActivity(a, wpIds));
    setEngineer(p?.engineer ?? dashboardData.engineer);
    setProjects(rawProjects);
    setWorkPackages(normWPs);
    setActivities(normActs);
    setNow(new Date());
    setHydrated(true);
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ engineer: engineerState, projects, workPackages, activities }),
      );
    } catch {
      /* ignore */
    }
  }, [hydrated, engineerState, projects, workPackages, activities]);

  const resetData = () => {
    if (!confirm("Lokale Daten zurücksetzen?")) return;
    window.localStorage.removeItem(STORAGE_KEY);
    setEngineer(dashboardData.engineer);
    setProjects(dashboardData.projects);
    setWorkPackages(dashboardData.workPackages);
    setActivities(dashboardData.activities);
  };

  const exportData = () => {
    const payload = { projects, workPackages, activities, engineer: engineerState, exportedAt: new Date().toISOString() };
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

  const weekly = useMemo(
    () => (now ? computeWeeklyHours(activities, now) : WEEK_DAYS.map((day) => ({ day, hours: 0, billable: 0 }))),
    [activities, now],
  );
  const weeklyLogged = weekly.reduce((s, d) => s + d.hours, 0);
  const billableThisWeek = weekly.reduce((s, d) => s + d.billable, 0);
  const maxHours = Math.max(...weekly.map((d) => d.hours), 10);

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

  const dateLine = now
    ? `KW ${getISOWeek(now)} · ${now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`
    : "…";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="app-header sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl no-print">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
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
                onChange={(e) => { setSearchQ(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Kunde, Tätigkeit, Arbeitspaket, Projekt…"
                className="h-10 w-full rounded-lg border border-input bg-secondary/40 pl-9 pr-8 text-sm outline-none transition focus:border-ring"
              />
              {searchQ && (
                <button
                  onClick={() => { setSearchQ(""); setSearchOpen(false); }}
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
                  const pRes = projects.filter(p => p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q)).slice(0, 4);
                  const wpRes = workPackages.filter(w => w.title.toLowerCase().includes(q) || (w.client ?? "").toLowerCase().includes(q) || (w.tags ?? []).some(t => t.toLowerCase().includes(q))).slice(0, 4);
                  const aRes = activities.filter(a => a.title.toLowerCase().includes(q) || (a.client ?? "").toLowerCase().includes(q) || (a.description ?? "").toLowerCase().includes(q)).slice(0, 4);
                  const hasAny = pRes.length + wpRes.length + aRes.length > 0;
                  if (!hasAny) return (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">Keine Ergebnisse.</div>
                  );
                  return (
                    <>
                      {pRes.length > 0 && (
                        <div className="px-3 py-2">
                          <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Projekte</p>
                          {pRes.map(p => (
                            <button
                              key={p.id}
                              onClick={() => { setSearchQ(""); setSearchOpen(false); setTab("projekte"); setEditingProject(p); }}
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
                          <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Arbeitspakete</p>
                          {wpRes.map(w => {
                            const proj = w.projectId ? projects.find(p => p.id === w.projectId) : null;
                            return (
                              <button
                                key={w.id}
                                onClick={() => { setSearchQ(""); setSearchOpen(false); setTab("arbeitspakete"); setEditingWP(w); }}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-secondary/60"
                              >
                                <Layers className="size-4 text-info opacity-70" />
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{w.title}</p>
                                  <p className="text-xs text-muted-foreground">{proj ? proj.name : "projektlos"} · {w.client ?? "—"}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {aRes.length > 0 && (
                        <div className="border-t border-border px-3 py-2">
                          <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tätigkeiten</p>
                          {aRes.map(a => (
                            <button
                              key={a.id}
                              onClick={() => { setSearchQ(""); setSearchOpen(false); setTab("taetigkeiten"); setEditingActivity(a); }}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-secondary/60"
                            >
                              <Clock className="size-4 text-success opacity-70" />
                              <div className="min-w-0">
                                <p className="truncate font-medium">{a.title}</p>
                                <p className="text-xs text-muted-foreground">{fmtDate(a.date)} · {a.client ?? "—"}</p>
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
            <button
              onClick={() => window.print()}
              className="hidden sm:inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 text-sm font-medium transition hover:bg-secondary"
            >
              <Printer className="size-4" /> PDF
            </button>
            <button
              onClick={resetData}
              className="hidden sm:inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 text-sm font-medium transition hover:bg-destructive/20 hover:text-destructive"
            >
              Reset
            </button>
            <div className="relative">
              <button
                onClick={() => setShowServiceMenu((v) => !v)}
                className="relative grid size-10 place-items-center rounded-lg border border-border bg-secondary/40 transition hover:bg-secondary"
              >
                <Settings className="size-4" />
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
                      onClick={exportData}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
                    >
                      <Download className="size-4 opacity-70" /> Export
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setShowEngineer(true)}
              className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 py-1.5 pl-1.5 pr-3 transition hover:bg-secondary"
            >
              <div
                className="grid size-8 place-items-center rounded-md font-mono text-sm font-bold text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                {engineerState.initials}
              </div>
              <div className="hidden text-left leading-tight sm:block">
                <p className="text-sm font-semibold">{engineerState.name}</p>
                <p className="text-xs text-muted-foreground">{engineerState.role}</p>
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
              Guten Tag, {engineerState.name.split(" ")[0]}.
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeProjects} aktive Projekte · {openWPs} offene Arbeitspakete ·{" "}
              {activities.length} Tätigkeiten
            </p>
          </div>
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
        </section>

        {/* KPIs */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<Clock className="size-5" />}
            label="Aufwand diese Woche"
            value={`${weeklyLogged.toFixed(1)} h`}
            sub={`Ziel ${engineerState.weeklyTarget} h`}
            progress={(weeklyLogged / engineerState.weeklyTarget) * 100}
          />
          <KpiCard
            icon={<TrendingUp className="size-5" />}
            label="Verrechenbar (KW)"
            value={`${billableThisWeek.toFixed(1)} h`}
            sub={`${weeklyLogged > 0 ? Math.round((billableThisWeek / weeklyLogged) * 100) : 0}% Billable Ratio`}
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

        {/* Tabs */}
        <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-border bg-secondary/40 p-1 text-sm no-print">
          <TabButton active={tab === "projekte"} onClick={() => setTab("projekte")} icon={<FolderKanban className="size-4" />}>
            Projekte ({projects.length})
          </TabButton>
          <TabButton active={tab === "arbeitspakete"} onClick={() => setTab("arbeitspakete")} icon={<Layers className="size-4" />}>
            Arbeitspakete ({workPackages.length})
          </TabButton>
          <TabButton active={tab === "taetigkeiten"} onClick={() => setTab("taetigkeiten")} icon={<Clock className="size-4" />}>
            Tätigkeiten ({activities.length})
          </TabButton>
          <TabButton active={tab === "abrechnung"} onClick={() => setTab("abrechnung")} icon={<Euro className="size-4" />}>
            Abrechnung
          </TabButton>
        </div>

        {tab === "projekte" && (
          <ProjectsView
            projects={projects}
            spentByProject={spentByProject}
            workPackages={workPackages}
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
            onNew={() => setEditingWP(emptyWP())}
            onEdit={setEditingWP}
            onDelete={deleteWP}
          />
        )}
        {tab === "taetigkeiten" && (
          <ActivitiesView
            activities={activities}
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
            weekly={weekly}
            maxHours={maxHours}
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
          onClose={() => setShowEngineer(false)}
          onSave={(e) => {
            setEngineer(e);
            setShowEngineer(false);
          }}
        />
      )}
    </div>
  );
}

/* --------------------------------- Factories --------------------------------- */

function emptyProject(): Project {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: newId("P"),
    name: "",
    client: "",
    status: "on_track",
    start: today,
    deadline: today,
    team: [],
    budget: 40,
  };
}
function emptyWP(): WorkPackage {
  return {
    id: newId("WP"),
    title: "",
    projectId: null,
    status: "offen",
    priority: "mittel",
    estimated: 4,
    tags: [],
  };
}
function emptyActivity(): Activity {
  const now = new Date();
  return {
    id: newId("A"),
    title: "",
    workPackageId: null,
    date: now.toISOString().slice(0, 10),
    time: now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
    duration: 1,
    hourlyRate: 145,
    billable: true,
    billingStatus: "offen",
  };
}

/* --------------------------------- Shared UI --------------------------------- */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="card-print overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-elevated)]"
      style={{ background: "var(--gradient-card)" }}
    >
      {children}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 transition ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  progress,
  tone = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  progress?: number;
  tone?: "primary" | "success" | "warning" | "info";
}) {
  const toneMap = {
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    info: "bg-info/15 text-info",
  };
  return (
    <div
      className="card-print relative overflow-hidden rounded-2xl border border-border p-5 shadow-[var(--shadow-elevated)]"
      style={{ background: "var(--gradient-card)" }}
    >
      <div className="flex items-start justify-between">
        <div className={`grid size-10 place-items-center rounded-lg ${toneMap[tone]}`}>{icon}</div>
      </div>
      <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      {progress !== undefined && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: progress > 100 ? "var(--destructive)" : "var(--gradient-primary)",
            }}
          />
        </div>
      )}
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-input bg-secondary/40 pl-9 pr-3 text-sm outline-none transition focus:border-ring"
      />
    </div>
  );
}

function IconBtn({
  onClick,
  variant = "default",
  title,
  children,
}: {
  onClick: () => void;
  variant?: "default" | "danger";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`grid size-7 place-items-center rounded-md transition ${
        variant === "danger"
          ? "text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/* -------------------------------- Projects view ------------------------------- */

function ProjectsView({
  projects,
  workPackages,
  spentByProject,
  onNew,
  onEdit,
  onDelete,
}: {
  projects: Project[];
  workPackages: WorkPackage[];
  spentByProject: Map<string, number>;
  onNew: () => void;
  onEdit: (p: Project) => void;
  onDelete: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"alle" | ProjectStatus>("alle");
  const filtered = projects.filter((p) => {
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
          <button
            onClick={onNew}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 text-sm font-medium hover:bg-secondary"
          >
            <Plus className="size-4" /> Neu
          </button>
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
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{p.id}</p>
                  <h3 className="mt-1 truncate font-semibold leading-tight">{p.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{p.client}</p>
                </div>
                <span className={`rounded-md border px-2 py-1 text-[11px] font-medium ${projectStatusStyles[p.status]}`}>
                  {projectStatusLabel[p.status]}
                </span>
              </div>

              {p.description && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}

              <div className="mt-4">
                <div className="mb-1.5 flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">Aufwand (aus Tätigkeiten)</span>
                  <span className={`font-mono ${overBudget ? "text-destructive font-semibold" : ""}`}>
                    {spent.toFixed(1)} {budget ? `/ ${budget}` : ""} h
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(usage, 100)}%`,
                      background: overBudget ? "var(--destructive)" : usage > 85 ? "var(--warning)" : "var(--gradient-primary)",
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
                    <div key={m} className="grid size-7 place-items-center rounded-full border-2 border-card bg-secondary font-mono text-[10px] font-bold">
                      {m}
                    </div>
                  ))}
                </div>
                <div className="flex gap-1 no-print">
                  <IconBtn onClick={() => onEdit(p)} title="Bearbeiten">
                    <Pencil className="size-3.5" />
                  </IconBtn>
                  <IconBtn onClick={() => onDelete(p.id)} variant="danger" title="Löschen">
                    <Trash2 className="size-3.5" />
                  </IconBtn>
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

/* ---------------------------- Work Packages view ---------------------------- */

function WorkPackagesView({
  workPackages,
  projects,
  spentByWP,
  onNew,
  onEdit,
  onDelete,
}: {
  workPackages: WorkPackage[];
  projects: Project[];
  spentByWP: Map<string, number>;
  onNew: () => void;
  onEdit: (w: WorkPackage) => void;
  onDelete: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"alle" | WorkPackageStatus>("alle");
  const [proj, setProj] = useState<string>("alle");
  const projMap = new Map(projects.map((p) => [p.id, p]));

  const filtered = workPackages.filter((w) => {
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
            <div key={w.id} className="group grid grid-cols-12 items-center gap-3 px-4 py-4 transition hover:bg-secondary/30 sm:px-6">
              <div className="col-span-12 md:col-span-5">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${priorityStyles[w.priority]}`}>
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
                      <span key={t} className="rounded bg-secondary/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-span-6 md:col-span-2">
                <span className={`inline-block rounded-md border px-2 py-1 text-xs font-medium ${wpStatusStyles[w.status]}`}>
                  {wpStatusLabel[w.status]}
                </span>
              </div>
              <div className="col-span-6 md:col-span-3">
                <div className="flex items-baseline gap-1 font-mono text-sm">
                  <span className={overrun ? "text-destructive font-semibold" : ""}>{spent.toFixed(1)}</span>
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
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">Keine Arbeitspakete in dieser Ansicht.</p>
        )}
      </div>
    </Card>
  );
}

/* ----------------------------- Activities view ----------------------------- */

function ActivitiesView({
  activities,
  workPackages,
  projects,
  onNew,
  onEdit,
  onDelete,
}: {
  activities: Activity[];
  workPackages: WorkPackage[];
  projects: Project[];
  onNew: () => void;
  onEdit: (a: Activity) => void;
  onDelete: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [billing, setBilling] = useState<"alle" | BillingStatus>("alle");
  const [scope, setScope] = useState<"alle" | "billable" | "non_billable" | "ohne_wp" | "projektlos">("alle");

  const wpMap = new Map(workPackages.map((w) => [w.id, w]));
  const projMap = new Map(projects.map((p) => [p.id, p]));

  const filtered = activities.filter((a) => {
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
  const sorted = [...filtered].sort((a, b) => (b.date + (b.time ?? "")).localeCompare(a.date + (a.time ?? "")));

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold">Tätigkeiten</h2>
          <p className="text-xs text-muted-foreground">
            Optional einem Arbeitspaket zugeordnet · Abrechnung erfolgt ausschließlich hier
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            onClick={onNew}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 text-sm font-medium hover:bg-secondary"
          >
            <Plus className="size-4" /> Neu
          </button>
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
                    {a.description && <p className="mt-0.5 text-xs italic text-muted-foreground">{a.description}</p>}
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
                    {a.billable ? fmtEuro(amount) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-md border px-2 py-1 text-[11px] font-medium ${billingStyles[a.billingStatus]}`}>
                      {billingLabel[a.billingStatus]}
                    </span>
                    {!a.billable && (
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">nicht abr.</p>
                    )}
                  </td>
                  <td className="px-4 py-3 no-print">
                    <div className="flex justify-end gap-1">
                      <IconBtn onClick={() => onEdit(a)} title="Bearbeiten">
                        <Pencil className="size-3.5" />
                      </IconBtn>
                      <IconBtn onClick={() => onDelete(a.id)} variant="danger" title="Löschen">
                        <Trash2 className="size-3.5" />
                      </IconBtn>
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

/* ------------------------------ Billing view ------------------------------ */

function BillingView({
  activities,
  workPackages,
  projects,
  weekly,
  maxHours,
  onEdit,
}: {
  activities: Activity[];
  workPackages: WorkPackage[];
  projects: Project[];
  weekly: { day: string; hours: number; billable: number }[];
  maxHours: number;
  onEdit: (a: Activity) => void;
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
                      <td className="px-4 py-3 text-right font-mono font-semibold">{fmtEuro(a.duration * a.hourlyRate)}</td>
                      <td className="px-4 py-3 no-print text-right">
                        <IconBtn onClick={() => onEdit(a)} title="Bearbeiten">
                          <Pencil className="size-3.5" />
                        </IconBtn>
                      </td>
                    </tr>
                  );
                })}
                {open.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-muted-foreground">
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
              <span className="font-mono text-lg font-semibold text-warning">{fmtEuro(openSum)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Abgerechnet</span>
              <span className="font-mono text-lg font-semibold text-success">{fmtEuro(billedSum)}</span>
            </div>
            <div className="border-t border-border pt-3 flex items-baseline justify-between">
              <span className="font-medium">Gesamt</span>
              <span className="font-mono text-lg font-semibold">{fmtEuro(openSum + billedSum)}</span>
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
              <li className="px-6 py-6 text-center text-sm text-muted-foreground">Keine offenen Beträge.</li>
            )}
          </ul>
        </Card>

        <Card>
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">Aufwände dieser Woche</h2>
            <p className="text-xs text-muted-foreground">Erfasst vs. verrechenbar</p>
          </div>
          <div className="px-6 py-5">
            <div className="flex h-32 items-end justify-between gap-2">
              {weekly.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative flex w-full flex-1 items-end">
                    <div className="w-full rounded-t-md bg-secondary" style={{ height: `${(d.hours / maxHours) * 100}%` }} />
                    <div
                      className="absolute bottom-0 w-full rounded-t-md"
                      style={{
                        height: `${(d.billable / maxHours) * 100}%`,
                        background: "var(--gradient-primary)",
                      }}
                    />
                  </div>
                  <p className="text-[10px] font-medium">{d.day}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{d.hours.toFixed(1)}h</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* --------------------------------- Dialogs --------------------------------- */

const inputCls =
  "h-10 w-full rounded-md border border-input bg-secondary/40 px-3 text-sm outline-none transition focus:border-ring";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/70 p-4 backdrop-blur-sm no-print"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-2xl rounded-2xl border border-border p-6 shadow-[var(--shadow-elevated)]"
        style={{ background: "var(--gradient-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function FormActions({
  onCancel,
  onSave,
  saveDisabled,
  saveLabel = "Speichern",
}: {
  onCancel: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  saveLabel?: string;
}) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <button onClick={onCancel} className="h-9 rounded-md border border-border bg-secondary/40 px-4 text-sm hover:bg-secondary">
        Abbrechen
      </button>
      <button
        disabled={saveDisabled}
        onClick={onSave}
        className="h-9 rounded-md px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
        style={{ background: "var(--gradient-primary)" }}
      >
        {saveLabel}
      </button>
    </div>
  );
}

function ProjectDialog({
  project,
  onClose,
  onSave,
}: {
  project: Project;
  onClose: () => void;
  onSave: (p: Project) => void;
}) {
  const [form, setForm] = useState<Project & { teamText: string }>({
    ...project,
    teamText: (project.team ?? []).join(", "),
  });
  const isNew = !project.name;
  const valid = form.name.trim().length > 1 && form.client.trim().length > 1;

  return (
    <Modal title={isNew ? "Neues Projekt anlegen" : `Projekt bearbeiten – ${project.id}`} onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="col-span-1 sm:col-span-2 text-xs font-medium">
          Projektname
          <input className={`mt-1 ${inputCls}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="z. B. Datacenter Migration" />
        </label>
        <label className="text-xs font-medium">
          Kunde
          <input className={`mt-1 ${inputCls}`} value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
        </label>
        <label className="text-xs font-medium">
          Projektleitung
          <input className={`mt-1 ${inputCls}`} value={form.lead ?? ""} onChange={(e) => setForm({ ...form, lead: e.target.value })} />
        </label>
        <label className="text-xs font-medium">
          Start
          <input type="date" className={`mt-1 ${inputCls}`} value={form.start ?? ""} onChange={(e) => setForm({ ...form, start: e.target.value })} />
        </label>
        <label className="text-xs font-medium">
          Deadline
          <input type="date" className={`mt-1 ${inputCls}`} value={form.deadline ?? ""} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        </label>
        <label className="text-xs font-medium">
          Budget (h)
          <input type="number" min="0" step="1" className={`mt-1 ${inputCls}`} value={form.budget ?? 0} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} />
        </label>
        <label className="text-xs font-medium">
          Status
          <select className={`mt-1 ${inputCls}`} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>
            {(["on_track", "at_risk", "delayed", "abgeschlossen"] as ProjectStatus[]).map((s) => (
              <option key={s} value={s} className="bg-background">
                {projectStatusLabel[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-1 sm:col-span-2 text-xs font-medium">
          Team (Komma-getrennt)
          <input className={`mt-1 ${inputCls}`} value={form.teamText} onChange={(e) => setForm({ ...form, teamText: e.target.value })} placeholder="AB, CD, EF" />
        </label>
        <label className="col-span-1 sm:col-span-2 text-xs font-medium">
          Beschreibung
          <textarea rows={3} className={`mt-1 ${inputCls}`} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
      </div>

      <FormActions
        onCancel={onClose}
        saveDisabled={!valid}
        saveLabel={isNew ? "Anlegen" : "Speichern"}
        onSave={() => {
          const { teamText, ...rest } = form;
          onSave({
            ...rest,
            team: teamText
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
          });
        }}
      />
    </Modal>
  );
}

function WorkPackageDialog({
  wp,
  projects,
  onClose,
  onSave,
}: {
  wp: WorkPackage;
  projects: Project[];
  onClose: () => void;
  onSave: (w: WorkPackage) => void;
}) {
  const [form, setForm] = useState<WorkPackage & { tagsText: string }>({
    ...wp,
    tagsText: (wp.tags ?? []).join(", "),
  });
  const isNew = !wp.title;
  const valid = form.title.trim().length > 1;

  return (
    <Modal title={isNew ? "Neues Arbeitspaket" : `Arbeitspaket bearbeiten – ${wp.id}`} onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="col-span-1 sm:col-span-2 text-xs font-medium">
          Titel
          <input className={`mt-1 ${inputCls}`} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label className="text-xs font-medium">
          Projekt (optional)
          <select
            className={`mt-1 ${inputCls}`}
            value={form.projectId ?? ""}
            onChange={(e) => setForm({ ...form, projectId: e.target.value || null })}
          >
            <option value="">— Kein Projekt —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-background">
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          Kunde
          <input className={`mt-1 ${inputCls}`} value={form.client ?? ""} onChange={(e) => setForm({ ...form, client: e.target.value })} />
        </label>
        <label className="text-xs font-medium">
          Status
          <select className={`mt-1 ${inputCls}`} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as WorkPackageStatus })}>
            {(Object.keys(wpStatusLabel) as WorkPackageStatus[]).map((s) => (
              <option key={s} value={s} className="bg-background">
                {wpStatusLabel[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          Priorität
          <select className={`mt-1 ${inputCls}`} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
            {(["niedrig", "mittel", "hoch", "kritisch"] as Priority[]).map((p) => (
              <option key={p} value={p} className="bg-background">
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          Fällig
          <input type="date" className={`mt-1 ${inputCls}`} value={form.due ?? ""} onChange={(e) => setForm({ ...form, due: e.target.value })} />
        </label>
        <label className="text-xs font-medium">
          Geschätzt (h)
          <input type="number" min="0" step="0.25" className={`mt-1 ${inputCls}`} value={form.estimated ?? 0} onChange={(e) => setForm({ ...form, estimated: Number(e.target.value) })} />
        </label>
        <label className="text-xs font-medium">
          Zuständig
          <input className={`mt-1 ${inputCls}`} value={form.assignee ?? ""} onChange={(e) => setForm({ ...form, assignee: e.target.value })} />
        </label>
        <label className="col-span-1 sm:col-span-2 text-xs font-medium">
          Tags (Komma-getrennt)
          <input className={`mt-1 ${inputCls}`} value={form.tagsText} onChange={(e) => setForm({ ...form, tagsText: e.target.value })} />
        </label>
        <label className="col-span-1 sm:col-span-2 text-xs font-medium">
          Beschreibung
          <textarea rows={3} className={`mt-1 ${inputCls}`} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
      </div>

      <FormActions
        onCancel={onClose}
        saveDisabled={!valid}
        saveLabel={isNew ? "Anlegen" : "Speichern"}
        onSave={() => {
          const { tagsText, ...rest } = form;
          onSave({
            ...rest,
            tags: tagsText
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
          });
        }}
      />
    </Modal>
  );
}

function ActivityDialog({
  activity,
  workPackages,
  projects,
  onClose,
  onSave,
}: {
  activity: Activity;
  workPackages: WorkPackage[];
  projects: Project[];
  onClose: () => void;
  onSave: (a: Activity) => void;
}) {
  const [form, setForm] = useState<Activity>({ ...activity });
  const isNew = !activity.title;
  const errors = validateActivity(form);
  const valid = Object.keys(errors).length === 0;

  const wp = form.workPackageId ? workPackages.find((w) => w.id === form.workPackageId) : null;
  const project = wp?.projectId ? projects.find((p) => p.id === wp.projectId) : null;
  const amount = form.billable ? (Number(form.duration) || 0) * (Number(form.hourlyRate) || 0) : 0;
  const errCls = "mt-1 text-[11px] text-destructive";

  return (
    <Modal title={isNew ? "Neue Tätigkeit erfassen" : `Tätigkeit bearbeiten – ${activity.id}`} onClose={onClose}>
      <p className="mb-3 rounded-md border border-info/30 bg-info/10 px-3 py-2 text-[11px] text-info">
        Abrechnung erfolgt ausschließlich auf Ebene der Tätigkeit. Zuordnung zu Arbeitspaket oder Projekt ist optional.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="col-span-1 sm:col-span-2 text-xs font-medium">
          Tätigkeit
          <input
            className={`mt-1 ${inputCls}`}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Was wurde gemacht?"
            aria-invalid={!!errors.title}
          />
          {errors.title && <p className={errCls}>{errors.title}</p>}
        </label>
        <label className="col-span-1 sm:col-span-2 text-xs font-medium">
          Arbeitspaket (optional)
          <select
            className={`mt-1 ${inputCls}`}
            value={form.workPackageId ?? ""}
            onChange={(e) => {
              const id = e.target.value || null;
              const w = id ? workPackages.find((x) => x.id === id) : null;
              setForm({ ...form, workPackageId: id, client: form.client || w?.client });
            }}
          >
            <option value="">— Ohne Arbeitspaket —</option>
            {workPackages.map((w) => {
              const proj = w.projectId ? projects.find((p) => p.id === w.projectId) : null;
              return (
                <option key={w.id} value={w.id} className="bg-background">
                  {w.title} {proj ? `· ${proj.name}` : "· projektlos"}
                </option>
              );
            })}
          </select>
          {wp && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Zuordnung:{" "}
              {project ? (
                <span>
                  <FolderKanban className="mr-1 inline size-3" />
                  Projekt <span className="text-foreground">{project.name}</span>
                </span>
              ) : (
                <span className="italic">Arbeitspaket ohne Projekt</span>
              )}
            </p>
          )}
        </label>
        <label className="text-xs font-medium">
          Kunde
          <input className={`mt-1 ${inputCls}`} value={form.client ?? ""} onChange={(e) => setForm({ ...form, client: e.target.value })} />
        </label>
        <label className="text-xs font-medium">
          Datum
          <input
            type="date"
            className={`mt-1 ${inputCls}`}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            aria-invalid={!!errors.date}
          />
          {errors.date && <p className={errCls}>{errors.date}</p>}
        </label>
        <label className="text-xs font-medium">
          Uhrzeit
          <input type="time" className={`mt-1 ${inputCls}`} value={form.time ?? ""} onChange={(e) => setForm({ ...form, time: e.target.value })} />
        </label>
        <label className="text-xs font-medium">
          Dauer (h)
          <input
            type="number"
            min="0.25"
            step="0.25"
            className={`mt-1 ${inputCls}`}
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
            aria-invalid={!!errors.duration}
          />
          {errors.duration && <p className={errCls}>{errors.duration}</p>}
        </label>
        <label className="text-xs font-medium">
          Stundensatz (€)
          <input
            type="number"
            min="0"
            step="1"
            disabled={!form.billable}
            className={`mt-1 ${inputCls} disabled:opacity-50`}
            value={form.hourlyRate}
            onChange={(e) => setForm({ ...form, hourlyRate: Number(e.target.value) })}
            aria-invalid={!!errors.hourlyRate}
          />
          {form.billable
            ? errors.hourlyRate && <p className={errCls}>{errors.hourlyRate}</p>
            : <p className="mt-1 text-[11px] text-muted-foreground">Nur für abrechenbare Tätigkeiten.</p>}
        </label>
        <label className="flex items-center gap-2 text-xs font-medium pt-5">
          <input
            type="checkbox"
            checked={form.billable}
            onChange={(e) => {
              const next = e.target.checked;
              setForm({
                ...form,
                billable: next,
                hourlyRate: next ? form.hourlyRate : 0,
                billingStatus: next
                  ? form.billingStatus === "nicht_abrechenbar"
                    ? "offen"
                    : form.billingStatus
                  : "nicht_abrechenbar",
              });
            }}
            className="h-4 w-4 accent-primary"
          />
          Abrechenbar
        </label>
        <label className="text-xs font-medium">
          Abrechnungsstatus
          <select
            disabled={!form.billable}
            className={`mt-1 ${inputCls} disabled:opacity-50`}
            value={form.billingStatus}
            onChange={(e) => setForm({ ...form, billingStatus: e.target.value as BillingStatus })}
            aria-invalid={!!errors.billingStatus}
          >
            {form.billable ? (
              (["offen", "abgerechnet"] as BillingStatus[]).map((s) => (
                <option key={s} value={s} className="bg-background">
                  {billingLabel[s]}
                </option>
              ))
            ) : (
              <option value="nicht_abrechenbar" className="bg-background">
                {billingLabel.nicht_abrechenbar}
              </option>
            )}
          </select>
          {errors.billingStatus && <p className={errCls}>{errors.billingStatus}</p>}
        </label>
        <label className="col-span-1 sm:col-span-2 text-xs font-medium">
          Beschreibung
          <textarea rows={3} className={`mt-1 ${inputCls}`} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <div className="col-span-1 sm:col-span-2 rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs">
          Betrag:{" "}
          <span className="font-mono font-semibold text-foreground">
            {form.billable ? fmtEuro(amount) : "nicht abrechenbar"}
          </span>
        </div>
      </div>

      <FormActions
        onCancel={onClose}
        saveDisabled={!valid}
        saveLabel={isNew ? "Buchen" : "Speichern"}
        onSave={() => onSave(form)}
      />
    </Modal>
  );
}


function EngineerDialog({
  engineerState,
  onClose,
  onSave,
}: {
  engineerState: Engineer;
  onClose: () => void;
  onSave: (e: Engineer) => void;
}) {
  const [form, setForm] = useState({ ...engineerState });
  const valid = form.name.trim().length > 1 && form.role.trim().length > 1 && form.company.trim().length > 1;
  const genInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Modal title="Engineer-Profil" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="col-span-1 sm:col-span-2 text-xs font-medium">
          Name
          <input
            className={`mt-1 ${inputCls}`}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value, initials: genInitials(e.target.value) })}
          />
        </label>
        <label className="text-xs font-medium">
          Rolle
          <input className={`mt-1 ${inputCls}`} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        </label>
        <label className="text-xs font-medium">
          Unternehmen
          <input className={`mt-1 ${inputCls}`} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </label>
        <label className="text-xs font-medium">
          Initialen
          <input className={`mt-1 ${inputCls}`} value={form.initials} maxLength={2} onChange={(e) => setForm({ ...form, initials: e.target.value.toUpperCase().slice(0, 2) })} />
        </label>
        <label className="text-xs font-medium">
          Wochenziel (h)
          <input type="number" min={1} className={`mt-1 ${inputCls}`} value={form.weeklyTarget} onChange={(e) => setForm({ ...form, weeklyTarget: Number(e.target.value) })} />
        </label>
      </div>
      <FormActions onCancel={onClose} saveDisabled={!valid} onSave={() => onSave(form)} />
    </Modal>
  );
}
