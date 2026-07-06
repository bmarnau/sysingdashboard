/**
 * React-Bindings für `dashboardStore` via `useSyncExternalStore`.
 *
 * Vorteile gegenüber Context+useReducer:
 * - Selector-basiert: Consumer rendern nur bei Änderung IHRES Slices.
 * - Kein Provider nötig — Store ist Modul-Singleton.
 * - SSR-safe: `getServerSnapshot` liefert deterministische Fixture.
 */

import { useSyncExternalStore } from "react";
import type { Activity, Engineer, Project, WorkPackage } from "@/lib/dashboard-data";
import { dashboardStore, type DashboardDomainState } from "./dashboard-store";

const identity = (s: DashboardDomainState) => s;

export function useDashboardStore(): DashboardDomainState;
export function useDashboardStore<T>(selector: (s: DashboardDomainState) => T): T;
export function useDashboardStore<T>(selector?: (s: DashboardDomainState) => T): T | DashboardDomainState {
  const select = selector ?? (identity as unknown as (s: DashboardDomainState) => T);
  return useSyncExternalStore(
    dashboardStore.subscribe,
    () => select(dashboardStore.getState()),
    () => select(dashboardStore.getState()),
  );
}

export const useActivities = (): Activity[] => useDashboardStore((s) => s.activities);
export const useProjects = (): Project[] => useDashboardStore((s) => s.projects);
export const useWorkPackages = (): WorkPackage[] => useDashboardStore((s) => s.workPackages);
export const useEngineer = (): Engineer => useDashboardStore((s) => s.engineer);

export const useProjectById = (id: string | null | undefined): Project | null =>
  useDashboardStore((s) => (id ? s.projects.find((p) => p.id === id) ?? null : null));

export const useWorkPackageById = (id: string | null | undefined): WorkPackage | null =>
  useDashboardStore((s) => (id ? s.workPackages.find((w) => w.id === id) ?? null : null));
