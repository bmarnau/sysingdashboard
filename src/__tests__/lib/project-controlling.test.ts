import { describe, expect, it } from "vitest";
import type {
  ProjectControllingRepository,
  ProjectControllingRow,
} from "@/lib/project-controlling/project-controlling-contract";
import { ProjectControllingService } from "@/lib/project-controlling/project-controlling";

function makeRow(overrides: Partial<ProjectControllingRow> = {}): ProjectControllingRow {
  return {
    activityId: "activity-1",
    activityDate: "2026-09-01",
    activityTitle: "Leistung",
    durationHours: 1,
    billable: true,
    billingStatus: "offen",
    systemhouseId: "systemhouse-1",
    systemhouseName: "Systemhaus Eins",
    customerId: "customer-1",
    customerName: "Kunde Eins",
    projectSourceId: "project-1",
    projectName: "Projekt Eins",
    workPackageSourceId: "work-package-1",
    workPackageTitle: "Arbeitspaket Eins",
    categoryObserved: true,
    categoryKey: "regelbetrieb",
    categoryLabel: "Regelbetrieb",
    categoryState: "known",
    ...overrides,
  };
}

function makeRepository(rows: ProjectControllingRow[]): ProjectControllingRepository {
  return {
    listRows: () => Promise.resolve([...rows]),
    listScopeOptions: () => Promise.resolve([]),
  };
}

describe("BSF-03A provider-neutral project controlling", () => {
  it("uses inclusive ISO date boundaries", async () => {
    const service = new ProjectControllingService(
      makeRepository([
        makeRow({ activityId: "before", activityDate: "2026-08-31", durationHours: 9 }),
        makeRow({ activityId: "from", activityDate: "2026-09-01", durationHours: 1 }),
        makeRow({ activityId: "inside", activityDate: "2026-09-03", durationHours: 2 }),
        makeRow({ activityId: "to", activityDate: "2026-09-05", durationHours: 3 }),
        makeRow({ activityId: "after", activityDate: "2026-09-06", durationHours: 9 }),
      ]),
    );

    const result = await service.get({
      from: "2026-09-01",
      to: "2026-09-05",
      billable: "all",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.rows.map((row) => row.activityId)).toEqual(["from", "inside", "to"]);
    expect(result.value.summary.totalHours).toBe(6);
  });

  it("rejects from after to", async () => {
    const service = new ProjectControllingService(makeRepository([]));

    await expect(
      service.get({ from: "2026-09-05", to: "2026-09-01", billable: "all" }),
    ).resolves.toEqual({
      ok: false,
      error: "PROJECT_CONTROLLING_INVALID_DATE_RANGE",
    });
  });

  it("rejects periods longer than 366 calendar days", async () => {
    const service = new ProjectControllingService(makeRepository([]));

    await expect(
      service.get({ from: "2025-01-01", to: "2026-01-02", billable: "all" }),
    ).resolves.toEqual({
      ok: false,
      error: "PROJECT_CONTROLLING_RANGE_TOO_LARGE",
    });
  });
});
