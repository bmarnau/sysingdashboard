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

const BASE_FILTERS = {
  from: "2026-09-01",
  to: "2026-09-05",
  billable: "all" as const,
};

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

    const result = await service.get(BASE_FILTERS);

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

  it("filters billable and non-billable rows only by the billable flag", async () => {
    const service = new ProjectControllingService(
      makeRepository([
        makeRow({ activityId: "billable", durationHours: 2, billable: true }),
        makeRow({
          activityId: "non-billable",
          durationHours: 3,
          billable: false,
          billingStatus: "abgerechnet",
        }),
      ]),
    );

    const billable = await service.get({ ...BASE_FILTERS, billable: "billable" });
    const nonBillable = await service.get({ ...BASE_FILTERS, billable: "nonBillable" });

    expect(billable.ok && billable.value.rows.map((row) => row.activityId)).toEqual(["billable"]);
    expect(nonBillable.ok && nonBillable.value.rows.map((row) => row.activityId)).toEqual([
      "non-billable",
    ]);
  });

  it("preserves category states and filters by stable category key", async () => {
    const service = new ProjectControllingService(
      makeRepository([
        makeRow({
          activityId: "unobserved",
          categoryObserved: false,
          categoryKey: null,
          categoryLabel: null,
          categoryState: "unobserved",
        }),
        makeRow({
          activityId: "none",
          categoryKey: null,
          categoryLabel: null,
          categoryState: "none",
        }),
        makeRow({ activityId: "known", categoryState: "known" }),
        makeRow({
          activityId: "inactive",
          categoryKey: "legacy-alt",
          categoryLabel: "Legacy Alt",
          categoryState: "inactive",
        }),
        makeRow({
          activityId: "unknown",
          categoryKey: "unknown-key",
          categoryLabel: null,
          categoryState: "unknown",
        }),
      ]),
    );

    const all = await service.get(BASE_FILTERS);
    const inactive = await service.get({
      ...BASE_FILTERS,
      systemhouseId: "systemhouse-1",
      categoryKey: "legacy-alt",
    });

    expect(all.ok && all.value.rows.map((row) => row.categoryState)).toEqual([
      "unobserved",
      "none",
      "known",
      "inactive",
      "unknown",
    ]);
    expect(inactive.ok && inactive.value.rows.map((row) => row.activityId)).toEqual(["inactive"]);
  });

  it.each([
    [{ customerId: "customer-1" }],
    [{ systemhouseId: "systemhouse-1", projectSourceId: "project-1" }],
    [{ systemhouseId: "systemhouse-1", workPackageSourceId: "work-package-1" }],
    [{ categoryKey: "regelbetrieb" }],
  ])("rejects dependent filters that are missing their parent scope: %j", async (partial) => {
    const service = new ProjectControllingService(makeRepository([]));

    await expect(service.get({ ...BASE_FILTERS, ...partial })).resolves.toEqual({
      ok: false,
      error: "PROJECT_CONTROLLING_INVALID_SCOPE",
    });
  });

  it("filters canonical systemhouse, customer, project and work-package identities", async () => {
    const service = new ProjectControllingService(
      makeRepository([
        makeRow({ activityId: "target" }),
        makeRow({
          activityId: "other-project",
          projectSourceId: "project-2",
          workPackageSourceId: "work-package-2",
        }),
        makeRow({
          activityId: "other-customer",
          customerId: "customer-2",
          projectSourceId: "project-3",
          workPackageSourceId: "work-package-3",
        }),
        makeRow({
          activityId: "other-systemhouse",
          systemhouseId: "systemhouse-2",
          customerId: "customer-9",
          projectSourceId: "project-9",
          workPackageSourceId: "work-package-9",
        }),
      ]),
    );

    const result = await service.get({
      ...BASE_FILTERS,
      systemhouseId: "systemhouse-1",
      customerId: "customer-1",
      projectSourceId: "project-1",
      workPackageSourceId: "work-package-1",
    });

    expect(result.ok && result.value.rows.map((row) => row.activityId)).toEqual(["target"]);
  });

  it("fails closed when more than 5000 filtered activities are returned", async () => {
    const rows = Array.from({ length: 5_001 }, (_, index) =>
      makeRow({ activityId: `activity-${index}` }),
    );
    const service = new ProjectControllingService(makeRepository(rows));

    await expect(service.get(BASE_FILTERS)).resolves.toEqual({
      ok: false,
      error: "PROJECT_CONTROLLING_TOO_MANY_ACTIVITIES",
    });
  });

  it("summarizes the same filtered decimal-hour rows reproducibly regardless of repository order", async () => {
    const sourceRows = [
      makeRow({ activityId: "decimal-a", durationHours: 0.1, billable: true }),
      makeRow({ activityId: "decimal-b", durationHours: 0.2, billable: true }),
      makeRow({
        activityId: "decimal-c",
        durationHours: 0.3,
        billable: false,
        customerId: "customer-2",
        customerName: "Kunde Zwei",
        projectSourceId: null,
        projectName: null,
        workPackageSourceId: null,
        workPackageTitle: null,
      }),
      makeRow({
        activityId: "outside",
        activityDate: "2026-09-06",
        durationHours: 99,
      }),
    ];
    const forward = await new ProjectControllingService(makeRepository(sourceRows)).get(
      BASE_FILTERS,
    );
    const reverse = await new ProjectControllingService(
      makeRepository([...sourceRows].reverse()),
    ).get(BASE_FILTERS);
    const expectedSummary = {
      activities: 3,
      customers: 2,
      projects: 1,
      workPackages: 1,
      totalHours: 0.6,
      billableHours: 0.3,
      nonBillableHours: 0.3,
      billableQuotePercent: 50,
    };

    expect(forward.ok && forward.value.summary).toEqual(expectedSummary);
    expect(reverse.ok && reverse.value.summary).toEqual(expectedSummary);
  });
});
