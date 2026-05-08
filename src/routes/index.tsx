import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  FolderKanban,
  Search,
  Server,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  engineer,
  tasks,
  projects,
  weeklyHours,
  recentLogs,
  type Priority,
  type TaskStatus,
} from "@/lib/dashboard-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Engineer Dashboard – NorthBit IT" },
      { name: "description", content: "Aufgaben, Projekte und Aufwände eines Systems Engineers im IT-Systemhaus." },
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

const projectStatusStyles: Record<string, string> = {
  on_track: "bg-success/15 text-success border-success/30",
  at_risk: "bg-warning/15 text-warning border-warning/30",
  delayed: "bg-destructive/15 text-destructive border-destructive/30",
  abgeschlossen: "bg-muted text-muted-foreground border-border",
};

const projectStatusLabel: Record<string, string> = {
  on_track: "Im Plan",
  at_risk: "Risiko",
  delayed: "Verzug",
  abgeschlossen: "Fertig",
};

function Dashboard() {
  const totalSpent = tasks.reduce((s, t) => s + t.spent, 0);
  const totalEstimated = tasks.reduce((s, t) => s + t.estimated, 0);
  const openTasks = tasks.filter((t) => t.status !== "erledigt").length;
  const criticalTasks = tasks.filter((t) => t.priority === "kritisch" && t.status !== "erledigt").length;
  const activeProjects = projects.filter((p) => p.status !== "abgeschlossen").length;
  const billableThisWeek = weeklyHours.reduce((s, d) => s + d.billable, 0);
  const maxHours = Math.max(...weeklyHours.map((d) => d.hours), 10);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-6">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
              <Server className="size-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">NorthBit</p>
              <p className="text-sm font-semibold">Engineer Console</p>
            </div>
          </div>

          <div className="relative ml-4 hidden flex-1 max-w-md md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Tickets, Kunden, Projekte suchen…"
              className="h-10 w-full rounded-lg border border-input bg-secondary/40 pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:bg-secondary/70"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
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

      <main className="mx-auto max-w-[1600px] px-6 py-8">
        {/* Hero / greeting */}
        <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              KW 19 · Freitag, 8. Mai 2026
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Guten Morgen, Markus.
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {openTasks} offene Aufgaben · {activeProjects} aktive Projekte ·{" "}
              <span className="text-warning">{criticalTasks} kritisch</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-10 rounded-lg border border-border bg-secondary/40 px-4 text-sm font-medium transition hover:bg-secondary">
              Zeit erfassen
            </button>
            <button
              className="h-10 rounded-lg px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:opacity-90"
              style={{ background: "var(--gradient-primary)" }}
            >
              + Neues Ticket
            </button>
          </div>
        </section>

        {/* KPI cards */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<Clock className="size-5" />}
            label="Aufwand diese Woche"
            value={`${engineer.weeklyLogged} h`}
            sub={`Ziel ${engineer.weeklyTarget} h`}
            progress={(engineer.weeklyLogged / engineer.weeklyTarget) * 100}
          />
          <KpiCard
            icon={<TrendingUp className="size-5" />}
            label="Verrechenbar (KW)"
            value={`${billableThisWeek.toFixed(1)} h`}
            sub={`${Math.round((billableThisWeek / engineer.weeklyLogged) * 100)}% Billable Ratio`}
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
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold">Meine Aufgaben</h2>
                  <p className="text-xs text-muted-foreground">Aktuelle Tickets & Changes</p>
                </div>
                <div className="flex gap-1 rounded-lg border border-border bg-secondary/40 p-1 text-xs">
                  {["Alle", "Heute", "Diese Woche"].map((f, i) => (
                    <button
                      key={f}
                      className={`rounded-md px-3 py-1.5 transition ${
                        i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divide-y divide-border">
                {tasks.map((t) => {
                  const overrun = t.spent > t.estimated;
                  const pct = Math.min((t.spent / t.estimated) * 100, 100);
                  return (
                    <div key={t.id} className="group grid grid-cols-12 items-center gap-3 px-6 py-4 transition hover:bg-secondary/30">
                      <div className="col-span-12 md:col-span-6">
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
                        <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${statusStyles[t.status]}`}>
                          {statusLabel[t.status]}
                        </span>
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <div className="flex items-baseline gap-1 font-mono text-sm">
                          <span className={overrun ? "text-destructive font-semibold" : "text-foreground"}>{t.spent}h</span>
                          <span className="text-xs text-muted-foreground">/ {t.estimated}h</span>
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
                      <div className="col-span-6 text-right md:col-span-2">
                        <p className="font-mono text-xs text-muted-foreground">Fällig</p>
                        <p className="text-sm font-medium">
                          {new Date(t.due).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>

          {/* Right column */}
          <section className="space-y-6">
            {/* Weekly hours */}
            <Card>
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold">Aufwände dieser Woche</h2>
                <p className="text-xs text-muted-foreground">Erfasst vs. verrechenbar</p>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-end justify-between gap-3 h-40">
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

            {/* Recent logs */}
            <Card>
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold">Heutige Zeitbuchungen</h2>
                <p className="text-xs text-muted-foreground">
                  {recentLogs.reduce((s, l) => s + l.duration, 0)} h erfasst
                </p>
              </div>
              <ul className="divide-y divide-border">
                {recentLogs.map((l, i) => (
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
                <p className="text-xs text-muted-foreground">Budget, Fortschritt und Status auf einen Blick</p>
              </div>
              <button className="text-xs font-medium text-primary hover:underline">Alle anzeigen →</button>
            </div>
            <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-2 xl:grid-cols-3">
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
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${p.progress}%`, background: "var(--gradient-primary)" }}
                        />
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
                          <div
                            key={m}
                            className="grid size-7 place-items-center rounded-full border-2 border-card bg-secondary font-mono text-[10px] font-bold"
                          >
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
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-elevated)]"
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
      className="relative overflow-hidden rounded-2xl border border-border p-5 shadow-[var(--shadow-elevated)]"
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
