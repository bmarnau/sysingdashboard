/**
 * Idempotentes Einspielen und Entfernen des Systemhaus-Demo-Datensatzes.
 *
 * Sicherheitsregel: Es werden ausschließlich Datensätze mit dem Präfix
 * `demo-` angelegt und entfernt. Bestehende Echtdaten bleiben unberührt,
 * mehrfaches Einspielen erzeugt keine Duplikate.
 */

import { dashboardStore } from "@/lib/store/dashboard-store";
import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";
import { buildDemoDataset, isDemoId } from "./dataset";

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
