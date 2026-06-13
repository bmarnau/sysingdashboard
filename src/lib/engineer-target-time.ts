/**
 * EngineerTargetTimeService
 *
 * Verwaltet zeitlich gestaffelte Arbeitszeitmodelle pro Systemingenieur.
 * Liefert eine tagesbasierte "DailyTargetFn", aus der alle übergeordneten
 * Soll-Berechnungen (Woche, Monat, mehrmonatiger Report, Export, PDF) abgeleitet
 * werden. Dadurch ist ein Modellwechsel mitten in einem Monat automatisch
 * arbeitstags-anteilig korrekt.
 */

import type { Engineer } from "@/lib/dashboard-data";
import {
  getWorkingDaysOfMonth,
  getWorkingDaysOfWeek,
  germanHolidays,
} from "@/lib/time-period";

export type TargetTimeBase = "monthly" | "weekly";

export interface EngineerTargetTimeModel {
  id: string;
  engineerId: string;
  targetTimeBase: TargetTimeBase;
  monthlyTargetHours?: number;
  weeklyTargetHours?: number;
  validFrom: string; // YYYY-MM-DD
  validUntil?: string; // YYYY-MM-DD (inkl.); fehlt ⇒ offen
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type DailyTargetFn = (date: Date) => number;

export interface TargetModelValidationError {
  modelId?: string;
  field?: keyof EngineerTargetTimeModel | "overlap";
  message: string;
}

const STORAGE_KEY = "northbit-target-time-models";

/* ------------------------------- Persistence ------------------------------ */

export function loadTargetTimeModels(): EngineerTargetTimeModel[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidShape);
  } catch {
    return [];
  }
}

export function saveTargetTimeModels(models: EngineerTargetTimeModel[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
  } catch {
    /* ignore quota */
  }
}

function isValidShape(m: unknown): m is EngineerTargetTimeModel {
  if (!m || typeof m !== "object") return false;
  const x = m as Record<string, unknown>;
  return (
    typeof x.id === "string" &&
    typeof x.engineerId === "string" &&
    (x.targetTimeBase === "monthly" || x.targetTimeBase === "weekly") &&
    typeof x.validFrom === "string"
  );
}

/* --------------------------------- Helpers -------------------------------- */

function parseISO(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s + (s.length === 10 ? "T00:00:00" : ""));
  return Number.isNaN(d.getTime()) ? null : d;
}

function isWorkdayDate(date: Date): boolean {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return false;
  const holidays = germanHolidays(date.getFullYear());
  return !holidays.some(
    (h) =>
      h.getFullYear() === date.getFullYear() &&
      h.getMonth() === date.getMonth() &&
      h.getDate() === date.getDate(),
  );
}

function modelCoversDate(m: EngineerTargetTimeModel, date: Date): boolean {
  const from = parseISO(m.validFrom);
  if (!from) return false;
  if (date < from) return false;
  if (m.validUntil) {
    const until = parseISO(m.validUntil);
    if (until && date > until) return false;
  }
  return true;
}

/* ----------------------------- Lookup & Active ---------------------------- */

export function getActiveTargetTimeModel(
  models: EngineerTargetTimeModel[],
  date: Date,
  engineerId = "self",
): EngineerTargetTimeModel | null {
  // jüngstes validFrom gewinnt, falls (durch Migration) Mehrfachtreffer
  const matches = models
    .filter((m) => m.engineerId === engineerId && modelCoversDate(m, date))
    .sort((a, b) => b.validFrom.localeCompare(a.validFrom));
  return matches[0] ?? null;
}

/* ------------------------------- Conversions ------------------------------ */

/** Wochensollzeit aus einer Monatssollzeit für eine konkrete Referenzwoche. */
export function calculateWeeklyTargetFromMonthly(
  monthlyHours: number,
  reference: Date,
): number {
  let sum = 0;
  const weekDays = getWorkingDaysOfWeek(reference);
  for (const d of weekDays) {
    const md = getWorkingDaysOfMonth(d.getFullYear(), d.getMonth());
    if (md.length === 0) continue;
    sum += monthlyHours / md.length;
  }
  return +sum.toFixed(2);
}

/** Monatssollzeit aus einer Wochensollzeit für einen konkreten Referenzmonat. */
export function calculateMonthlyTargetFromWeekly(
  weeklyHours: number,
  year: number,
  month0: number,
): number {
  const monthDays = getWorkingDaysOfMonth(year, month0);
  let sum = 0;
  for (const d of monthDays) {
    const ww = getWorkingDaysOfWeek(d);
    if (ww.length === 0) continue;
    sum += weeklyHours / ww.length;
  }
  return +sum.toFixed(2);
}

/** Liefert ein abgeleitetes Wochen-/Monatssoll für ein Modell zum Stichtag. */
export function deriveCounterpart(
  model: EngineerTargetTimeModel,
  reference: Date,
): { monthlyHours: number; weeklyHours: number } {
  if (model.targetTimeBase === "monthly") {
    const monthly = model.monthlyTargetHours ?? 0;
    return {
      monthlyHours: monthly,
      weeklyHours: calculateWeeklyTargetFromMonthly(monthly, reference),
    };
  }
  const weekly = model.weeklyTargetHours ?? 0;
  return {
    monthlyHours: calculateMonthlyTargetFromWeekly(
      weekly,
      reference.getFullYear(),
      reference.getMonth(),
    ),
    weeklyHours: weekly,
  };
}

/* ---------------------------- Daily target API ---------------------------- */

/** Tagessoll laut Modell für einen konkreten Arbeitstag. */
export function calculateDailyTargetHours(
  model: EngineerTargetTimeModel,
  date: Date,
): number {
  if (!isWorkdayDate(date)) return 0;
  if (model.targetTimeBase === "monthly") {
    const monthDays = getWorkingDaysOfMonth(date.getFullYear(), date.getMonth());
    if (monthDays.length === 0) return 0;
    return (model.monthlyTargetHours ?? 0) / monthDays.length;
  }
  const weekDays = getWorkingDaysOfWeek(date);
  if (weekDays.length === 0) return 0;
  return (model.weeklyTargetHours ?? 0) / weekDays.length;
}

/**
 * Erzeugt eine DailyTargetFn:
 *  - Bei vorhandenen Modellen wird das aktive Modell des Tages verwendet.
 *  - Existiert für ein Datum kein Modell, greift `fallback` (Legacy-Profil).
 */
export function buildDailyTargetFn(
  models: EngineerTargetTimeModel[],
  fallback?: { monthlyTargetHours?: number; workloadPercent?: number },
  engineerId = "self",
): DailyTargetFn {
  const effective = (fallback?.monthlyTargetHours ?? 168) *
    ((fallback?.workloadPercent ?? 100) / 100);
  return (date: Date) => {
    if (!isWorkdayDate(date)) return 0;
    const active = getActiveTargetTimeModel(models, date, engineerId);
    if (active) return calculateDailyTargetHours(active, date);
    // Fallback: Legacy-Verteilung Monatssoll / Arbeitstage
    const monthDays = getWorkingDaysOfMonth(date.getFullYear(), date.getMonth());
    if (monthDays.length === 0) return 0;
    return effective / monthDays.length;
  };
}

/** Convenience: aus dem Engineer-Profil + Modellen direkt eine Quelle bauen. */
export function buildDailyTargetFnFromEngineer(
  engineer: Engineer,
  models: EngineerTargetTimeModel[],
  engineerId = "self",
): DailyTargetFn {
  return buildDailyTargetFn(
    models,
    {
      monthlyTargetHours: engineer.monthlyTargetHours,
      workloadPercent: engineer.workloadPercent,
    },
    engineerId,
  );
}

/* -------------------------- Range aggregation API ------------------------- */

export function sumTargetInRange(
  source: DailyTargetFn,
  startIncl: Date,
  endExcl: Date,
): number {
  let sum = 0;
  for (
    let d = new Date(startIncl.getFullYear(), startIncl.getMonth(), startIncl.getDate());
    d < endExcl;
    d.setDate(d.getDate() + 1)
  ) {
    sum += source(d);
  }
  return +sum.toFixed(2);
}

export function getTargetHoursForMonth(
  source: DailyTargetFn,
  year: number,
  month0: number,
): number {
  return sumTargetInRange(
    source,
    new Date(year, month0, 1),
    new Date(year, month0 + 1, 1),
  );
}

export function getTargetHoursForWeek(source: DailyTargetFn, anyDateInWeek: Date): number {
  const day = anyDateInWeek.getDay() || 7;
  const start = new Date(
    anyDateInWeek.getFullYear(),
    anyDateInWeek.getMonth(),
    anyDateInWeek.getDate() - (day - 1),
  );
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  return sumTargetInRange(source, start, end);
}

/* -------------------------------- Validation ------------------------------ */

export function validateTargetTimeModel(
  m: EngineerTargetTimeModel,
  others: EngineerTargetTimeModel[],
): TargetModelValidationError[] {
  const errs: TargetModelValidationError[] = [];

  if (m.targetTimeBase === "monthly") {
    if (!(Number(m.monthlyTargetHours) > 0)) {
      errs.push({
        modelId: m.id,
        field: "monthlyTargetHours",
        message: "Bitte geben Sie eine Monatssollzeit ein.",
      });
    }
  } else {
    if (!(Number(m.weeklyTargetHours) > 0)) {
      errs.push({
        modelId: m.id,
        field: "weeklyTargetHours",
        message: "Bitte geben Sie eine Wochensollzeit ein.",
      });
    }
  }

  const from = parseISO(m.validFrom);
  const until = m.validUntil ? parseISO(m.validUntil) : null;
  if (!from) {
    errs.push({ modelId: m.id, field: "validFrom", message: "Gültig-ab-Datum erforderlich." });
  }
  if (from && until && until < from) {
    errs.push({
      modelId: m.id,
      field: "validUntil",
      message: "Das Gültig-ab-Datum darf nicht nach dem Gültig-bis-Datum liegen.",
    });
  }

  // Überlappung mit anderen Modellen desselben Ingenieurs
  for (const o of others) {
    if (o.id === m.id) continue;
    if (o.engineerId !== m.engineerId) continue;
    if (overlaps(m, o)) {
      errs.push({
        modelId: m.id,
        field: "overlap",
        message: `Zeitraum überlappt mit Modell vom ${o.validFrom}${o.validUntil ? ` bis ${o.validUntil}` : " (offen)"}.`,
      });
      break;
    }
  }
  return errs;
}

function overlaps(a: EngineerTargetTimeModel, b: EngineerTargetTimeModel): boolean {
  const aFrom = parseISO(a.validFrom);
  const bFrom = parseISO(b.validFrom);
  if (!aFrom || !bFrom) return false;
  const aUntil = a.validUntil ? parseISO(a.validUntil) : null;
  const bUntil = b.validUntil ? parseISO(b.validUntil) : null;
  // beide offen ⇒ teilen sich Zukunft
  const aEnd = aUntil ?? new Date(9999, 11, 31);
  const bEnd = bUntil ?? new Date(9999, 11, 31);
  return aFrom <= bEnd && bFrom <= aEnd;
}

export function validateTargetTimeModels(
  models: EngineerTargetTimeModel[],
): TargetModelValidationError[] {
  const out: TargetModelValidationError[] = [];
  for (const m of models) {
    out.push(...validateTargetTimeModel(m, models));
  }
  return out;
}

/* ----------------------------------- API ---------------------------------- */

export function newTargetTimeModelId(): string {
  return `ttm-${Math.random().toString(36).slice(2, 10)}`;
}

export const EngineerTargetTimeService = {
  loadTargetTimeModels,
  saveTargetTimeModels,
  getActiveTargetTimeModel,
  getTargetHoursForMonth,
  getTargetHoursForWeek,
  calculateDailyTargetHours,
  calculateMonthlyTargetFromWeekly,
  calculateWeeklyTargetFromMonthly,
  deriveCounterpart,
  buildDailyTargetFn,
  buildDailyTargetFnFromEngineer,
  sumTargetInRange,
  validateTargetTimeModel,
  validateTargetTimeModels,
};
