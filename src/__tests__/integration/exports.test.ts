import { describe, expect, it } from "vitest";
import { createExportDTO, type ExportConfiguration } from "@/lib/export-data";
import { makeActivity, makeEngineer, makeProject, makeWorkPackage } from "../fixtures/activities";

/**
 * Integration: Activities → DTO → JSON.stringify → JSON.parse
 * Sicherstellen, dass die Export-Pipeline serialisierbar bleibt und Summen
 * über einen Round-Trip stabil sind. Kein echter Datei-/Blob-Ausflug.
 */

const config: ExportConfiguration = {
  format: "json",
  month: "2025-03",
  fileName: "export",
  grouping: "customer-project-workpackage-task",
  sorting: ["date"],
  filter: { clientId: null, clientName: null, projectId: null, projectName: null },
};

describe("Export-Pipeline (Round-Trip)", () => {
  it("should_serializeAndReparse_when_dtoStringified", () => {
    // Arrange
    const project = makeProject({ id: "p1", client: "Kunde A" });
    const wp = makeWorkPackage({ id: "w1", projectId: "p1" });
    const activities = [
      makeActivity({ workPackageId: "w1", date: "2025-03-01", duration: 4, hourlyRate: 100 }),
      makeActivity({
        workPackageId: "w1",
        date: "2025-03-04",
        duration: 3,
        hourlyRate: 120,
        billable: false,
      }),
    ];

    // Act
    const dto = createExportDTO(
      { projects: [project], workPackages: [wp], activities, engineer: makeEngineer() },
      config,
    );
    const roundTrip = JSON.parse(JSON.stringify(dto));

    // Assert
    expect(roundTrip.summary.totalHours).toBe(dto.summary.totalHours);
    expect(roundTrip.groups[0].hours).toBe(dto.groups[0].hours);
    expect(JSON.stringify(roundTrip)).not.toContain("__idx__"); // transient caches entfernt
  });

  it("should_produceEmptyGroups_when_noActivities", () => {
    const dto = createExportDTO(
      { projects: [], workPackages: [], activities: [], engineer: makeEngineer() },
      config,
    );
    expect(dto.summary.activities).toBe(0);
    expect(dto.groups).toEqual([]);
  });
});
