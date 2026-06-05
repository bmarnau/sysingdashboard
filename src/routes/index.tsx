import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  FolderKanban,
  Plus,
  Printer,
  Search,
  Server,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  dashboardData,
  type Priority,
  type Project,
  type ProjectStatus,
  type Task,
  type TaskStatus,
  type TimeLog,
} from "@/lib/dashboard-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Engineer Console – NorthBit IT-Systemhaus" },
      {
        name: "description",
        content:
          "Aufgaben, Projekte und Aufwände eines Systems Engineers – mit Eingabe & PDF-Druckausgabe.",
      },
    ],
  }),
  component: Dashboard,
});

const statusLabel: Record<TaskStatus, string> = {
  offen: "Offen",
  in_arbeit: "In Arbeit",
  wartend: "Wartet",
  erledigt: "Erledigt",
};

const statusStyles: Record<TaskStatus, string> = {
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

const projectStatusStyles: Record<ProjectStatus, string> = {
  on_track: "bg-success/15 text-success border-success/30",
  at_risk: "bg-warning/15 text-warning border-warning/30",
  delayed: "bg-destructive/15 text-destructive border-destructive/30",
  abgeschlossen: "bg-muted text-muted-foreground border-border",
};

const projectStatusLabel: Record<ProjectStatus, string> = {
  on_track: "Im Plan",
  at_risk: "Risiko",
  delayed: "Verzug",
  abgeschlossen: "Fertig",
};

function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>(dashboardData.tasks);
  const [projects] = useState<Project[]>(dashboardData.projects);
  const [logs, setLogs] = useState<TimeLog[]>(dashboardData.recentLogs);
  const [weeklyHours, setWeeklyHours] = useState(dashboardData.weeklyHours);
  const [filter, setFilter] = useState<"alle" | "offen" | "kritisch">("alle");
  const [showTask, setShowTask] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const engineer = dashboardData.engineer;
  const weeklyLogged = useMemo(
    () => weeklyHours.reduce((s, d) => s + d.hours, 0),
    [weeklyHours],
  );
  const billableThisWeek = useMemo(
    () => weeklyHours.reduce((s, d) => s + d.billable, 0),
    [weeklyHours],
  );
  const totalSpent = tasks.reduce((s, t) => s + t.spent, 0);
  const totalEstimated = tasks.reduce((s, t) => s + t.estimated, 0);
  const openTasks = tasks.filter((t) => t.status !== "erledigt").length;
  const criticalTasks = tasks.filter(
    (t) => t.priority === "kritisch" && t.status !== "erledigt",
  ).length;
  const activeProjects = projects.filter((p) => p.status !== "abgeschlossen").length;
  const maxHours = Math.max(...weeklyHours.map((d) => d.hours), 10);

  const filteredTasks = tasks.filter((t) => {
    if (filter === "offen") return t.status !== "erledigt";
    if (filter === "kritisch") return t.priority === "kritisch" || t.priority === "hoch";
    return true;
  });

  const updateTaskStatus = (id: string, status: TaskStatus) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)));

  const updateTaskSpent = (id: string, spent: number) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, spent } : t)));

  const removeTask = (id: string) => setTasks((ts) => ts.filter((t) => t.id !== id));

  const addTask = (t: Omit<Task, "id" | "spent">) => {
    const id = `T-${2049 + tasks.length}`;
    setTasks((ts) => [{ ...t, id, spent: 0 }, ...ts]);
  };

  const addLog = (entry: TimeLog) => {
    setLogs((l) => [entry, ...l]);
    const today = ["Mo", "Di", "Mi", "Do", "Fr"][new Date().getDay() - 1] ?? "Fr";
    setWeeklyHours((ws) =>
      ws.map((w) =>
        w.day === today
          ? { ...w, hours: +(w.hours + entry.duration).toFixed(2), billable: +(w.billable + entry.duration).toFixed(2) }
          : w,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="app-header sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl no-print">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
              <Server className="size-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">NorthBit</p>
              <p className="text-sm font-semibold">Engineer Console</p>
            </div>
          </div>

          <div className="relative ml-2 hidden flex-1 max-w-md md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Tickets, Kunden, Projekte suchen…"
              className="h-10 w-full rounded-lg border border-input bg-secondary/40 pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:bg-secondary/70"
            />
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => window.print()}
              className="hidden sm:inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 text-sm font-medium transition hover:bg-secondary"
              title="Als PDF drucken"
            >
              <Printer className="size-4" />
              PDF
            </button>
            <button className="relative grid size-10 place-items-center rounded-lg border border-border bg-secondary/40 transition hover:bg-secondary">
              <Bell className="size-4" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" />
            </button>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 py-1.5 pl-1.5 pr-3">
              <div
                className="grid size-8 place-items-center rounded-md font-mono text-sm font-bold text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                {engineer.initials}
              </div>
              <div className="hidden text-left leading-tight sm:block">
                <p className="text-sm font-semibold">{engineer.name}</p>
                <p className="text-xs text-muted-foreground">{engineer.role}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
        {/* Print header */}
        <div className="print-only mb-6 border-b border-border pb-4">
          <h1 className="text-2xl font-bold">Engineer Aufwandsbericht</h1>
          <p className="text-sm">
            {engineer.name} · {engineer.role} · {engineer.company}
          </p>
          <p className="text-xs text-muted-foreground">
            Stand: {new Date().toLocaleString("de-DE")}
          </p>
        </div>

        {/* Hero */}
        <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              KW 19 · Freitag, 8. Mai 2026
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
              Guten Morgen, {engineer.name.split(" ")[0]}.
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {openTasks} offene Aufgaben · {activeProjects} aktive Projekte ·{" "}
              <span className="text-warning">{criticalTasks} kritisch</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 no-print">
            <button
              onClick={() => setShowLog(true)}
              className="h-10 rounded-lg border border-border bg-secondary/40 px-4 text-sm font-medium transition hover:bg-secondary"
            >
              Zeit erfassen
            </button>
            <button
              onClick={() => setShowTask(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:opacity-90"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Plus className="size-4" /> Neues Ticket
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-4 text-sm font-medium transition hover:bg-secondary sm:hidden"
            >
              <Printer className="size-4" /> PDF
            </button>
          </div>
        </section>

        {/* KPIs */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<Clock className="size-5" />}
            label="Aufwand diese Woche"
            value={`${weeklyLogged.toFixed(1)} h`}
            sub={`Ziel ${engineer.weeklyTarget} h`}
            progress={(weeklyLogged / engineer.weeklyTarget) * 100}
          />
          <KpiCard
            icon={<TrendingUp className="size-5" />}
            label="Verrechenbar (KW)"
            value={`${billableThisWeek.toFixed(1)} h`}
            sub={`${weeklyLogged > 0 ? Math.round((billableThisWeek / weeklyLogged) * 100) : 0}% Billable Ratio`}
            tone="success"
          />
          <KpiCard
            icon={<FolderKanban className="size-5" />}
            label="Aktive Projekte"
            value={String(activeProjects)}
            sub={`${projects.filter((p) => p.status === "at_risk" || p.status === "delayed").length} mit Risiko`}
            tone="info"
          />
          <KpiCard
            icon={<AlertTriangle className="size-5" />}
            label="Aufwand vs. Schätzung"
            value={`${totalSpent.toFixed(1)} / ${totalEstimated} h`}
            sub={`${Math.round((totalSpent / totalEstimated) * 100)}% verbraucht`}
            tone="warning"
            progress={(totalSpent / totalEstimated) * 100}
          />
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Tasks */}
          <section className="xl:col-span-2">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
                <div>
                  <h2 className="text-lg font-semibold">Meine Aufgaben</h2>
                  <p className="text-xs text-muted-foreground">
                    Aktuelle Tickets & Changes · inline editierbar
                  </p>
                </div>
                <div className="flex gap-1 rounded-lg border border-border bg-secondary/40 p-1 text-xs no-print">
                  {(["alle", "offen", "kritisch"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`rounded-md px-3 py-1.5 capitalize transition ${
                        filter === f
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divide-y divide-border">
                {filteredTasks.map((t) => {
                  const overrun = t.spent > t.estimated;
                  const pct = Math.min((t.spent / t.estimated) * 100, 100);
                  return (
                    <div
                      key={t.id}
                      className="group grid grid-cols-12 items-center gap-3 px-4 py-4 transition hover:bg-secondary/30 sm:px-6"
                    >
                      <div className="col-span-12 md:col-span-5">
                        <div className="flex items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${priorityStyles[t.priority]}`}>
                            {t.priority.toUpperCase()}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">{t.ticket}</span>
                        </div>
                        <p className="mt-1.5 font-medium leading-snug">{t.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t.client} · <span className="text-foreground/70">{t.project}</span>
                        </p>
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <select
                          value={t.status}
                          onChange={(e) => updateTaskStatus(t.id, e.target.value as TaskStatus)}
                          className={`w-full rounded-md border bg-transparent px-2 py-1 text-xs font-medium outline-none ${statusStyles[t.status]}`}
                        >
                          {(Object.keys(statusLabel) as TaskStatus[]).map((s) => (
                            <option key={s} value={s} className="bg-background text-foreground">
                              {statusLabel[s]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-6 md:col-span-3">
                        <div className="flex items-baseline gap-1 font-mono text-sm">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            value={t.spent}
                            onChange={(e) => updateTaskSpent(t.id, Number(e.target.value))}
                            className={`w-16 rounded border border-input bg-secondary/40 px-1.5 py-0.5 text-right outline-none focus:border-ring ${overrun ? "text-destructive font-semibold" : ""}`}
                          />
                          <span className="text-xs text-muted-foreground">/ {t.estimated} h</span>
                        </div>
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: overrun ? "var(--destructive)" : "var(--gradient-primary)",
                            }}
                          />
                        </div>
                      </div>
                      <div className="col-span-10 md:col-span-1 text-right">
                        <p className="font-mono text-[10px] text-muted-foreground">Fällig</p>
                        <p className="text-xs font-medium">
                          {new Date(t.due).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                        </p>
                      </div>
                      <div className="col-span-2 md:col-span-1 flex justify-end no-print">
                        <button
                          onClick={() => removeTask(t.id)}
                          className="grid size-7 place-items-center rounded-md text-muted-foreground opacity-0 transition hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
                          title="Löschen"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredTasks.length === 0 && (
                  <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                    Keine Aufgaben in dieser Ansicht.
                  </p>
                )}
              </div>
            </Card>
          </section>

          {/* Right column */}
          <section className="space-y-6">
            <Card>
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold">Aufwände dieser Woche</h2>
                <p className="text-xs text-muted-foreground">Erfasst vs. verrechenbar</p>
              </div>
              <div className="px-6 py-5">
                <div className="flex h-40 items-end justify-between gap-3">
                  {weeklyHours.map((d) => (
                    <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                      <div className="relative flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-t-md bg-secondary"
                          style={{ height: `${(d.hours / maxHours) * 100}%` }}
                        />
                        <div
                          className="absolute bottom-0 w-full rounded-t-md"
                          style={{
                            height: `${(d.billable / maxHours) * 100}%`,
                            background: "var(--gradient-primary)",
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium">{d.day}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{d.hours}h</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-sm" style={{ background: "var(--gradient-primary)" }} />
                    <span className="text-muted-foreground">Verrechenbar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-sm bg-secondary" />
                    <span className="text-muted-foreground">Intern</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold">Heutige Zeitbuchungen</h2>
                <p className="text-xs text-muted-foreground">
                  {logs.reduce((s, l) => s + l.duration, 0).toFixed(2)} h erfasst
                </p>
              </div>
              <ul className="divide-y divide-border">
                {logs.map((l, i) => (
                  <li key={i} className="flex items-start gap-3 px-6 py-3">
                    <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-secondary font-mono text-[11px]">
                      {l.time}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{l.task}</p>
                      <p className="text-xs text-muted-foreground">{l.client}</p>
                    </div>
                    <span className="font-mono text-sm text-primary">{l.duration}h</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        </div>

        {/* Projects */}
        <section className="mt-8">
          <Card>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">Projekte & Aufwandstracking</h2>
                <p className="text-xs text-muted-foreground">Budget, Fortschritt und Status</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => {
                const usage = (p.spent / p.budget) * 100;
                const overBudget = p.spent > p.budget;
                return (
                  <div key={p.id} className="bg-card p-5 transition hover:bg-secondary/20">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{p.id}</p>
                        <h3 className="mt-1 font-semibold leading-tight">{p.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{p.client}</p>
                      </div>
                      <span className={`rounded-md border px-2 py-1 text-[11px] font-medium ${projectStatusStyles[p.status]}`}>
                        {projectStatusLabel[p.status]}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="mb-1.5 flex items-baseline justify-between text-xs">
                        <span className="text-muted-foreground">Fortschritt</span>
                        <span className="font-mono font-semibold">{p.progress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: "var(--gradient-primary)" }} />
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="mb-1.5 flex items-baseline justify-between text-xs">
                        <span className="text-muted-foreground">Aufwand</span>
                        <span className={`font-mono ${overBudget ? "text-destructive font-semibold" : ""}`}>
                          {p.spent} / {p.budget} h
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(usage, 100)}%`,
                            background: overBudget ? "var(--destructive)" : usage > 85 ? "var(--warning)" : "var(--success)",
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                      <div className="flex -space-x-2">
                        {p.team.map((m) => (
                          <div key={m} className="grid size-7 place-items-center rounded-full border-2 border-card bg-secondary font-mono text-[10px] font-bold">
                            {m}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="size-3" />
                        <span>
                          Deadline {new Date(p.deadline).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        <footer className="mt-10 flex items-center justify-between border-t border-border pt-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Activity className="size-3.5 text-success" />
            <span>Alle Systeme operativ · Sync vor 2 Min.</span>
          </div>
          <p className="font-mono">{engineer.company}</p>
        </footer>
      </main>

      {showTask && (
        <TaskDialog
          projects={projects}
          onClose={() => setShowTask(false)}
          onSave={(t) => {
            addTask(t);
            setShowTask(false);
          }}
        />
      )}
      {showLog && (
        <LogDialog
          tasks={tasks}
          onClose={() => setShowLog(false)}
          onSave={(l) => {
            addLog(l);
            setShowLog(false);
          }}
        />
      )}
    </div>
  );
}

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
        <CheckCircle2 className="size-4 text-muted-foreground/40" />
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
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

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm no-print" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-border p-6 shadow-[var(--shadow-elevated)]"
        style={{ background: "var(--gradient-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-md border border-input bg-secondary/40 px-3 text-sm outline-none transition focus:border-ring";

function TaskDialog({
  projects,
  onClose,
  onSave,
}: {
  projects: Project[];
  onClose: () => void;
  onSave: (t: Omit<Task, "id" | "spent">) => void;
}) {
  const [form, setForm] = useState({
    title: "",
    client: projects[0]?.client ?? "",
    project: projects[0]?.name ?? "",
    status: "offen" as TaskStatus,
    priority: "mittel" as Priority,
    due: new Date().toISOString().slice(0, 10),
    estimated: 4,
    ticket: "",
  });
  const valid = form.title.trim().length > 1 && form.ticket.trim().length > 1;

  return (
    <Modal title="Neues Ticket anlegen" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="col-span-1 sm:col-span-2 text-xs font-medium">
          Titel
          <input
            className={`mt-1 ${inputCls}`}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="z. B. Firewall Regelwerk reviewen"
          />
        </label>
        <label className="text-xs font-medium">
          Ticket-ID
          <input
            className={`mt-1 ${inputCls}`}
            value={form.ticket}
            onChange={(e) => setForm({ ...form, ticket: e.target.value })}
            placeholder="INC-12345"
          />
        </label>
        <label className="text-xs font-medium">
          Fällig
          <input
            type="date"
            className={`mt-1 ${inputCls}`}
            value={form.due}
            onChange={(e) => setForm({ ...form, due: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium">
          Kunde
          <input
            className={`mt-1 ${inputCls}`}
            value={form.client}
            onChange={(e) => setForm({ ...form, client: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium">
          Projekt
          <select
            className={`mt-1 ${inputCls}`}
            value={form.project}
            onChange={(e) => setForm({ ...form, project: e.target.value })}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.name} className="bg-background">
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          Priorität
          <select
            className={`mt-1 ${inputCls}`}
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
          >
            {(["niedrig", "mittel", "hoch", "kritisch"] as Priority[]).map((p) => (
              <option key={p} value={p} className="bg-background">
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          Geschätzt (h)
          <input
            type="number"
            min="0.25"
            step="0.25"
            className={`mt-1 ${inputCls}`}
            value={form.estimated}
            onChange={(e) => setForm({ ...form, estimated: Number(e.target.value) })}
          />
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="h-9 rounded-md border border-border bg-secondary/40 px-4 text-sm hover:bg-secondary">
          Abbrechen
        </button>
        <button
          disabled={!valid}
          onClick={() => onSave(form)}
          className="h-9 rounded-md px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
          style={{ background: "var(--gradient-primary)" }}
        >
          Anlegen
        </button>
      </div>
    </Modal>
  );
}

function LogDialog({
  tasks,
  onClose,
  onSave,
}: {
  tasks: Task[];
  onClose: () => void;
  onSave: (l: TimeLog) => void;
}) {
  const [taskTitle, setTaskTitle] = useState(tasks[0]?.title ?? "");
  const [duration, setDuration] = useState(1);
  const client = tasks.find((t) => t.title === taskTitle)?.client ?? "";
  const time = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const valid = duration > 0 && taskTitle.trim().length > 1;

  return (
    <Modal title="Zeit erfassen" onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-xs font-medium">
          Aufgabe
          <select className={`mt-1 ${inputCls}`} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)}>
            {tasks.map((t) => (
              <option key={t.id} value={t.title} className="bg-background">
                {t.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium">
          Dauer (h)
          <input
            type="number"
            min="0.25"
            step="0.25"
            className={`mt-1 ${inputCls}`}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Buchung um {time} · Kunde: <span className="text-foreground">{client || "—"}</span>
        </p>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="h-9 rounded-md border border-border bg-secondary/40 px-4 text-sm hover:bg-secondary">
          Abbrechen
        </button>
        <button
          disabled={!valid}
          onClick={() => onSave({ time, task: taskTitle, duration, client })}
          className="h-9 rounded-md px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
          style={{ background: "var(--gradient-primary)" }}
        >
          Buchen
        </button>
      </div>
    </Modal>
  );
}
