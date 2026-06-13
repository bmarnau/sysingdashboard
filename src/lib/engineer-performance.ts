/**
 * EngineerPerformanceService
 * Zentrale Berechnung der monatsübergreifenden Leistungsdaten eines Systemingenieurs.
 * Wird im Dashboard und später im PDF-Reporting verwendet.
 */

import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";
import {
  calculateMonthlyTargetHours,
  calculateUtilization,
  getWorkingDaysOfMonth,
  type TargetInput,
} from "@/lib/time-period";

export interface MonthlyPerformance {
  /** ISO-Schlüssel YYYY-MM */
  month: string;
  /** Anzeige-Label (z. B. "Jan 2026") */
  label: string;
  year: number;
  month0: number; // 0-11
  targetHours: number;
  actualHours: number;
  billableHours: number;
  nonBillableHours: number;
  /** actualHours - targetHours (positiv = Überstunden, negativ = Unterstunden) */
  overtimeHours: number;
  utilization: number; // %
  billableRatio: number; // %
  workingDays: number;
  /** Anzahl Tätigkeiten im Monat */
  activityCount: number;
}

export interface PerformanceTrendSummary {
  totalTarget: number;
  totalActual: number;
  totalBillable: number;
  totalNonBillable: number;
  overtime: number; // Summe positiver Differenzen
  undertime: number; // Summe negativer Differenzen (negativ)
  avgUtilization: number; // %
  avgBillableRatio: number; // %
  months: number;
}

export interface MonthDetail {
  performance: MonthlyPerformance;
  byClient: Array<{ client: string; hours: number; billable: number; amount: number }>;
  byProject: Array<{
    projectId: string | null;
    projectName: string;
    hours: number;
    billable: number;
  }>;
  activities: Activity[];
}

/* ---------------------------- internal helpers ---------------------------- */

function monthKey(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}`;
}

function monthLabel(year: number, month0: number): string {
  return new Date(year, month0, 1).toLocaleDateString("de-DE", {
    month: "short",
    year: "numeric",
  });
}

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ---------------------------- calculation API ----------------------------- */

function calculateActualHours(activities: Activity[], year: number, month0: number): number {
  let sum = 0;
  for (const a of activities) {
    const d = parseDate(a.date);
    if (!d) continue;
    if (d.getFullYear() !== year || d.getMonth() !== month0) continue;
    sum += Number(a.duration) || 0;
  }
  return +sum.toFixed(2);
}

function calculateBillableHours(activities: Activity[], year: number, month0: number): number {
  let sum = 0;
  for (const a of activities) {
    if (!a.billable) continue;
    const d = parseDate(a.date);
    if (!d) continue;
    if (d.getFullYear() !== year || d.getMonth() !== month0) continue;
    sum += Number(a.duration) || 0;
  }
  return +sum.toFixed(2);
}

function calculateNonBillableHours(
  activities: Activity[],
  year: number,
  month0: number,
): number {
  let sum = 0;
  for (const a of activities) {
    if (a.billable) continue;
    const d = parseDate(a.date);
    if (!d) continue;
    if (d.getFullYear() !== year || d.getMonth() !== month0) continue;
    sum += Number(a.duration) || 0;
  }
  return +sum.toFixed(2);
}

function calculateBillableRatio(actual: number, billable: number): number {
  if (!(actual > 0)) return 0;
  return +((billable / actual) * 100).toFixed(1);
}

function getMonthlyPerformance(
  activities: Activity[],
  year: number,
  month0: number,
  cfg: TargetInput,
): MonthlyPerformance {
  const target = calculateMonthlyTargetHours(year, month0, cfg);
  const actual = calculateActualHours(activities, year, month0);
  const billable = calculateBillableHours(activities, year, month0);
  const nonBillable = +(actual - billable).toFixed(2);
  const overtime = +(actual - target).toFixed(2);
  const workingDays = getWorkingDaysOfMonth(year, month0).length;
  const activityCount = activities.filter((a) => {
    const d = parseDate(a.date);
    return d && d.getFullYear() === year && d.getMonth() === month0;
  }).length;
  return {
    month: monthKey(year, month0),
    label: monthLabel(year, month0),
    year,
    month0,
    targetHours: target,
    actualHours: actual,
    billableHours: billable,
    nonBillableHours: nonBillable,
    overtimeHours: overtime,
    utilization: calculateUtilization(actual, target),
    billableRatio: calculateBillableRatio(actual, billable),
    workingDays,
    activityCount,
  };
}

/** Liste der Monatsdaten im Zeitraum [from .. to] (inklusive Endmonat). */
function getPerformanceTrend(
  activities: Activity[],
  from: { year: number; month0: number },
  to: { year: number; month0: number },
  cfg: TargetInput,
): MonthlyPerformance[] {
  const out: MonthlyPerformance[] = [];
  let y = from.year;
  let m = from.month0;
  // Hard cap: 25 Jahre Historie schützt vor Endlosschleifen bei kaputten Eingaben.
  for (let safety = 0; safety < 25 * 12; safety++) {
    out.push(getMonthlyPerformance(activities, y, m, cfg));
    if (y === to.year && m === to.month0) break;
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  return out;
}

function summarize(trend: MonthlyPerformance[]): PerformanceTrendSummary {
  let target = 0,
    actual = 0,
    billable = 0,
    nonBillable = 0,
    overtime = 0,
    undertime = 0;
  for (const m of trend) {
    target += m.targetHours;
    actual += m.actualHours;
    billable += m.billableHours;
    nonBillable += m.nonBillableHours;
    if (m.overtimeHours > 0) overtime += m.overtimeHours;
    else undertime += m.overtimeHours;
  }
  const avgUtilization = target > 0 ? +((actual / target) * 100).toFixed(1) : 0;
  const avgBillableRatio = actual > 0 ? +((billable / actual) * 100).toFixed(1) : 0;
  return {
    totalTarget: +target.toFixed(2),
    totalActual: +actual.toFixed(2),
    totalBillable: +billable.toFixed(2),
    totalNonBillable: +nonBillable.toFixed(2),
    overtime: +overtime.toFixed(2),
    undertime: +undertime.toFixed(2),
    avgUtilization,
    avgBillableRatio,
    months: trend.length,
  };
}

/* ----------------------------- month detail ------------------------------ */

function getMonthDetail(
  activities: Activity[],
  workPackages: WorkPackage[],
  projects: Project[],
  year: number,
  month0: number,
  cfg: TargetInput,
): MonthDetail {
  const perf = getMonthlyPerformance(activities, year, month0, cfg);
  const monthActs = activities.filter((a) => {
    const d = parseDate(a.date);
    return d && d.getFullYear() === year && d.getMonth() === month0;
  });

  const wpToProj = new Map(workPackages.map((w) => [w.id, w.projectId ?? null] as const));
  const projMap = new Map(projects.map((p) => [p.id, p]));

  const clientMap = new Map<string, { hours: number; billable: number; amount: number }>();
  const projectMap = new Map<string, { projectId: string | null; projectName: string; hours: number; billable: number }>();

  for (const a of monthActs) {
    const dur = Number(a.duration) || 0;
    const client = a.client ?? "Ohne Kunde";
    const c = clientMap.get(client) ?? { hours: 0, billable: 0, amount: 0 };
    c.hours += dur;
    if (a.billable) {
      c.billable += dur;
      c.amount += dur * (Number(a.hourlyRate) || 0);
    }
    clientMap.set(client, c);

    const projId = a.workPackageId ? wpToProj.get(a.workPackageId) ?? null : null;
    const projName = projId ? projMap.get(projId)?.name ?? "Unbekannt" : "Ohne Projekt";
    const pkey = projId ?? "__none__";
    const p = projectMap.get(pkey) ?? {
      projectId: projId,
      projectName: projName,
      hours: 0,
      billable: 0,
    };
    p.hours += dur;
    if (a.billable) p.billable += dur;
    projectMap.set(pkey, p);
  }

  return {
    performance: perf,
    byClient: [...clientMap.entries()]
      .map(([client, v]) => ({
        client,
        hours: +v.hours.toFixed(2),
        billable: +v.billable.toFixed(2),
        amount: +v.amount.toFixed(2),
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10),
    byProject: [...projectMap.values()]
      .map((p) => ({
        ...p,
        hours: +p.hours.toFixed(2),
        billable: +p.billable.toFixed(2),
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10),
    activities: monthActs,
  };
}

/* --------------------------- range presets ------------------------------- */

export type RangePreset = "3m" | "6m" | "12m" | "ytd" | "custom";

export function resolveRange(
  preset: RangePreset,
  reference: Date,
  custom?: { from: string; to: string },
): { from: { year: number; month0: number }; to: { year: number; month0: number } } {
  const refY = reference.getFullYear();
  const refM = reference.getMonth();
  if (preset === "ytd") {
    return { from: { year: refY, month0: 0 }, to: { year: refY, month0: refM } };
  }
  if (preset === "custom" && custom) {
    const f = /^(\d{4})-(\d{2})$/.exec(custom.from);
    const t = /^(\d{4})-(\d{2})$/.exec(custom.to);
    if (f && t) {
      return {
        from: { year: Number(f[1]), month0: Number(f[2]) - 1 },
        to: { year: Number(t[1]), month0: Number(t[2]) - 1 },
      };
    }
  }
  const months = preset === "3m" ? 3 : preset === "6m" ? 6 : 12;
  const fromDate = new Date(refY, refM - (months - 1), 1);
  return {
    from: { year: fromDate.getFullYear(), month0: fromDate.getMonth() },
    to: { year: refY, month0: refM },
  };
}

export const EngineerPerformanceService = {
  getMonthlyPerformance,
  calculateMonthlyTargetHours,
  calculateActualHours,
  calculateBillableHours,
  calculateNonBillableHours,
  calculateUtilization,
  calculateBillableRatio,
  getPerformanceTrend,
  summarize,
  getMonthDetail,
  resolveRange,
};
