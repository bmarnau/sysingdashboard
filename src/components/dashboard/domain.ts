/**
 * Fachliche Validierung, Normalisierung und Objekt-Factories des Dashboards.
 * Bewusst frei von React — direkt unit-testbar.
 */
import type { Activity, BillingStatus, Project, WorkPackage } from "@/lib/dashboard-data";
import { newId } from "./formatters";
import { isValidISODate } from "./formatters";

export type ActivityErrors = {
  title?: string;
  date?: string;
  duration?: string;
  hourlyRate?: string;
  billingStatus?: string;
};

export function validateActivity(a: Activity): ActivityErrors {
  const errs: ActivityErrors = {};
  if (!a.title || a.title.trim().length < 2)
    errs.title = "Titel ist erforderlich (mind. 2 Zeichen).";
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
export function normalizeActivity(a: Activity, validWpIds: Set<string>): Activity {
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
  const billingStatus: BillingStatus = a.billingStatus === "abgerechnet" ? "abgerechnet" : "offen";
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

export function normalizeWorkPackage(w: WorkPackage, validProjectIds: Set<string>): WorkPackage {
  return {
    ...w,
    projectId: w.projectId && validProjectIds.has(w.projectId) ? w.projectId : null,
  };
}

export function emptyProject(): Project {
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
export function emptyWP(): WorkPackage {
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
export function emptyActivity(): Activity {
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
