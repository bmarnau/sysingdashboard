import { describe, expect, it } from "vitest";
import {
  buildExportGroups,
  calculateSummary,
  createExportDTO,
  loadExportData,
  type ExportConfiguration,
} from "@/lib/export-data";
import { makeActivity, makeEngineer, makeProject, makeWorkPackage } from "../fixtures/activities";

function baseConfig(overrides: Partial<ExportConfiguration> = {}): ExportConfiguration {
  return {
    format: "json",
    month: "2025-03",
    fileName: "test",
    grouping: "customer-project-workpackage-task",
    sorting: ["date"],
    filter: { clientId: null, clientName: null, projectId: null, projectName: null },
    ...overrides,
  };
}

describe("loadExportData", () => {
  it("should_filterByMonth_when_activitiesOutsideRange", () => {
    // Arrange
    const project = makeProject({ id: "p1", client: "Kunde A" });
    const wp = makeWorkPackage({ id: "w1", projectId: "p1" });
    const activities = [
      makeActivity({ date: "2025-03-05", workPackageId: "w1" }),
      makeActivity({ date: "2025-02-25", workPackageId: "w1" }), // out
    ];

    // Act
    const filtered = loadExportData(
      { projects: [project], workPackages: [wp], activities, engineer: makeEngineer() },
      { month: "2025-03", filter: baseConfig().filter },
    );

    // Assert
    expect(filtered.activities).toHaveLength(1);
    expect(filtered.projects).toHaveLength(1);
    expect(filtered.workPackages).toHaveLength(1);
  });

  it("should_filterByClient_when_clientNameSet", () => {
    const p1 = makeProject({ id: "p1", client: "Kunde A" });
    const p2 = makeProject({ id: "p2", client: "Kunde B" });
    const wp1 = makeWorkPackage({ id: "w1", projectId: "p1" });
    const wp2 = makeWorkPackage({ id: "w2", projectId: "p2" });
    const activities = [
      makeActivity({ date: "2025-03-05", workPackageId: "w1" }),
      makeActivity({ date: "2025-03-06", workPackageId: "w2" }),
    ];

    const filtered = loadExportData(
      { projects: [p1, p2], workPackages: [wp1, wp2], activities, engineer: makeEngineer() },
      {
        month: "2025-03",
        filter: { clientId: null, clientName: "Kunde A", projectId: null, projectName: null },
      },
    );

    expect(filtered.activities).toHaveLength(1);
    expect(filtered.projects[0].id).toBe("p1");
  });
});

describe("calculateSummary", () => {
  it("should_sumBillableAndAmount_when_activitiesMixed", () => {
    const summary = calculateSummary({
      activities: [
        makeActivity({ duration: 4, hourlyRate: 100, billable: true }),
        makeActivity({ duration: 2, hourlyRate: 100, billable: false }),
      ],
      projects: [],
      workPackages: [],
    });

    expect(summary.totalHours).toBe(6);
    expect(summary.billableHours).toBe(4);
    expect(summary.nonBillableHours).toBe(2);
    expect(summary.totalAmount).toBe(400);
  });
});

describe("createExportDTO", () => {
  it("should_produceGroupedTree_when_grouped", () => {
    const project = makeProject({ id: "p1", client: "Kunde A", name: "Projekt X" });
    const wp = makeWorkPackage({ id: "w1", projectId: "p1", title: "AP1" });
    const activities = [
      makeActivity({ date: "2025-03-05", workPackageId: "w1", duration: 4 }),
      makeActivity({ date: "2025-03-06", workPackageId: "w1", duration: 2 }),
    ];

    const dto = createExportDTO(
      { projects: [project], workPackages: [wp], activities, engineer: makeEngineer() },
      baseConfig(),
    );

    expect(dto.summary.totalHours).toBe(6);
    expect(dto.groups[0].level).toBe("customer");
    expect(dto.groups[0].hours).toBe(6);
  });
});

describe("buildExportGroups", () => {
  it("should_returnEmpty_when_noActivities", () => {
    expect(
      buildExportGroups(
        { activities: [], projects: [], workPackages: [] },
        { grouping: "project-workpackage-task", sorting: [] },
        "Test",
      ),
    ).toEqual([]);
  });
});
