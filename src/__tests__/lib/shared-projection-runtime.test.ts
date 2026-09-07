import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createSupabaseSharedProjectionRepository } from "@/integrations/supabase/shared-projection-adapter";
import type { Database } from "@/integrations/supabase/types";
import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";
import { buildSharedDataMigrationPlan } from "@/lib/customer-data/migration";
import {
  publishSharedCustomerProjection,
  publishSharedOwnActivities,
  readSharedCustomerProjection,
  type SharedCustomerProjectionSnapshot,
  type SharedProjectionRepository,
} from "@/lib/customer-data/shared-projection-runtime";

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
    date: "2026-09-03",
    duration: 1,
    hourlyRate: 100,
    billable: true,
    billingStatus: "offen",
    ...patch,
  };
}

function plan() {
  return buildSharedDataMigrationPlan({
    systemhouseId: "sys-a",
    projects: [project()],
    workPackages: [workPackage()],
    activities: [activity()],
    customerMappings: [{ legacyName: "Acme GmbH", customerId: "cust-a" }],
  });
}

function repository(snapshot?: SharedCustomerProjectionSnapshot): SharedProjectionRepository {
  return {
    publish: vi.fn(async () => ({
      upsertedProjects: 1,
      upsertedWorkPackages: 1,
      upsertedActivities: 1,
      withdrawnProjects: 0,
      withdrawnWorkPackages: 0,
      withdrawnActivities: 0,
    })),
    readCustomer: vi.fn(
      async ({ systemhouseId, customerId }) =>
        snapshot ?? {
          systemhouseId,
          customerId,
          projects: [],
          workPackages: [],
          activities: [],
        },
    ),
  };
}

function successfulRpcResult() {
  return {
    mode: "structure",
    systemhouse_id: "sys-a",
    customer_id: "cust-a",
    published_by: "user-1",
    projects_published: 1,
    work_packages_published: 1,
    activities_published: 1,
    projects_withdrawn: 0,
    work_packages_withdrawn: 0,
    activities_withdrawn: 0,
  };
}

describe("BSF-02C shared projection runtime", () => {
  it("publishes the full fail-closed batch with full reconciliation scope", async () => {
    const repo = repository();

    const result = await publishSharedCustomerProjection(repo, {
      plan: plan(),
      customerId: "cust-a",
      publisherUserId: "user-1",
    });

    expect(repo.publish).toHaveBeenCalledTimes(1);
    const [publishedBatch, scope] = vi.mocked(repo.publish).mock.calls[0] ?? [];
    expect(publishedBatch).toEqual(
      expect.objectContaining({
        systemhouseId: "sys-a",
        customerId: "cust-a",
        publisherUserId: "user-1",
        projects: [expect.objectContaining({ id: "P-1" })],
        workPackages: [expect.objectContaining({ id: "W-1" })],
        activities: [expect.objectContaining({ id: "A-1", engineerId: "user-1" })],
      }),
    );
    expect(scope).toMatchObject({
      reconcileProjects: true,
      reconcileWorkPackages: true,
      reconcileActivities: true,
    });
    expect(scope?.observedSources.projects).toEqual(new Set(["P-1"]));
    expect(scope?.observedSources.workPackages).toEqual(new Set(["W-1"]));
    expect(scope?.observedSources.activities).toEqual(new Set(["A-1"]));
    expect(result).toMatchObject({
      upsertedProjects: 1,
      upsertedWorkPackages: 1,
      upsertedActivities: 1,
      skipped: [],
      unresolved: [],
    });
  });

  it("keeps skipped sources observed so they are not treated as deleted", async () => {
    const repo = repository();
    const migrationPlan = buildSharedDataMigrationPlan({
      systemhouseId: "sys-a",
      projects: [project()],
      workPackages: [workPackage()],
      activities: [activity({ engineerId: "user-2" })],
      customerMappings: [{ legacyName: "Acme GmbH", customerId: "cust-a" }],
    });

    const result = await publishSharedCustomerProjection(repo, {
      plan: migrationPlan,
      customerId: "cust-a",
      publisherUserId: "user-1",
    });

    const [publishedBatch, scope] = vi.mocked(repo.publish).mock.calls[0] ?? [];
    expect(publishedBatch?.activities).toEqual([]);
    expect(scope?.observedSources.activities).toEqual(new Set(["A-1"]));
    expect(result.skipped).toContainEqual({
      entityType: "activity",
      sourceId: "A-1",
      reason: "engineer_mismatch",
    });
  });

  it("keeps unresolved sources observed so they are not treated as deleted", async () => {
    const repo = repository();
    const migrationPlan = buildSharedDataMigrationPlan({
      systemhouseId: "sys-a",
      projects: [project()],
      workPackages: [workPackage()],
      activities: [activity()],
      customerMappings: [],
    });

    const result = await publishSharedCustomerProjection(repo, {
      plan: migrationPlan,
      customerId: "cust-a",
      publisherUserId: "user-1",
    });

    const [publishedBatch, scope] = vi.mocked(repo.publish).mock.calls[0] ?? [];
    expect(publishedBatch?.projects).toEqual([]);
    expect(scope?.observedSources.projects).toEqual(new Set(["P-1"]));
    expect(scope?.observedSources.workPackages).toEqual(new Set(["W-1"]));
    expect(scope?.observedSources.activities).toEqual(new Set(["A-1"]));
    expect(result.unresolved).toEqual(
      expect.arrayContaining([expect.objectContaining({ entityType: "project", sourceId: "P-1" })]),
    );
  });

  it("publishes own linked activities against an already available WorkPackage parent", async () => {
    const repo = repository();

    const result = await publishSharedOwnActivities(repo, {
      plan: plan(),
      customerId: "cust-a",
      publisherUserId: "user-1",
      availableWorkPackageSourceIds: new Set(["W-1"]),
    });

    const [publishedBatch, scope] = vi.mocked(repo.publish).mock.calls[0] ?? [];
    expect(publishedBatch?.projects).toEqual([]);
    expect(publishedBatch?.workPackages).toEqual([]);
    expect(publishedBatch?.activities).toEqual([
      expect.objectContaining({ id: "A-1", workPackageId: "W-1", engineerId: "user-1" }),
    ]);
    expect(scope).toMatchObject({
      reconcileProjects: false,
      reconcileWorkPackages: false,
      reconcileActivities: true,
    });
    expect(result.skipped).toEqual([]);
  });

  it("skips a linked own activity when its server parent is unavailable", async () => {
    const repo = repository();

    const result = await publishSharedOwnActivities(repo, {
      plan: plan(),
      customerId: "cust-a",
      publisherUserId: "user-1",
      availableWorkPackageSourceIds: new Set(),
    });

    const [publishedBatch] = vi.mocked(repo.publish).mock.calls[0] ?? [];
    expect(publishedBatch?.activities).toEqual([]);
    expect(result.skipped).toContainEqual({
      entityType: "activity",
      sourceId: "A-1",
      reason: "parent_unpublishable",
      detail: "W-1",
    });
  });

  it("reads through the provider-neutral repository port", async () => {
    const repo = repository();

    const result = await readSharedCustomerProjection(repo, {
      systemhouseId: " sys-a ",
      customerId: " cust-a ",
    });

    expect(repo.readCustomer).toHaveBeenCalledWith({
      systemhouseId: "sys-a",
      customerId: "cust-a",
    });
    expect(result.systemhouseId).toBe("sys-a");
    expect(result.customerId).toBe("cust-a");
  });

  it("rejects empty read scope before any provider call", async () => {
    const repo = repository();

    await expect(
      readSharedCustomerProjection(repo, { systemhouseId: " ", customerId: "cust-a" }),
    ).rejects.toThrow("systemhouseId is required");
    expect(repo.readCustomer).not.toHaveBeenCalled();
  });
});

describe("BSF-02C Supabase transactional publish adapter", () => {
  it("uses exactly one RPC for a full structure snapshot and no direct table write", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: successfulRpcResult(), error: null });
    const from = vi.fn();
    const client = { rpc, from } as unknown as SupabaseClient<Database>;
    const repo = createSupabaseSharedProjectionRepository(client);

    const result = await publishSharedCustomerProjection(repo, {
      plan: plan(),
      customerId: "cust-a",
      publisherUserId: "user-1",
    });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalled();

    const [functionName, args] = rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(functionName).toBe("bsf02c_publish_shared_projection_snapshot");
    expect(args).toMatchObject({
      p_systemhouse_id: "sys-a",
      p_customer_id: "cust-a",
      p_mode: "structure",
      p_snapshot_complete: true,
      p_observed_project_source_ids: ["P-1"],
      p_observed_work_package_source_ids: ["W-1"],
      p_observed_activity_source_ids: ["A-1"],
    });
    expect(args.p_projects).toEqual([
      expect.objectContaining({
        source_id: "P-1",
        legacy_client: "Acme GmbH",
        source_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    ]);
    expect(args.p_work_packages).toEqual([
      expect.objectContaining({
        source_id: "W-1",
        project_source_id: "P-1",
        parent_link_status: "linked",
        source_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    ]);
    expect(args.p_activities).toEqual([
      expect.objectContaining({
        source_id: "A-1",
        work_package_source_id: "W-1",
        engineer_id: "user-1",
        source_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    ]);
    expect(result).toMatchObject({
      upsertedProjects: 1,
      upsertedWorkPackages: 1,
      upsertedActivities: 1,
      withdrawnProjects: 0,
      withdrawnWorkPackages: 0,
      withdrawnActivities: 0,
    });
  });

  it("uses activity mode without structure payload or structure reconciliation", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        ...successfulRpcResult(),
        mode: "activities",
        projects_published: 0,
        work_packages_published: 0,
      },
      error: null,
    });
    const from = vi.fn();
    const client = { rpc, from } as unknown as SupabaseClient<Database>;
    const repo = createSupabaseSharedProjectionRepository(client);

    await publishSharedOwnActivities(repo, {
      plan: plan(),
      customerId: "cust-a",
      publisherUserId: "user-1",
      availableWorkPackageSourceIds: new Set(["W-1"]),
    });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalled();
    const [, args] = rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(args).toMatchObject({
      p_mode: "activities",
      p_snapshot_complete: true,
      p_projects: [],
      p_work_packages: [],
      p_observed_project_source_ids: [],
      p_observed_work_package_source_ids: [],
      p_observed_activity_source_ids: ["A-1"],
    });
    expect(args.p_activities).toEqual([
      expect.objectContaining({
        source_id: "A-1",
        engineer_id: "user-1",
        work_package_source_id: "W-1",
      }),
    ]);
  });

  it("fails closed when the transactional RPC returns an error", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "denied" },
    });
    const client = { rpc, from: vi.fn() } as unknown as SupabaseClient<Database>;
    const repo = createSupabaseSharedProjectionRepository(client);

    await expect(
      publishSharedCustomerProjection(repo, {
        plan: plan(),
        customerId: "cust-a",
        publisherUserId: "user-1",
      }),
    ).rejects.toThrow("atomarer Snapshot-Publish");
  });
});
