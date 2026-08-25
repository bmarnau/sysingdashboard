import { describe, expect, it } from "vitest";

import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";
import {
  buildSharedDataMigrationPlan,
  normalizeLegacyCustomerName,
} from "@/lib/customer-data/migration";

function project(patch: Partial<Project> = {}): Project {
  return {
    id: "P-1",
    name: "Projekt",
    client: "Acme GmbH",
    status: "on_track",
    ...patch,
  };
}

function workPackage(patch: Partial<WorkPackage> = {}): WorkPackage {
  return {
    id: "W-1",
    title: "Arbeitspaket",
    projectId: "P-1",
    status: "offen",
    priority: "mittel",
    ...patch,
  };
}

function activity(patch: Partial<Activity> = {}): Activity {
  return {
    id: "A-1",
    title: "Tätigkeit",
    workPackageId: "W-1",
    date: "2026-08-25",
    duration: 1,
    hourlyRate: 100,
    billable: true,
    billingStatus: "offen",
    ...patch,
  };
}

describe("BSF-02 customer data migration planning", () => {
  it("should_normalizeLegacyCustomerName_withoutUsingItAsIdentity", () => {
    expect(normalizeLegacyCustomerName("  Müller   GmbH ")).toBe("muller gmbh");
  });

  it("should_notInventCustomerId_when_onlyLegacyNameOrSyntheticBridgeExists", () => {
    const plan = buildSharedDataMigrationPlan({
      systemhouseId: "sys-a",
      projects: [project({ customerId: "cust-acme-gmbh" })],
      workPackages: [],
      activities: [],
      customerMappings: [],
    });

    expect(plan.projects[0].id).toBe("P-1");
    expect(plan.projects[0].customerId).toBeNull();
    expect(plan.projects[0].customerResolution.reason).toBe("mapping_missing");
    expect(plan.customerCandidates[0].mappedCustomerId).toBeUndefined();
  });

  it("should_resolveExplicitMapping_andPreserveObjectIds", () => {
    const plan = buildSharedDataMigrationPlan({
      systemhouseId: "sys-a",
      projects: [project()],
      workPackages: [workPackage()],
      activities: [activity()],
      customerMappings: [{ legacyName: "Acme GmbH", customerId: "c-acme" }],
    });

    expect(plan.projects[0]).toMatchObject({ id: "P-1", customerId: "c-acme" });
    expect(plan.workPackages[0]).toMatchObject({
      id: "W-1",
      customerId: "c-acme",
      projectLinkStatus: "linked",
    });
    expect(plan.activities[0]).toMatchObject({
      id: "A-1",
      customerId: "c-acme",
      workPackageLinkStatus: "linked",
    });
    expect(plan.unresolvedCount).toBe(0);
  });

  it("should_keepOrphanWorkPackage_when_customerContextIsExplicit", () => {
    const plan = buildSharedDataMigrationPlan({
      systemhouseId: "sys-a",
      projects: [],
      workPackages: [workPackage({ id: "WP-2047", projectId: null, client: "Intern" })],
      activities: [],
      customerMappings: [{ legacyName: "Intern", customerId: "c-intern" }],
    });

    expect(plan.workPackages[0]).toMatchObject({
      id: "WP-2047",
      projectId: null,
      projectLinkStatus: "none",
      customerId: "c-intern",
    });
  });

  it("should_keepOrphanActivity_when_customerContextIsExplicit", () => {
    const plan = buildSharedDataMigrationPlan({
      systemhouseId: "sys-a",
      projects: [],
      workPackages: [],
      activities: [
        activity({ id: "A-9006", workPackageId: null, client: "Stadtwerke Lindau" }),
      ],
      customerMappings: [{ legacyName: "Stadtwerke Lindau", customerId: "c-stadtwerke" }],
    });

    expect(plan.activities[0]).toMatchObject({
      id: "A-9006",
      workPackageId: null,
      workPackageLinkStatus: "none",
      customerId: "c-stadtwerke",
    });
  });

  it("should_markParentChildCustomerConflict_asUnresolved", () => {
    const plan = buildSharedDataMigrationPlan({
      systemhouseId: "sys-a",
      projects: [project({ client: "Acme GmbH" })],
      workPackages: [workPackage({ client: "Beta GmbH" })],
      activities: [],
      customerMappings: [
        { legacyName: "Acme GmbH", customerId: "c-acme" },
        { legacyName: "Beta GmbH", customerId: "c-beta" },
      ],
    });

    expect(plan.workPackages[0].customerId).toBeNull();
    expect(plan.workPackages[0].customerResolution.reason).toBe("customer_context_conflict");
    expect(plan.workPackages[0].projectLinkStatus).toBe("linked");
  });

  it("should_markMissingParent_separatelyWithoutDroppingResolvedRow", () => {
    const plan = buildSharedDataMigrationPlan({
      systemhouseId: "sys-a",
      projects: [],
      workPackages: [workPackage({ projectId: "P-missing", client: "Acme GmbH" })],
      activities: [],
      customerMappings: [{ legacyName: "Acme GmbH", customerId: "c-acme" }],
    });

    expect(plan.workPackages[0]).toMatchObject({
      id: "W-1",
      projectId: "P-missing",
      projectLinkStatus: "missing",
      customerId: "c-acme",
    });
  });

  it("should_inheritCustomerContext_throughLinkedParents", () => {
    const plan = buildSharedDataMigrationPlan({
      systemhouseId: "sys-a",
      projects: [project()],
      workPackages: [workPackage({ client: undefined })],
      activities: [activity({ client: undefined })],
      customerMappings: [{ legacyName: "Acme GmbH", customerId: "c-acme" }],
    });

    expect(plan.workPackages[0].customerId).toBe("c-acme");
    expect(plan.activities[0].customerId).toBe("c-acme");
  });

  it("should_rejectConflictingMappings_forSameNormalizedLegacyName", () => {
    expect(() =>
      buildSharedDataMigrationPlan({
        systemhouseId: "sys-a",
        projects: [project({ client: "Müller GmbH" })],
        workPackages: [],
        activities: [],
        customerMappings: [
          { legacyName: "Müller GmbH", customerId: "c-1" },
          { legacyName: "Muller   GmbH", customerId: "c-2" },
        ],
      }),
    ).toThrow(/Conflicting customer mapping/);
  });
});
