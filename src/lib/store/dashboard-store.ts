/**
 * dashboardStore — Modul-Singleton für den Domain-State des Dashboards
 * (engineer / projects / workPackages / activities).
 *
 * Konsistent mit dem bereits gelebten Pub-Sub-Pattern in
 * `user-management.ts` und `azure/azure-history-store.ts`.
 * Keine neuen Runtime-Dependencies, kein Provider — Consumer binden
 * über `useDashboardStore(selector)` (useSyncExternalStore) an.
 *
 * UI-State (Dialoge, Suche, Menüs) bleibt bewusst LOKAL in den
 * Komponenten und landet nicht in diesem Store.
 */

import {
  dashboardData,
  type Activity,
  type Engineer,
  type Project,
  type WorkPackage,
} from "@/lib/dashboard-data";

export interface DashboardDomainState {
  engineer: Engineer;
  projects: Project[];
  workPackages: WorkPackage[];
  activities: WorkPackage extends never ? never : Activity[];
}

// Vollständiger Snapshot als tiefe Kopie liefern — nur so bleibt der
// Fallback-Fixture unveränderlich, falls Mutatoren später mit
// Referenzen operieren.
function cloneFixture(): DashboardDomainState {
  return {
    engineer: { ...dashboardData.engineer },
    projects: dashboardData.projects.map((p) => ({ ...p })),
    workPackages: dashboardData.workPackages.map((w) => ({ ...w })),
    activities: dashboardData.activities.map((a) => ({ ...a })),
  };
}

let state: DashboardDomainState = cloneFixture();
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/** Ersetzt einen Slice nur, wenn der neue Wert eine andere Referenz hat.
 *  So bleibt die Referenz-Gleichheit für unveränderte Slices erhalten
 *  (wichtig für Selector-Optimierung mit useSyncExternalStore). */
function patch(next: Partial<DashboardDomainState>): boolean {
  let changed = false;
  const merged: DashboardDomainState = { ...state };
  for (const key of Object.keys(next) as (keyof DashboardDomainState)[]) {
    const value = next[key];
    if (value !== undefined && value !== state[key]) {
      // @ts-expect-error — index-Zuweisung über keyof
      merged[key] = value;
      changed = true;
    }
  }
  if (changed) {
    state = merged;
    emit();
  }
  return changed;
}

export const dashboardStore = {
  getState(): DashboardDomainState {
    return state;
  },

  subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },

  /** Kompletter Ersatz — für Import/Restore und Store-Rehydrate. */
  replaceAll(next: DashboardDomainState): void {
    state = {
      engineer: next.engineer,
      projects: next.projects,
      workPackages: next.workPackages,
      activities: next.activities,
    };
    emit();
  },

  /** Zurück auf Fixture (Fallback bei „Alles zurücksetzen"). */
  reset(): void {
    state = cloneFixture();
    emit();
  },

  setEngineer(engineer: Engineer): void {
    patch({ engineer });
  },
  setProjects(projects: Project[]): void {
    patch({ projects });
  },
  setWorkPackages(workPackages: WorkPackage[]): void {
    patch({ workPackages });
  },
  setActivities(activities: Activity[]): void {
    patch({ activities });
  },

  updateActivity(id: string, updates: Partial<Activity>): void {
    const next = state.activities.map((a) => (a.id === id ? { ...a, ...updates } : a));
    patch({ activities: next });
  },
  addActivity(a: Activity): void {
    patch({ activities: [...state.activities, a] });
  },
  removeActivity(id: string): void {
    patch({ activities: state.activities.filter((a) => a.id !== id) });
  },

  updateWorkPackage(id: string, updates: Partial<WorkPackage>): void {
    const next = state.workPackages.map((w) => (w.id === id ? { ...w, ...updates } : w));
    patch({ workPackages: next });
  },
  addWorkPackage(w: WorkPackage): void {
    patch({ workPackages: [...state.workPackages, w] });
  },
  removeWorkPackage(id: string): void {
    patch({ workPackages: state.workPackages.filter((w) => w.id !== id) });
  },

  updateProject(id: string, updates: Partial<Project>): void {
    const next = state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p));
    patch({ projects: next });
  },
  addProject(p: Project): void {
    patch({ projects: [...state.projects, p] });
  },
  removeProject(id: string): void {
    patch({ projects: state.projects.filter((p) => p.id !== id) });
  },

  /** Test-Helfer: Store zurück auf Fixture UND alle Listener entfernen. */
  __resetForTest(): void {
    state = cloneFixture();
    listeners.clear();
  },
};

// DEV-Debug-Zugriff — niemals in PROD, um Store-Manipulation via Konsole zu vermeiden.
if (typeof window !== "undefined" && import.meta.env?.DEV) {
  (window as unknown as { __dashboardStore?: typeof dashboardStore }).__dashboardStore =
    dashboardStore;
}
