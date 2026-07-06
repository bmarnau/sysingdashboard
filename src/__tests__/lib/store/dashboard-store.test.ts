import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardStore } from "@/lib/store/dashboard-store";
import { dashboardData } from "@/lib/dashboard-data";

describe("dashboardStore", () => {
  beforeEach(() => {
    dashboardStore.__resetForTest();
  });

  it("liefert Fixture als Default-State", () => {
    const s = dashboardStore.getState();
    expect(s.projects.length).toBe(dashboardData.projects.length);
    expect(s.workPackages.length).toBe(dashboardData.workPackages.length);
    expect(s.activities.length).toBe(dashboardData.activities.length);
    expect(s.engineer.company).toBe(dashboardData.engineer.company);
  });

  it("emittiert genau ein Listener-Event bei setProjects mit neuer Referenz", () => {
    const spy = vi.fn();
    dashboardStore.subscribe(spy);
    dashboardStore.setProjects([...dashboardStore.getState().projects]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("emittiert NICHT, wenn dieselbe Referenz gesetzt wird", () => {
    const spy = vi.fn();
    dashboardStore.subscribe(spy);
    dashboardStore.setProjects(dashboardStore.getState().projects);
    expect(spy).not.toHaveBeenCalled();
  });

  it("behält Referenz-Gleichheit für unveränderte Slices bei setActivities", () => {
    const before = dashboardStore.getState();
    dashboardStore.setActivities([...before.activities]);
    const after = dashboardStore.getState();
    expect(after.projects).toBe(before.projects);
    expect(after.workPackages).toBe(before.workPackages);
    expect(after.engineer).toBe(before.engineer);
    expect(after.activities).not.toBe(before.activities);
  });

  it("updateActivity mutiert nur den betroffenen Eintrag", () => {
    const first = dashboardStore.getState().activities[0];
    dashboardStore.updateActivity(first.id, { title: "geändert" });
    const after = dashboardStore.getState().activities.find((a) => a.id === first.id);
    expect(after?.title).toBe("geändert");
    // Anderer Eintrag unverändert.
    const other = dashboardStore.getState().activities[1];
    const otherBefore = dashboardData.activities[1];
    expect(other.title).toBe(otherBefore.title);
  });

  it("addProject / removeProject arbeiten immutable", () => {
    const before = dashboardStore.getState().projects;
    dashboardStore.addProject({
      id: "p-test",
      name: "Test",
      client: "Client",
      status: "on_track",
    });
    const after = dashboardStore.getState().projects;
    expect(after).not.toBe(before);
    expect(after.some((p) => p.id === "p-test")).toBe(true);
    dashboardStore.removeProject("p-test");
    expect(dashboardStore.getState().projects.some((p) => p.id === "p-test")).toBe(false);
  });

  it("replaceAll ersetzt komplett und emittiert einmal", () => {
    const spy = vi.fn();
    dashboardStore.subscribe(spy);
    dashboardStore.replaceAll({
      engineer: dashboardData.engineer,
      projects: [],
      workPackages: [],
      activities: [],
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(dashboardStore.getState().projects).toEqual([]);
  });

  it("reset stellt Fixture wieder her", () => {
    dashboardStore.setProjects([]);
    dashboardStore.reset();
    expect(dashboardStore.getState().projects.length).toBe(dashboardData.projects.length);
  });

  it("unsubscribe entfernt Listener", () => {
    const spy = vi.fn();
    const unsub = dashboardStore.subscribe(spy);
    unsub();
    dashboardStore.setProjects([]);
    expect(spy).not.toHaveBeenCalled();
  });
});
