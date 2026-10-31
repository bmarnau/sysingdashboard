import { describe, expect, it } from "vitest";

import {
  composeManagementCockpit,
  type ManagementRolePreview,
  type ManagementSection,
  type ManagementCockpitInput,
} from "@/lib/management-cockpit/management-cockpit-service";

type SectionValue<T> = Extract<T, { value: unknown }>["value"];

function usableValue<T>(section: ManagementSection<T>): T {
  if (!("value" in section)) {
    throw new Error("Test fixture expected a usable source section.");
  }

  return section.value;
}

function input(overrides: Partial<ManagementCockpitInput> = {}): ManagementCockpitInput {
  return {
    referenceInstant: "2026-09-14T00:00:00Z",
    projectControlling: {
      state: "AVAILABLE",
      value: {
        rows: [
          {
            activityId: "activity-1",
            activityDate: "2026-09-14",
            activityTitle: "Kontrolle",
            durationHours: 1,
            billable: true,
            billingStatus: null,
            systemhouseId: "sh-a",
            systemhouseName: "Systemhaus A",
            customerId: "customer-a",
            customerName: "Kunde A",
            projectSourceId: "project-a",
            projectName: "Projekt A",
            workPackageSourceId: "wp-a",
            workPackageTitle: "AP A",
            categoryObserved: true,
            categoryKey: null,
            categoryLabel: null,
            categoryState: "unknown",
          },
        ],
        completeness: {
          categoryUnobservedRows: 0,
          categoryUnknownRows: 1,
          rowsWithoutProject: 0,
          rowsWithoutWorkPackage: 0,
        },
        freshness: {
          oldestPublishedAt: "2026-09-13T00:00:00Z",
          latestPublishedAt: "2026-09-14T00:00:00Z",
          observedRows: 1,
        },
      },
    },
    projectBridges: [
      {
        systemhouseId: "sh-a",
        customerId: "customer-a",
        projectSourceId: "project-a",
        workPackageSourceId: "wp-a",
      },
    ],
    avkk: { state: "UNKNOWN" },
    customers: { state: "UNKNOWN" },
    workPackages: { state: "UNKNOWN" },
    ...overrides,
  };
}

describe("ManagementCockpitService", () => {
  it("keeps a complete, usable source AVAILABLE", () => {
    const source = input();
    const cockpit = composeManagementCockpit({
      ...source,
      projectControlling: {
        state: "AVAILABLE",
        value: {
          ...usableValue(source.projectControlling),
          completeness: {
            categoryUnobservedRows: 0,
            categoryUnknownRows: 0,
            rowsWithoutProject: 0,
            rowsWithoutWorkPackage: 0,
          },
        },
      },
    });

    expect(cockpit.projectControlling.state).toBe("AVAILABLE");
  });

  it.each(["EMPTY", "UNKNOWN", "UNAVAILABLE"] as const)(
    "preserves %s without inventing attention data",
    (state: "EMPTY" | "UNKNOWN" | "UNAVAILABLE") => {
      const cockpit = composeManagementCockpit(input({ projectControlling: { state } }));

      expect(cockpit.projectControlling).toEqual({ state });
      expect(cockpit.attention).toEqual([]);
    },
  );

  it("marks project controlling as PARTIAL without altering its source totals", () => {
    const cockpit = composeManagementCockpit(input());

    expect(cockpit.projectControlling.state).toBe("PARTIAL");
    expect(usableValue(cockpit.projectControlling).freshness.observedRows).toBe(1);
  });

  it("passes source freshness through without inventing a freshness status", () => {
    const cockpit = composeManagementCockpit(input());

    expect(usableValue(cockpit.projectControlling).freshness).toEqual({
      oldestPublishedAt: "2026-09-13T00:00:00Z",
      latestPublishedAt: "2026-09-14T00:00:00Z",
      observedRows: 1,
    });
    expect(cockpit).not.toHaveProperty("freshnessStatus");
  });

  it("keeps denied sections empty so no count or identifier can leak", () => {
    const cockpit = composeManagementCockpit(
      input({
        projectControlling: { state: "DENIED" },
      }),
    );

    expect(cockpit.projectControlling).toEqual({ state: "DENIED" });
    expect(cockpit.attention).toEqual([]);
  });

  it("strips an invalid payload from a denied source before it can leak", () => {
    const source = input();
    const cockpit = composeManagementCockpit({
      ...source,
      projectControlling: {
        state: "DENIED",
        value: usableValue(source.projectControlling),
      } as ManagementCockpitInput["projectControlling"],
    });

    expect(cockpit.projectControlling).toEqual({ state: "DENIED" });
    expect(cockpit.attention).toEqual([]);
  });

  it("uses only an exact, scoped bridge for a work-package drill-down", () => {
    const cockpit = composeManagementCockpit(input());

    expect(cockpit.attention).toEqual([
      {
        systemhouseId: "sh-a",
        customerId: "customer-a",
        projectSourceId: "project-a",
        projectName: "Projekt A",
        workPackageSourceId: "wp-a",
        reason: "CATEGORY_UNKNOWN",
        correlation: "CORRELATED",
        provenance: ["PROJECT_CONTROLLING"],
      },
    ]);
  });

  it("fails closed when no exact bridge proves the work-package correlation", () => {
    const cockpit = composeManagementCockpit(input({ projectBridges: [] }));

    expect(cockpit.attention[0]).toMatchObject({
      projectSourceId: "project-a",
      reason: "CATEGORY_UNKNOWN",
      correlation: "NOT_CORRELATABLE",
    });
    expect(cockpit.attention[0]?.workPackageSourceId).toBeUndefined();
  });

  it("marks duplicate exact bridges ambiguous instead of choosing a drill-down", () => {
    const source = input();
    const cockpit = composeManagementCockpit({
      ...source,
      projectBridges: [...source.projectBridges, ...source.projectBridges],
    });

    expect(cockpit.attention[0]).toMatchObject({ correlation: "AMBIGUOUS" });
    expect(cockpit.attention[0]?.workPackageSourceId).toBeUndefined();
  });

  it("does not correlate a same-named work package from another customer", () => {
    const source = input();
    const cockpit = composeManagementCockpit({
      ...source,
      projectBridges: [
        {
          systemhouseId: "sh-a",
          customerId: "customer-b",
          projectSourceId: "project-a",
          workPackageSourceId: "wp-a",
        },
      ],
    });

    expect(cockpit.attention[0]).toMatchObject({ correlation: "NOT_CORRELATABLE" });
    expect(cockpit.attention[0]?.workPackageSourceId).toBeUndefined();
  });

  it("does not correlate an otherwise identical bridge from another systemhouse", () => {
    const source = input();
    const cockpit = composeManagementCockpit({
      ...source,
      projectBridges: [
        {
          systemhouseId: "sh-b",
          customerId: "customer-a",
          projectSourceId: "project-a",
          workPackageSourceId: "wp-a",
        },
      ],
    });

    expect(cockpit.attention[0]).toMatchObject({ correlation: "NOT_CORRELATABLE" });
    expect(cockpit.attention[0]?.workPackageSourceId).toBeUndefined();
  });

  it("keeps the source-of-truth provenance with every attention item", () => {
    const cockpit = composeManagementCockpit(input());

    expect(cockpit.attention[0]?.provenance).toEqual(["PROJECT_CONTROLLING"]);
  });

  it("does not duplicate the same project attention from multiple source rows", () => {
    const source = input();
    const value = usableValue(source.projectControlling);
    const duplicate = {
      ...value.rows[0],
      activityId: "activity-2",
      activityTitle: "Nachkontrolle",
    };
    const cockpit = composeManagementCockpit({
      ...source,
      projectControlling: {
        state: "AVAILABLE",
        value: { ...value, rows: [...value.rows, duplicate] },
      },
    });

    expect(cockpit.attention).toHaveLength(1);
  });

  it("does not invent attention or a drill-down when a canonical project identity is missing", () => {
    const source = input();
    const value = usableValue(source.projectControlling);
    const rowWithoutProject = { ...value.rows[0], projectSourceId: null, projectName: null };
    const cockpit = composeManagementCockpit({
      ...source,
      projectControlling: { state: "AVAILABLE", value: { ...value, rows: [rowWithoutProject] } },
    });

    expect(cockpit.attention).toEqual([]);
  });

  it.each(["avkk", "customers", "workPackages"] as const)(
    "preserves all six pre-authorised states for the %s source without creating a rights union",
    (sourceName: "avkk" | "customers" | "workPackages") => {
      const usableValues: {
        avkk: SectionValue<ManagementCockpitInput["avkk"]>;
        customers: SectionValue<ManagementCockpitInput["customers"]>;
        workPackages: SectionValue<ManagementCockpitInput["workPackages"]>;
      } = {
        avkk: { total: 1 } as SectionValue<ManagementCockpitInput["avkk"]>,
        customers: [{ customerId: "customer-a" }] as unknown as SectionValue<
          ManagementCockpitInput["customers"]
        >,
        workPackages: [{ sourceId: "wp-a" }] as unknown as SectionValue<
          ManagementCockpitInput["workPackages"]
        >,
      };
      const sourceValue = usableValues[sourceName];

      for (const state of [
        "AVAILABLE",
        "PARTIAL",
        "EMPTY",
        "UNKNOWN",
        "UNAVAILABLE",
        "DENIED",
      ] as const) {
        const section =
          state === "AVAILABLE" || state === "PARTIAL"
            ? { state, value: sourceValue }
            : { state, value: { leaked: true } };
        const cockpit = composeManagementCockpit({
          ...input(),
          [sourceName]: section,
        } as ManagementCockpitInput);

        if (state === "AVAILABLE" || state === "PARTIAL") {
          expect(cockpit[sourceName]).toEqual({ state, value: sourceValue });
        } else {
          expect(cockpit[sourceName]).toEqual({ state });
        }
      }
    },
  );

  it("strips invalid payloads from every non-usable secondary source state", () => {
    const cockpit = composeManagementCockpit({
      ...input(),
      avkk: { state: "DENIED", value: { total: 99 } } as ManagementCockpitInput["avkk"],
      customers: {
        state: "UNAVAILABLE",
        value: [{ customerId: "leak" }],
      } as ManagementCockpitInput["customers"],
      workPackages: {
        state: "EMPTY",
        value: [{ sourceId: "leak" }],
      } as ManagementCockpitInput["workPackages"],
    });

    expect(cockpit.avkk).toEqual({ state: "DENIED" });
    expect(cockpit.customers).toEqual({ state: "UNAVAILABLE" });
    expect(cockpit.workPackages).toEqual({ state: "EMPTY" });
  });

  it.each([
    "SYSTEM_ENGINEER",
    "CUSTOMER_OWNER",
    "PROJECT_MANAGER",
    "TEAM_LEAD",
    "ADMINISTRATION",
  ] as const)(
    "treats %s role preview as display metadata and never widens attention",
    (rolePreview: ManagementRolePreview) => {
      const source = input();
      const baseline = composeManagementCockpit(source);
      const preview = composeManagementCockpit({
        ...source,
        rolePreview,
      });

      expect(preview.rolePreview).toBe(rolePreview);
      expect(preview.attention).toEqual(baseline.attention);
    },
  );

  it("drops an invalid role preview instead of forwarding an untrusted display mode", () => {
    const cockpit = composeManagementCockpit({
      ...input(),
      rolePreview: "ROOT" as ManagementCockpitInput["rolePreview"],
    });

    expect(cockpit).not.toHaveProperty("rolePreview");
  });

  it("does not invent prohibited management KPIs", () => {
    const cockpit = composeManagementCockpit(input());

    expect(cockpit).not.toHaveProperty("managementScore");
    expect(cockpit).not.toHaveProperty("customerHealthPercent");
    expect(cockpit).not.toHaveProperty("projectOnTrackPercent");
    expect(cockpit).not.toHaveProperty("freshnessStatus");
    expect(cockpit).not.toHaveProperty("trend");
  });
});
