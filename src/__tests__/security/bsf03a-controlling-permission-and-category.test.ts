/**
 * BSF-03A / L1B — Tasks 1–3 Vertragstests
 *
 * Prüfgegenstand:
 *  1. Neue atomare Permission `project.controlling.view` (Frontend + Backend).
 *  2. Kategorie-Brücke im providerneutralen Shared-Projection-Vertrag.
 *  3. Supabase-Adapter-Payload inklusive `category_key` und Source-Hash.
 *
 * Es werden ausschließlich synthetische Daten verwendet.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ALL_PERMISSIONS,
  PERMISSION_LABEL,
  ROLE_PERMISSIONS,
  can,
  type Permission,
} from "@/lib/rbac/permissions";
import type { UserProfile, UserRole } from "@/lib/user-management";
import { prepareSharedCustomerPublishBatch } from "@/lib/customer-data/shared-projection-contract";
import { buildSharedDataMigrationPlan } from "@/lib/customer-data/migration";
import { createSupabaseSharedProjectionRepository } from "@/integrations/supabase/shared-projection-adapter";

const PERM = "project.controlling.view" as Permission;

const ALLOW: UserRole[] = ["systemadministrator", "administrator", "teamlead", "projectmanager"];
const DENY: UserRole[] = ["engineer", "viewer", "customer", "kiosk"];

function userOf(role: UserRole): UserProfile {
  return { id: `u-${role}`, role } as unknown as UserProfile;
}

describe("BSF-03A Permission project.controlling.view", () => {
  it("ist als atomare Permission registriert und beschriftet", () => {
    expect(ALL_PERMISSIONS).toContain(PERM);
    expect(PERMISSION_LABEL[PERM]).toBeTruthy();
  });

  it.each(ALLOW)("ALLOW für %s", (role) => {
    expect(ROLE_PERMISSIONS[role]).toContain(PERM);
    expect(can(userOf(role), PERM)).toBe(true);
  });

  it.each(DENY)("DENY für %s", (role) => {
    expect(ROLE_PERMISSIONS[role]).not.toContain(PERM);
    expect(can(userOf(role), PERM)).toBe(false);
  });

  it("Backend-RBAC ist deckungsgleich", async () => {
    const backend = (await import("../../../backend/services/rbac.mjs")) as {
      ALL_PERMISSIONS: readonly string[];
      ROLE_PERMISSIONS: Record<string, readonly string[]>;
    };
    expect(backend.ALL_PERMISSIONS).toContain(PERM);
    for (const role of ALLOW) expect(backend.ROLE_PERMISSIONS[role]).toContain(PERM);
    for (const role of DENY) expect(backend.ROLE_PERMISSIONS[role] ?? []).not.toContain(PERM);
  });

  it("ist in der RBAC-Dokumentation beschrieben", () => {
    const doc = readFileSync(resolve(process.cwd(), "docs/RBAC-MATRIX.md"), "utf8");
    expect(doc).toContain(PERM);
  });
});

function planWith(categoryKey: string | null | undefined) {
  return buildSharedDataMigrationPlan({
    systemhouseId: "11111111-1111-4111-8111-111111111111",
    projects: [
      {
        id: "P-1",
        name: "Synthetisches Projekt",
        client: "Kunde Alpha",
        status: "active",
      } as never,
    ],
    workPackages: [
      {
        id: "WP-1",
        projectId: "P-1",
        title: "Synthetisches Arbeitspaket",
        client: "Kunde Alpha",
        status: "open",
        priority: "medium",
        categoryKey,
      } as never,
    ],
    activities: [],
    customerMappings: [
      { legacyName: "Kunde Alpha", customerId: "22222222-2222-4222-8222-222222222222" },
    ] as never,
  });
}

function batchFor(categoryKey: string | null | undefined) {
  return prepareSharedCustomerPublishBatch({
    plan: planWith(categoryKey),
    customerId: "22222222-2222-4222-8222-222222222222",
    publisherUserId: "33333333-3333-4333-8333-333333333333",
  });
}

describe("BSF-03A Kategorie-Brücke im Shared-Projection-Vertrag", () => {
  it("führt categoryKey als Identität mit", () => {
    const batch = batchFor("wartung");
    expect(batch.workPackages[0]?.categoryKey).toBe("wartung");
  });

  it("bildet 'keine Kategorie' explizit als null ab", () => {
    expect(batchFor(null).workPackages[0]?.categoryKey).toBeNull();
    expect(batchFor(undefined).workPackages[0]?.categoryKey).toBeNull();
  });

  it("behält unbekannte historische Keys unverändert bei", () => {
    expect(batchFor("historisch-unbekannt").workPackages[0]?.categoryKey).toBe(
      "historisch-unbekannt",
    );
  });
});

type RpcArgs = Record<string, unknown>;

function fakeClient(capture: { args?: RpcArgs }) {
  return {
    rpc: async (_fn: string, args: RpcArgs) => {
      capture.args = args;
      return {
        data: {
          projects_published: 1,
          work_packages_published: 1,
          activities_published: 0,
          projects_withdrawn: 0,
          work_packages_withdrawn: 0,
          activities_withdrawn: 0,
        },
        error: null,
      };
    },
  } as never;
}

async function publishPayload(categoryKey: string | null) {
  const capture: { args?: RpcArgs } = {};
  const repo = createSupabaseSharedProjectionRepository(fakeClient(capture));
  await repo.publish(batchFor(categoryKey), {
    reconcileProjects: true,
    reconcileWorkPackages: true,
    reconcileActivities: true,
    observedSources: {
      projects: new Set(["P-1"]),
      workPackages: new Set(["WP-1"]),
      activities: new Set<string>(),
    },
  });
  const wps = capture.args?.["p_work_packages"] as Array<Record<string, unknown>>;
  return wps[0] as Record<string, unknown>;
}

describe("BSF-03A Supabase-Adapter-Payload", () => {
  it("überträgt category_key immer explizit (auch null)", async () => {
    const withKey = await publishPayload("wartung");
    expect(withKey["category_key"]).toBe("wartung");

    const withoutKey = await publishPayload(null);
    expect(Object.prototype.hasOwnProperty.call(withoutKey, "category_key")).toBe(true);
    expect(withoutKey["category_key"]).toBeNull();
  });

  it("berücksichtigt categoryKey im Source-Hash", async () => {
    const a = await publishPayload("wartung");
    const b = await publishPayload("projektarbeit");
    const c = await publishPayload(null);
    expect(a["source_hash"]).not.toBe(b["source_hash"]);
    expect(a["source_hash"]).not.toBe(c["source_hash"]);
  });
});
