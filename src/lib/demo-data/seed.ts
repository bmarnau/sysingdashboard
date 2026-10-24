/**
 * Idempotentes Einspielen und Entfernen des Systemhaus-Demo-Datensatzes.
 *
 * Sicherheitsregel: Es werden ausschließlich Datensätze mit dem Präfix
 * `demo-` angelegt und entfernt. Bestehende Echtdaten bleiben unberührt,
 * mehrfaches Einspielen erzeugt keine Duplikate.
 */

import { dashboardStore } from "@/lib/store/dashboard-store";
import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";
import { buildDemoDataset, getDemoBaseDate, isDemoId } from "./dataset";

export interface DemoSeedResult {
  projects: number;
  workPackages: number;
  activities: number;
  /** True, wenn bereits Demodaten vorhanden waren und ersetzt wurden. */
  replaced: boolean;
}

function withoutDemo<T extends { id: string }>(items: readonly T[]): T[] {
  return items.filter((item) => !isDemoId(item.id));
}

export function hasDemoData(): boolean {
  const s = dashboardStore.getState();
  return (
    s.projects.some((p) => isDemoId(p.id)) ||
    s.workPackages.some((w) => isDemoId(w.id)) ||
    s.activities.some((a) => isDemoId(a.id))
  );
}

export function seedDemoData(): DemoSeedResult {
  const replaced = hasDemoData();
  const dataset = buildDemoDataset();
  const s = dashboardStore.getState();

  dashboardStore.setProjects([...withoutDemo<Project>(s.projects), ...dataset.projects]);
  dashboardStore.setWorkPackages([
    ...withoutDemo<WorkPackage>(s.workPackages),
    ...dataset.workPackages,
  ]);
  dashboardStore.setActivities([...withoutDemo<Activity>(s.activities), ...dataset.activities]);

  return {
    projects: dataset.projects.length,
    workPackages: dataset.workPackages.length,
    activities: dataset.activities.length,
    replaced,
  };
}

export function removeDemoData(): DemoSeedResult {
  const s = dashboardStore.getState();
  const removed = {
    projects: s.projects.filter((p) => isDemoId(p.id)).length,
    workPackages: s.workPackages.filter((w) => isDemoId(w.id)).length,
    activities: s.activities.filter((a) => isDemoId(a.id)).length,
    replaced: false,
  };
  dashboardStore.setProjects(withoutDemo<Project>(s.projects));
  dashboardStore.setWorkPackages(withoutDemo<WorkPackage>(s.workPackages));
  dashboardStore.setActivities(withoutDemo<Activity>(s.activities));
  return removed;
}

/** Versatz der Referenztätigkeit `demo-act-1` zum Stichtag (siehe dataset.ts: day(-32)). */
const REFERENCE_ACTIVITY_ID = "demo-act-1";
const REFERENCE_ACTIVITY_OFFSET_DAYS = -32;

/** Ab so vielen Tagen Abstand zum Stichtag gelten lokale Demodaten als veraltet. */
export const DEMO_STALE_AFTER_DAYS = 3;

export interface DemoFreshness {
  /** Stichtag, mit dem die lokalen Demodaten eingespielt wurden; `null` ohne Demodaten. */
  seededBaseDate: string | null;
  /** Tage zwischen Einspielen und heutigem Stichtag; `null` ohne Demodaten. */
  ageDays: number | null;
  /** True, wenn Fälligkeiten und Tätigkeitsdaten gegenüber heute spürbar verschoben sind. */
  stale: boolean;
}

function toUtcDay(date: string): number {
  return Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
  );
}

/**
 * Leitet den Stichtag der lokal eingespielten Demodaten aus der Referenztätigkeit ab.
 * Die Datumsangaben des Datensatzes sind relativ zum Stichtag; „Aktualisieren“ ist daher
 * ein erneutes, idempotentes Einspielen (`seedDemoData`) und ersetzt nur `demo-`-Einträge.
 */
export function getDemoFreshness(today: string = getDemoBaseDate()): DemoFreshness {
  const reference = dashboardStore
    .getState()
    .activities.find((a) => a.id === REFERENCE_ACTIVITY_ID);
  if (!reference) return { seededBaseDate: null, ageDays: null, stale: false };
  const seeded = new Date(toUtcDay(reference.date) - REFERENCE_ACTIVITY_OFFSET_DAYS * 86_400_000);
  const seededBaseDate = seeded.toISOString().slice(0, 10);
  const ageDays = Math.round((toUtcDay(today) - toUtcDay(seededBaseDate)) / 86_400_000);
  return { seededBaseDate, ageDays, stale: ageDays >= DEMO_STALE_AFTER_DAYS };
}
