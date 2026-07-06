import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardStore } from "@/lib/store/dashboard-store";
import {
  __resetPersistenceForTest,
  flushDashboardPersistence,
  initDashboardPersistence,
} from "@/lib/store/dashboard-persistence";
import { UserManagementService } from "@/lib/user-management";

const key = () => UserManagementService.userScopedKey("northbit-dashboard-v2");

describe("dashboard-persistence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    dashboardStore.__resetForTest();
    __resetPersistenceForTest();
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetPersistenceForTest();
  });

  it("hydratisiert Store aus localStorage-Blob", () => {
    window.localStorage.setItem(
      key(),
      JSON.stringify({ projects: [], workPackages: [], activities: [] }),
    );
    initDashboardPersistence();
    expect(dashboardStore.getState().projects).toEqual([]);
    expect(dashboardStore.getState().activities).toEqual([]);
  });

  it("fällt bei korruptem JSON auf Fixture zurück (kein Wurf)", () => {
    window.localStorage.setItem(key(), "{not-json");
    expect(() => initDashboardPersistence()).not.toThrow();
    expect(dashboardStore.getState().projects.length).toBeGreaterThan(0);
  });

  it("debounced Write: erst nach 300ms wird geschrieben, nur einmal", () => {
    initDashboardPersistence();
    window.localStorage.removeItem(key());
    dashboardStore.setProjects([]);
    dashboardStore.setActivities([]);
    dashboardStore.setWorkPackages([]);
    // Vor Ablauf: nichts geschrieben.
    expect(window.localStorage.getItem(key())).toBeNull();
    vi.advanceTimersByTime(300);
    const raw = window.localStorage.getItem(key());
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.projects).toEqual([]);
    expect(parsed.activities).toEqual([]);
  });

  it("flushDashboardPersistence schreibt sofort", () => {
    initDashboardPersistence();
    window.localStorage.removeItem(key());
    dashboardStore.setProjects([]);
    flushDashboardPersistence();
    expect(window.localStorage.getItem(key())).not.toBeNull();
  });
});
