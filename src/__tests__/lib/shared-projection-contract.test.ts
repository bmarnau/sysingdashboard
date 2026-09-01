import { describe, expect, it } from "vitest";

import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";
import { buildSharedDataMigrationPlan } from "@/lib/customer-data/migration";
import {
  prepareSharedCustomerPublishBatch,
  sharedProjectionIdentityKey,
} from "@/lib/customer-data/shared-projection-contract";

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
    engineerId: "user-1",
    date: "2026-09-01",
    duration: 1,
    hourlyRate: 100,
    billable: true,
    billingStatus: "offen",
    ...patch,
  };
}

function plan(input: {
  projects?: Project[];
  workPackages?: WorkPackage[];
  activities?: Activity[];
  mappings?: Array<{ legacyName: string; customerId: string }>;
}) {
  return buildSharedDataMigrationPlan({
    systemhouseId: "sys-a",
    projects: input.projects ?? [project()],
    workPackages: input.workPackages ?? [workPackage()],
    activities: input.activities ?? [activity()],
    customerMappings: input.mappings ?? [{ legacyName: "Acme GmbH", customerId: "cust-a" }],
  });
}

describe("BSF-02C shared projection contract", () => {
  it("should_keepPublisherOutOfTheProjectionIdentity", () => {
    expect(sharedProjectionIdentityKey("project", "sys-a", "cust-a", "P-1")).toBe(
      "project:sys-a:cust-a:P-1",
    );
  });

  it("should_prepareResolvedCustomerChain_withoutChangingSourceIds", () => {
    const batch = prepareSharedCustomerPublishBatch({
      plan: plan({}),
      customerId: "cust-a",
      publisherUserId: "user-1",
    });

    expect(batch.projects.map((entry) => entry.id)).toEqual(["P-1"]);
    expect(batch.workPackages.map((entry) => entry.id)).toEqual(["W-1"]);
    expect(batch.activities.map((entry) => entry.id)).toEqual(["A-1"]);
    expect(batch.skipped).toEqual([]);
    expect(batch.unresolved).toEqual([]);
  });

  it("should_allowExplicitParentlessWorkPackageAndActivity", () => {
    const migrationPlan = plan({
      projects: [],
      workPackages: [workPackage({ id: "W-orphan", projectId: null, client: "Acme GmbH" })],
      activities: [
        activity({
          id: "A-orphan",
          workPackageId: null,
          client: "Acme GmbH",
          engineerId: "user-1",
        }),
      ],
    });

    const batch = prepareSharedCustomerPublishBatch({
      plan: migrationPlan,
      customerId: "cust-a",
      publisherUserId: "user-1",
    });

    expect(batch.workPackages.map((entry) => entry.id)).toEqual(["W-orphan"]);
    expect(batch.activities.map((entry) => entry.id)).toEqual(["A-orphan"]);
    expect(batch.skipped).toEqual([]);
  });

  it("should_skipMissingParents_failClosed", () => {
    const migrationPlan = plan({
      projects: [],
      workPackages: [workPackage({ id: "W-missing", projectId: "P-missing", client: "Acme GmbH" })],
      activities: [],
    });

    const batch = prepareSharedCustomerPublishBatch({
      plan: migrationPlan,
      customerId: "cust-a",
      publisherUserId: "user-1",
    });

    expect(batch.workPackages).toEqual([]);
    expect(batch.skipped).toContainEqual({
      entityType: "workpackage",
      sourceId: "W-missing",
      reason: "parent_missing",
      detail: "P-missing",
    });
  });

  it("should_skipChild_whenLinkedParentIsNotPublishable", () => {
    const migrationPlan = plan({
      projects: [project(), project({ name: "Doppelte lokale Kopie" })],
      workPackages: [workPackage()],
      activities: [],
    });

    const batch = prepareSharedCustomerPublishBatch({
      plan: migrationPlan,
      customerId: "cust-a",
      publisherUserId: "user-1",
    });

    expect(batch.projects).toEqual([]);
    expect(batch.workPackages).toEqual([]);
    expect(batch.skipped.filter((entry) => entry.reason === "source_id_collision")).toHaveLength(2);
    expect(batch.skipped).toContainEqual({
      entityType: "workpackage",
      sourceId: "W-1",
      reason: "parent_unpublishable",
      detail: "P-1",
    });
  });

  it("should_rejectActivityWithoutStableEngineerIdentity", () => {
    const migrationPlan = plan({ activities: [activity({ engineerId: undefined })] });

    const batch = prepareSharedCustomerPublishBatch({
      plan: migrationPlan,
      customerId: "cust-a",
      publisherUserId: "user-1",
    });

    expect(batch.activities).toEqual([]);
    expect(batch.skipped).toContainEqual({
      entityType: "activity",
      sourceId: "A-1",
      reason: "engineer_missing",
    });
  });

  it("should_rejectActivityForDifferentEngineer", () => {
    const migrationPlan = plan({ activities: [activity({ engineerId: "user-2" })] });

    const batch = prepareSharedCustomerPublishBatch({
      plan: migrationPlan,
      customerId: "cust-a",
      publisherUserId: "user-1",
    });

    expect(batch.activities).toEqual([]);
    expect(batch.skipped).toContainEqual({
      entityType: "activity",
      sourceId: "A-1",
      reason: "engineer_mismatch",
    });
  });

  it("should_failClosedOnSourceIdCollisionAcrossCustomers_forAvkkCompatibility", () => {
    const migrationPlan = plan({
      projects: [
        project({ id: "P-shared", client: "Acme GmbH" }),
        project({ id: "P-shared", client: "Beta GmbH", name: "Anderer Kunde" }),
      ],
      workPackages: [],
      activities: [],
      mappings: [
        { legacyName: "Acme GmbH", customerId: "cust-a" },
        { legacyName: "Beta GmbH", customerId: "cust-b" },
      ],
    });

    const batchA = prepareSharedCustomerPublishBatch({
      plan: migrationPlan,
      customerId: "cust-a",
      publisherUserId: "user-1",
    });
    const batchB = prepareSharedCustomerPublishBatch({
      plan: migrationPlan,
      customerId: "cust-b",
      publisherUserId: "user-1",
    });

    expect(batchA.projects).toEqual([]);
    expect(batchB.projects).toEqual([]);
    expect(batchA.skipped).toContainEqual({
      entityType: "project",
      sourceId: "P-shared",
      reason: "source_id_collision",
    });
    expect(batchB.skipped).toContainEqual({
      entityType: "project",
      sourceId: "P-shared",
      reason: "source_id_collision",
    });
  });

  it("should_reportUnresolvedEntries_withoutGuessingCustomerIdentity", () => {
    const migrationPlan = plan({
      projects: [project({ client: "Unbekannt GmbH" })],
      workPackages: [],
      activities: [],
      mappings: [],
    });

    const batch = prepareSharedCustomerPublishBatch({
      plan: migrationPlan,
      customerId: "cust-a",
      publisherUserId: "user-1",
    });

    expect(batch.projects).toEqual([]);
    expect(batch.unresolved).toEqual([
      {
        entityType: "project",
        sourceId: "P-1",
        reason: "mapping_missing",
      },
    ]);
  });

  it("should_rejectEmptyScopeOrPublisher", () => {
    const migrationPlan = plan({});

    expect(() =>
      prepareSharedCustomerPublishBatch({
        plan: migrationPlan,
        customerId: " ",
        publisherUserId: "user-1",
      }),
    ).toThrow("customerId is required");

    expect(() =>
      prepareSharedCustomerPublishBatch({
        plan: migrationPlan,
        customerId: "cust-a",
        publisherUserId: " ",
      }),
    ).toThrow("publisherUserId is required");
  });
});
