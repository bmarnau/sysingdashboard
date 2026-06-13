import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Activity, Engineer, Project, WorkPackage } from "@/lib/dashboard-data";
import {
  EngineerPerformanceService,
  type MonthlyPerformance,
  type RangePreset,
} from "@/lib/engineer-performance";

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: "3m", label: "3 Monate" },
  { id: "6m", label: "6 Monate" },
  { id: "12m", label: "12 Monate" },
  { id: "ytd", label: "Akt. Jahr" },
  { id: "custom", label: "Individuell" },
];

const STORAGE_PRESET = "northbit-perf-preset";
const STORAGE_CUSTOM = "northbit-perf-custom";

function fmtH(v: number) {
  return `${v.toFixed(1)} h`;
}

function readStoredPreset(): RangePreset {
  if (typeof window === "undefined") return "12m";
  const v = window.localStorage.getItem(STORAGE_PRESET);
  if (v === "3m" || v === "6m" || v === "12m" || v === "ytd" || v === "custom") return v;
  return "12m";
}

function readStoredCustom(): { from: string; to: string } {
  const fallback = (() => {
    const d = new Date();
    const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { from, to: from };
  })();
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(STORAGE_CUSTOM);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as { from?: string; to?: string };
    if (parsed.from && parsed.to) return { from: parsed.from, to: parsed.to };
  } catch {
    /* ignore */
  }
  return fallback;
}

export interface PerformanceReportProps {
  activities: Activity[];
  workPackages: WorkPackage[];
  projects: Project[];
  engineer: Engineer;
  reference?: Date;
}

export function PerformanceReport({
  activities,
  workPackages,
  projects,
  engineer,
  reference,
}: PerformanceReportProps) {
  const [preset, setPreset] = useState<RangePreset>(() => readStoredPreset());
  const [custom, setCustom] = useState(() => readStoredCustom());
  const [detailMonth, setDetailMonth] = useState<MonthlyPerformance | null>(null);

  const cfg = useMemo(
    () => ({
      monthlyTargetHours: engineer.monthlyTargetHours,
      workloadPercent: engineer.workloadPercent,
    }),
    [engineer.monthlyTargetHours, engineer.workloadPercent],
  );

  const ref = reference ?? new Date();
  const range = useMemo(
    () => EngineerPerformanceService.resolveRange(preset, ref, custom),
    [preset, ref, custom],
  );

  const trend = useMemo(
    () => EngineerPerformanceService.getPerformanceTrend(activities, range.from, range.to, cfg),
    [activities, range, cfg],
  );

  const summary = useMemo(() => EngineerPerformanceService.summarize(trend), [trend]);

  const chartMax = Math.max(
    10,
    ...trend.map((m) => Math.max(m.targetHours, m.actualHours, m.billableHours)),
  );

  const handlePresetChange = (next: RangePreset) => {
    setPreset(next);
    try {
      window.localStorage.setItem(STORAGE_PRESET, next);
    } catch {
      /* ignore */
    }
  };

  const handleCustomChange = (key: "from" | "to", value: string) => {
    const next = { ...custom, [key]: value };
    setCustom(next);
    try {
      window.localStorage.setItem(STORAGE_CUSTOM, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="mb-8 rounded-2xl border border-border bg-secondary/20 p-5 sm:p-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            Leistungsreport
          </p>
          <h2 className="mt-1 text-lg font-semibold sm:text-xl">Persönlicher Leistungsreport</h2>
          <p className="text-xs text-muted-foreground">
            {trend.length} Monate · {summary.totalActual.toFixed(0)} h erfasst · Ø Auslastung{" "}
            {summary.avgUtilization.toFixed(1)} %
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 no-print">
          <div role="tablist" className="inline-flex rounded-lg border border-border bg-background p-1 text-xs">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={preset === p.id}
                onClick={() => handlePresetChange(p.id)}
                className={`rounded-md px-2.5 py-1.5 font-medium transition ${
                  preset === p.id
                    ? "bg-secondary text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="month"
                value={custom.from}
                onChange={(e) => handleCustomChange("from", e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2"
              />
              <span className="text-muted-foreground">bis</span>
              <input
                type="month"
                value={custom.to}
                onChange={(e) => handleCustomChange("to", e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2"
              />
            </div>
          )}
        </div>
      </header>

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Ø Auslastung" value={`${summary.avgUtilization.toFixed(1)} %`} tone="primary" />
        <Stat
          label="Ø Billable Quote"
          value={`${summary.avgBillableRatio.toFixed(1)} %`}
          tone="success"
        />
        <Stat
          label="Überstunden gesamt"
          value={`+${summary.overtime.toFixed(1)} h`}
          tone={summary.overtime > 0 ? "success" : "muted"}
        />
        <Stat
          label="Unterstunden gesamt"
          value={`${summary.undertime.toFixed(1)} h`}
          tone={summary.undertime < 0 ? "warning" : "muted"}
        />
        <Stat label="Gesamtstunden" value={`${summary.totalActual.toFixed(0)} h`} tone="info" />
      </div>

      {/* Chart */}
      <div className="mb-5 rounded-xl border border-border bg-background p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Monatsverlauf</h3>
          <Legend />
        </div>
        {trend.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Keine Daten für den gewählten Zeitraum.
          </p>
        ) : (
          <div className="flex h-44 items-end gap-2 overflow-x-auto">
            {trend.map((m) => (
              <button
                key={m.month}
                onClick={() => setDetailMonth(m)}
                className="group flex min-w-[42px] flex-1 flex-col items-center gap-1"
                title={`${m.label} · ${fmtH(m.actualHours)} / ${fmtH(m.targetHours)}`}
              >
                <div className="relative flex h-32 w-full items-end justify-center gap-0.5">
                  <Bar value={m.targetHours} max={chartMax} className="bg-muted-foreground/30" />
                  <Bar value={m.actualHours} max={chartMax} className="bg-primary/80 group-hover:bg-primary" />
                  <Bar value={m.billableHours} max={chartMax} className="bg-success/80 group-hover:bg-success" />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground">
                  {m.label.replace(" ", "\u00A0")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Monat</th>
                <th className="px-4 py-2.5 text-right">Soll</th>
                <th className="px-4 py-2.5 text-right">Ist</th>
                <th className="px-4 py-2.5 text-right">Billable</th>
                <th className="px-4 py-2.5 text-right">Non&nbsp;Billable</th>
                <th className="px-4 py-2.5 text-right">Differenz</th>
                <th className="px-4 py-2.5 text-right">Auslastung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {trend.map((m) => (
                <tr
                  key={m.month}
                  onClick={() => setDetailMonth(m)}
                  className="cursor-pointer transition hover:bg-secondary/30"
                >
                  <td className="px-4 py-2.5 font-medium">{m.label}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.targetHours.toFixed(1)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.actualHours.toFixed(1)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-success">
                    {m.billableHours.toFixed(1)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                    {m.nonBillableHours.toFixed(1)}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-mono ${
                      m.overtimeHours > 0
                        ? "text-success"
                        : m.overtimeHours < 0
                          ? "text-warning"
                          : "text-muted-foreground"
                    }`}
                  >
                    {m.overtimeHours > 0 ? "+" : ""}
                    {m.overtimeHours.toFixed(1)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {m.utilization.toFixed(1)} %
                  </td>
                </tr>
              ))}
              {trend.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    Keine Daten.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailMonth && (
        <MonthDetailDialog
          month={detailMonth}
          activities={activities}
          workPackages={workPackages}
          projects={projects}
          cfg={cfg}
          onClose={() => setDetailMonth(null)}
        />
      )}
    </section>
  );
}

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  const h = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return <div className={`w-2 rounded-t ${className}`} style={{ height: `${h}%` }} />;
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
      <LegendDot className="bg-muted-foreground/30" label="Soll" />
      <LegendDot className="bg-primary/80" label="Ist" />
      <LegendDot className="bg-success/80" label="Billable" />
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block size-2.5 rounded ${className}`} />
      {label}
    </span>
  );
}

function Stat({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "primary" | "success" | "warning" | "info" | "muted";
}) {
  const toneCls =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
        ? "text-success"
        : tone === "warning"
          ? "text-warning"
          : tone === "info"
            ? "text-info"
            : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-background px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-mono text-lg font-semibold ${toneCls}`}>{value}</p>
    </div>
  );
}

function MonthDetailDialog({
  month,
  activities,
  workPackages,
  projects,
  cfg,
  onClose,
}: {
  month: MonthlyPerformance;
  activities: Activity[];
  workPackages: WorkPackage[];
  projects: Project[];
  cfg: { monthlyTargetHours?: number; workloadPercent?: number };
  onClose: () => void;
}) {
  const detail = useMemo(
    () =>
      EngineerPerformanceService.getMonthDetail(
        activities,
        workPackages,
        projects,
        month.year,
        month.month0,
        cfg,
      ),
    [activities, workPackages, projects, month, cfg],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-background shadow-[var(--shadow-elevated)]">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
              Monatsdetail
            </p>
            <h3 className="text-lg font-semibold">{month.label}</h3>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-md hover:bg-secondary"
            aria-label="Schließen"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-4rem)] overflow-y-auto px-6 py-5">
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Soll" value={fmtH(detail.performance.targetHours)} />
            <Stat label="Ist" value={fmtH(detail.performance.actualHours)} tone="primary" />
            <Stat label="Billable" value={fmtH(detail.performance.billableHours)} tone="success" />
            <Stat
              label="Non Billable"
              value={fmtH(detail.performance.nonBillableHours)}
              tone="muted"
            />
            <Stat
              label="Differenz"
              value={`${detail.performance.overtimeHours > 0 ? "+" : ""}${detail.performance.overtimeHours.toFixed(1)} h`}
              tone={detail.performance.overtimeHours >= 0 ? "success" : "warning"}
            />
            <Stat
              label="Auslastung"
              value={`${detail.performance.utilization.toFixed(1)} %`}
              tone="info"
            />
            <Stat
              label="Billable Quote"
              value={`${detail.performance.billableRatio.toFixed(1)} %`}
              tone="info"
            />
            <Stat
              label="Arbeitstage"
              value={`${detail.performance.workingDays}`}
              tone="muted"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-border">
              <h4 className="border-b border-border px-4 py-2.5 text-sm font-semibold">
                Top 10 Projekte
              </h4>
              <ul className="divide-y divide-border text-sm">
                {detail.byProject.map((p) => (
                  <li
                    key={p.projectId ?? "__none__"}
                    className="flex items-center justify-between gap-3 px-4 py-2"
                  >
                    <span className="min-w-0 truncate">{p.projectName}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {p.hours.toFixed(1)} h · {p.billable.toFixed(1)} bill.
                    </span>
                  </li>
                ))}
                {detail.byProject.length === 0 && (
                  <li className="px-4 py-4 text-center text-muted-foreground">
                    Keine Projekte.
                  </li>
                )}
              </ul>
            </div>
            <div className="rounded-xl border border-border">
              <h4 className="border-b border-border px-4 py-2.5 text-sm font-semibold">
                Top 10 Kunden
              </h4>
              <ul className="divide-y divide-border text-sm">
                {detail.byClient.map((c) => (
                  <li
                    key={c.client}
                    className="flex items-center justify-between gap-3 px-4 py-2"
                  >
                    <span className="min-w-0 truncate">{c.client}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.hours.toFixed(1)} h · {c.billable.toFixed(1)} bill.
                    </span>
                  </li>
                ))}
                {detail.byClient.length === 0 && (
                  <li className="px-4 py-4 text-center text-muted-foreground">
                    Keine Kunden.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
