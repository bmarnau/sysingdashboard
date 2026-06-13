/**
 * TimePeriodService
 * Berechnet Soll-/Iststunden, Auslastung und Arbeitstage für Wochen- und Monatszeiträume.
 * Berücksichtigt deutsche Feiertage (national + bundesweit verbreitete) und Teilzeitmodelle.
 *
 * Zukünftige Funktionen (Forecasting, Kapazitätsplanung, Monatsreporting) bauen auf den
 * Methoden `getPeriodRange`, `getWorkingDaysOfMonth/Week`, `calculate*TargetHours` und
 * `calculateUtilization` auf.
 */

import type { Activity } from "@/lib/dashboard-data";

export type DashboardViewMode = "week" | "month";

export interface PeriodRange {
  start: Date; // inkl.
  end: Date; // exkl.
  label: string;
  shortLabel: string;
}

/* --------------------------------- Helpers --------------------------------- */

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Gauss/Anonymous-Algorithmus für Ostersonntag (gregorianisch). */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = März, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}

/**
 * Liefert die in Deutschland bundesweit gültigen gesetzlichen Feiertage.
 * (Regional begrenzte Feiertage wie Fronleichnam o. Reformationstag sind hier nicht enthalten,
 *  können künftig über ein `holidayRegion`-Feld am Engineer-Profil ergänzt werden.)
 */
export function germanHolidays(year: number): Date[] {
  const easter = easterSunday(year);
  return [
    new Date(year, 0, 1), // Neujahr
    addDays(easter, -2), // Karfreitag
    addDays(easter, 1), // Ostermontag
    new Date(year, 4, 1), // Tag der Arbeit
    addDays(easter, 39), // Christi Himmelfahrt
    addDays(easter, 50), // Pfingstmontag
    new Date(year, 9, 3), // Tag der Deutschen Einheit
    new Date(year, 11, 25), // 1. Weihnachtstag
    new Date(year, 11, 26), // 2. Weihnachtstag
  ];
}

function isHoliday(date: Date, holidays: Date[]): boolean {
  return holidays.some((h) => sameDay(h, date));
}

function isWorkday(date: Date, holidays: Date[]): boolean {
  const dow = date.getDay(); // 0 = So, 6 = Sa
  if (dow === 0 || dow === 6) return false;
  return !isHoliday(date, holidays);
}

/* ------------------------------ ISO week math ----------------------------- */

export function startOfISOWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  return d;
}

export function getISOWeek(date: Date): number {
  const tmp = new Date(date.getTime());
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
  const yearStart = new Date(tmp.getFullYear(), 0, 1);
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getISOWeekYear(date: Date): number {
  const tmp = new Date(date.getTime());
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
  return tmp.getFullYear();
}

/* ----------------------------- Working day APIs ---------------------------- */

export function getWorkingDaysOfMonth(year: number, month0: number): Date[] {
  const holidays = germanHolidays(year);
  const days: Date[] = [];
  const last = new Date(year, month0 + 1, 0).getDate();
  for (let d = 1; d <= last; d++) {
    const date = new Date(year, month0, d);
    if (isWorkday(date, holidays)) days.push(date);
  }
  return days;
}

export function getWorkingDaysOfWeek(reference: Date): Date[] {
  const holidays = germanHolidays(reference.getFullYear());
  const start = startOfISOWeek(reference);
  const days: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const d = addDays(start, i);
    if (isWorkday(d, holidays)) days.push(d);
  }
  return days;
}

/* ----------------------------- Target hour math ---------------------------- */

const DEFAULT_FULLTIME_MONTH_HOURS = 168;

export interface TargetConfig {
  /** Vollzeit-Monatssollstunden (default 168). Führende Vorgabe. */
  monthlyTargetHours?: number;
  /** Arbeitszeitmodell 0–100 (% Vollzeit). Default 100. */
  workloadPercent?: number;
}

/** Liefert Sollstunden für einen einzelnen Kalendertag (0 an arbeitsfreien Tagen). */
export type DailyTargetFn = (date: Date) => number;

/** Akzeptiert sowohl die neue Tages-Quelle als auch die Legacy-Konfiguration. */
export type TargetInput = TargetConfig | DailyTargetFn;

function effectiveMonthly(cfg: TargetConfig): number {
  const base = cfg.monthlyTargetHours ?? DEFAULT_FULLTIME_MONTH_HOURS;
  const pct = (cfg.workloadPercent ?? 100) / 100;
  return +(base * pct).toFixed(2);
}

function configToDailySource(cfg: TargetConfig): DailyTargetFn {
  const monthly = effectiveMonthly(cfg);
  const holidaysCache = new Map<number, Date[]>();
  return (date: Date) => {
    const dow = date.getDay();
    if (dow === 0 || dow === 6) return 0;
    const y = date.getFullYear();
    let hs = holidaysCache.get(y);
    if (!hs) {
      hs = germanHolidays(y);
      holidaysCache.set(y, hs);
    }
    if (hs.some((h) => sameDay(h, date))) return 0;
    const monthDays = getWorkingDaysOfMonth(y, date.getMonth());
    if (monthDays.length === 0) return 0;
    return monthly / monthDays.length;
  };
}

export function toDailyTargetFn(input: TargetInput): DailyTargetFn {
  return typeof input === "function" ? input : configToDailySource(input);
}

function sumOverRange(source: DailyTargetFn, startIncl: Date, endExcl: Date): number {
  let sum = 0;
  const d = new Date(startIncl.getFullYear(), startIncl.getMonth(), startIncl.getDate());
  while (d < endExcl) {
    sum += source(d);
    d.setDate(d.getDate() + 1);
  }
  return +sum.toFixed(2);
}

/** Monats-Sollstunden – Tag-für-Tag aus der Quelle aufsummiert. */
export function calculateMonthlyTargetHours(
  year: number,
  month0: number,
  input: TargetInput,
): number {
  const source = toDailyTargetFn(input);
  return sumOverRange(source, new Date(year, month0, 1), new Date(year, month0 + 1, 1));
}

/**
 * Wochen-Sollstunden für die ISO-Woche, in der das Referenzdatum liegt.
 * Tag-für-Tag aus der Quelle aufsummiert – wechselt das Modell innerhalb der
 * Woche, wird automatisch anteilig gerechnet.
 */
export function calculateWeeklyTargetHours(reference: Date, input: TargetInput): number {
  const start = startOfISOWeek(reference);
  const end = addDays(start, 7);
  return sumOverRange(toDailyTargetFn(input), start, end);
}

/* ----------------------------- Period selection --------------------------- */

export function getCurrentPeriod(mode: DashboardViewMode, ref: Date): PeriodRange {
  if (mode === "month") {
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
    const label = start.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    const shortLabel = start.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
    return { start, end, label, shortLabel };
  }
  const start = startOfISOWeek(ref);
  const end = addDays(start, 7);
  const kw = getISOWeek(ref);
  const yr = getISOWeekYear(ref);
  const label = `KW ${kw} / ${yr}`;
  return { start, end, label, shortLabel: `KW ${kw}` };
}

export function getPeriodRangeByKey(mode: DashboardViewMode, key: string): PeriodRange | null {
  if (mode === "month") {
    // key = "YYYY-MM"
    const m = /^(\d{4})-(\d{2})$/.exec(key);
    if (!m) return null;
    const ref = new Date(Number(m[1]), Number(m[2]) - 1, 1);
    return getCurrentPeriod("month", ref);
  }
  // key = "YYYY-Www" (ISO week)
  const m = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  // 4. Januar liegt per ISO immer in KW 1
  const jan4 = new Date(year, 0, 4);
  const week1Start = startOfISOWeek(jan4);
  const start = addDays(week1Start, (week - 1) * 7);
  return getCurrentPeriod("week", start);
}

export function periodKey(mode: DashboardViewMode, ref: Date): string {
  if (mode === "month") {
    return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${getISOWeekYear(ref)}-W${String(getISOWeek(ref)).padStart(2, "0")}`;
}

/* ----------------------------- Activity buckets --------------------------- */

export function sumActivitiesInRange(activities: Activity[], range: PeriodRange) {
  let hours = 0;
  let billable = 0;
  for (const a of activities) {
    if (!a.date) continue;
    const d = new Date(a.date);
    if (Number.isNaN(d.getTime())) continue;
    if (d < range.start || d >= range.end) continue;
    const dur = Number(a.duration) || 0;
    hours += dur;
    if (a.billable) billable += dur;
  }
  return { hours: +hours.toFixed(2), billable: +billable.toFixed(2) };
}

export interface ChartBucket {
  key: string;
  label: string;
  hours: number;
  billable: number;
}

/** Diagrammbuckets passend zum Modus: Wochentage (Woche) oder ISO-Wochen (Monat). */
export function buildChartBuckets(
  activities: Activity[],
  mode: DashboardViewMode,
  ref: Date,
): ChartBucket[] {
  if (mode === "week") {
    const start = startOfISOWeek(ref);
    const labels = ["Mo", "Di", "Mi", "Do", "Fr"];
    const buckets: ChartBucket[] = labels.map((label, i) => ({
      key: toISODate(addDays(start, i)),
      label,
      hours: 0,
      billable: 0,
    }));
    for (const a of activities) {
      if (!a.date) continue;
      const d = new Date(a.date);
      if (Number.isNaN(d.getTime())) continue;
      const diff = Math.floor((+d - +start) / 86400000);
      if (diff < 0 || diff > 4) continue;
      const dur = Number(a.duration) || 0;
      buckets[diff].hours = +(buckets[diff].hours + dur).toFixed(2);
      if (a.billable) buckets[diff].billable = +(buckets[diff].billable + dur).toFixed(2);
    }
    return buckets;
  }
  // month: ISO-Wochen im Monat
  const year = ref.getFullYear();
  const month0 = ref.getMonth();
  const first = new Date(year, month0, 1);
  const last = new Date(year, month0 + 1, 0);
  const weeks = new Map<string, ChartBucket>();
  for (let d = new Date(first); d <= last; d = addDays(d, 1)) {
    const kw = getISOWeek(d);
    const yr = getISOWeekYear(d);
    const key = `${yr}-W${String(kw).padStart(2, "0")}`;
    if (!weeks.has(key)) {
      weeks.set(key, { key, label: `KW ${kw}`, hours: 0, billable: 0 });
    }
  }
  for (const a of activities) {
    if (!a.date) continue;
    const d = new Date(a.date);
    if (Number.isNaN(d.getTime())) continue;
    if (d < first || d > last) continue;
    const key = `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, "0")}`;
    const b = weeks.get(key);
    if (!b) continue;
    const dur = Number(a.duration) || 0;
    b.hours = +(b.hours + dur).toFixed(2);
    if (a.billable) b.billable = +(b.billable + dur).toFixed(2);
  }
  return [...weeks.values()];
}

/* ----------------------------- Utilization -------------------------------- */

export function calculateUtilization(actual: number, target: number): number {
  if (!(target > 0)) return 0;
  return +((actual / target) * 100).toFixed(1);
}

/* --------------------------- Aggregated facade ---------------------------- */

export interface PeriodMetrics {
  mode: DashboardViewMode;
  range: PeriodRange;
  target: number;
  actual: number;
  billable: number;
  utilization: number; // %
  diff: number; // actual - target
  workingDays: number;
}

export function computePeriodMetrics(
  activities: Activity[],
  mode: DashboardViewMode,
  ref: Date,
  cfg: TargetConfig,
): PeriodMetrics {
  const range = getCurrentPeriod(mode, ref);
  const target =
    mode === "month"
      ? calculateMonthlyTargetHours(ref.getFullYear(), ref.getMonth(), cfg)
      : calculateWeeklyTargetHours(ref, cfg);
  const workingDays =
    mode === "month"
      ? getWorkingDaysOfMonth(ref.getFullYear(), ref.getMonth()).length
      : getWorkingDaysOfWeek(ref).length;
  const { hours, billable } = sumActivitiesInRange(activities, range);
  return {
    mode,
    range,
    target,
    actual: hours,
    billable,
    utilization: calculateUtilization(hours, target),
    diff: +(hours - target).toFixed(2),
    workingDays,
  };
}

export const TimePeriodService = {
  calculateMonthlyTargetHours,
  calculateWeeklyTargetHours,
  getWorkingDaysOfMonth,
  getWorkingDaysOfWeek,
  calculateUtilization,
  getCurrentPeriod,
  getPeriodRangeByKey,
  periodKey,
  sumActivitiesInRange,
  buildChartBuckets,
  computePeriodMetrics,
  germanHolidays,
};
