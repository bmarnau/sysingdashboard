import { describe, expect, it } from "vitest";
import type { Activity, WorkPackage } from "@/lib/dashboard-data";
import {
  selectProjectActivities,
  selectProjectWorkPackages,
  summarizeProjectOperations,
} from "@/components/dashboard/views/ProjectDetailView";

const workPackages: WorkPackage[] = [
  {
    id: "WP-A",
    title: "A",
    projectId: "P-1",
    status: "offen",
    priority: "hoch",
    due: "2026-08-20",
    estimated: 10,
  },
  {
    id: "WP-B",
    title: "B",
    projectId: "P-1",
    status: "erledigt",
    priority: "mittel",
    due: "2026-08-10",
    estimated: 5,
  },
  {
    id: "WP-C",
    title: "C",
    projectId: "P-2",
    status: "in_arbeit",
    priority: "mittel",
    due: "2026-08-30",
    estimated: 7,
  },
];

const activities: Activity[] = [
  {
    id: "A-1",
    title: "Analyse",
    workPackageId: "WP-A",
    date: "2026-08-19",
    duration: 2,
    hourlyRate: 100,
    billable: true,
    billingStatus: "offen",
  },
  {
    id: "A-2",
    title: "Doku",
    workPackageId: "WP-B",
    date: "2026-08-20",
    duration: 1,
    hourlyRate: 120,
    billable: false,
    billingStatus: "nicht_abrechenbar",
  },
  {
    id: "A-3",
    title: "Fremdes Projekt",
    workPackageId: "WP-C",
    date: "2026-08-20",
    duration: 4,
    hourlyRate: 90,
    billable: true,
    billingStatus: "offen",
  },
];

describe("F-11 Projektcockpit — Projektscope", () => {
  it("selects only work packages of the selected project", () => {
    expect(selectProjectWorkPackages(workPackages, "P-1").map((wp) => wp.id)).toEqual([
      "WP-A",
      "WP-B",
    ]);
  });

  it("selects activities transitively through the selected project work packages", () => {
    const scopedWps = selectProjectWorkPackages(workPackages, "P-1");
    expect(selectProjectActivities(activities, scopedWps).map((activity) => activity.id)).toEqual([
      "A-1",
      "A-2",
    ]);
  });

  it("derives operational KPIs only from the project scope", () => {
    const scopedWps = selectProjectWorkPackages(workPackages, "P-1");
    const scopedActivities = selectProjectActivities(activities, scopedWps);
    const summary = summarizeProjectOperations(scopedWps, scopedActivities, "2026-08-21");

    expect(summary).toEqual({
      workPackages: 2,
      openWorkPackages: 1,
      overdueWorkPackages: 1,
      activities: 2,
      actualHours: 3,
      billableHours: 2,
      billableAmount: 200,
    });
  });
});
