/**
 * Persistenz-Layer für den dashboardStore.
 *
 * - Hydration einmalig beim Aufruf von `initDashboardPersistence()`.
 *   Backwards-compatible: liest die bestehende, user-scoped Blob-Key
 *   `northbit-dashboard-v2` (siehe `UserManagementService.userScopedKey`).
 * - Debounced Write (300 ms) statt Full-Blob-`useEffect`.
 * - `storage`-Event → Rehydrate (Änderungen aus anderem Tab).
 *
 * Anmerkung zum Plan: „scoped keys pro Slice" wurde bewusst vertagt.
 * Ein Wechsel auf 4 getrennte Keys würde eine Migration bestehender
 * Installationen erzwingen. Die Debounce löst das aktuelle
 * Performance-Problem (Full-Blob-Write bei jedem Tastendruck) bereits
 * ohne Format-Bruch. Scoped Keys folgen in einem separaten PR mit
 * Read-Fallback.
 */

import {
  dashboardData,
  type Activity,
  type Engineer,
  type Project,
  type WorkPackage,
} from "@/lib/dashboard-data";
import { logger } from "@/lib/logger";
import { UserManagementService, subscribeUserChanges } from "@/lib/user-management";
import { dashboardStore, type DashboardDomainState } from "./dashboard-store";

const STORAGE_KEY_BASE = "northbit-dashboard-v2";
const DEBOUNCE_MS = 300;

function storageKey(): string {
  return UserManagementService.userScopedKey(STORAGE_KEY_BASE);
}

interface PersistedShape {
  engineer?: Engineer;
  projects?: Project[];
  workPackages?: WorkPackage[];
  activities?: Activity[];
}

function readFromStorage(): PersistedShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey());
    if (!raw) return null;
    return JSON.parse(raw) as PersistedShape;
  } catch (err) {
    logger.warn("dashboard-persistence: hydrate failed, falling back to fixture", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function mergeWithFixture(persisted: PersistedShape | null): DashboardDomainState {
  return {
    engineer: persisted?.engineer ?? { ...dashboardData.engineer },
    projects: persisted?.projects ?? dashboardData.projects.map((p) => ({ ...p })),
    workPackages: persisted?.workPackages ?? dashboardData.workPackages.map((w) => ({ ...w })),
    activities: persisted?.activities ?? dashboardData.activities.map((a) => ({ ...a })),
  };
}

let writeTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribeStore: (() => void) | null = null;
let unsubscribeUser: (() => void) | null = null;
let storageListener: ((e: StorageEvent) => void) | null = null;
let initialized = false;

function scheduleWrite(): void {
  if (typeof window === "undefined") return;
  if (writeTimer !== null) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    try {
      const s = dashboardStore.getState();
      const payload: PersistedShape = {
        engineer: s.engineer,
        projects: s.projects,
        workPackages: s.workPackages,
        activities: s.activities,
      };
      window.localStorage.setItem(storageKey(), JSON.stringify(payload));
    } catch (err) {
      logger.error(
        "dashboard-persistence: write failed",
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }, DEBOUNCE_MS);
}

function rehydrateFromStorage(): void {
  const persisted = readFromStorage();
  dashboardStore.replaceAll(mergeWithFixture(persisted));
}

/**
 * Muss einmalig beim App-Start aufgerufen werden (nach `UserManagementService.bootstrap()`).
 * Idempotent — mehrfacher Aufruf hat keinen Effekt.
 */
export function initDashboardPersistence(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  rehydrateFromStorage();

  unsubscribeStore = dashboardStore.subscribe(scheduleWrite);

  // Benutzerwechsel → Storage-Key ändert sich → State aus dem neuen Bucket laden.
  unsubscribeUser = subscribeUserChanges(() => {
    rehydrateFromStorage();
  });

  // Änderungen aus anderem Tab spiegeln.
  storageListener = (e: StorageEvent) => {
    if (!e.key) return;
    if (e.key !== storageKey()) return;
    rehydrateFromStorage();
  };
  window.addEventListener("storage", storageListener);
}

/** Test-Helfer: Timer, Listener und Init-Flag zurücksetzen. */
export function __resetPersistenceForTest(): void {
  if (writeTimer !== null) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  if (unsubscribeStore) {
    unsubscribeStore();
    unsubscribeStore = null;
  }
  if (unsubscribeUser) {
    unsubscribeUser();
    unsubscribeUser = null;
  }
  if (storageListener && typeof window !== "undefined") {
    window.removeEventListener("storage", storageListener);
    storageListener = null;
  }
  initialized = false;
}

/** Explizites Flush für Testszenarien und „vor Reload speichern"-Fälle. */
export function flushDashboardPersistence(): void {
  if (writeTimer === null) return;
  clearTimeout(writeTimer);
  writeTimer = null;
  if (typeof window === "undefined") return;
  try {
    const s = dashboardStore.getState();
    window.localStorage.setItem(
      storageKey(),
      JSON.stringify({
        engineer: s.engineer,
        projects: s.projects,
        workPackages: s.workPackages,
        activities: s.activities,
      }),
    );
  } catch (err) {
    logger.error(
      "dashboard-persistence: flush failed",
      err instanceof Error ? err : new Error(String(err)),
    );
  }
}
