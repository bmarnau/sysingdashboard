import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/integrations/supabase/types";
import {
  INTERNAL_KIOSK_SCOPE_REQUIRED,
  currentMonthInternalKioskFilters,
  executeInternalKioskSnapshotRequest,
} from "@/lib/kiosk-runtime/internal-kiosk.functions";
import type {
  ProjectControllingRepository,
  ProjectControllingRow,
  ProjectControllingScopeOption,
} from "@/lib/project-controlling/project-controlling-contract";
import { PROJECT_CONTROLLING_DENIED } from "@/lib/project-controlling-runtime/project-controlling.functions";

const USER_ID = "33333333-3333-4333-8333-333333333333";
const SH_A = "11111111-1111-4111-8111-111111111111";
const SH_B = "11111111-1111-4111-8111-1111111111b2";

type RpcName = "has_permission" | "is_account_active" | "has_active_systemhouse_membership";

function fakeClient(
  options: { permission?: boolean; active?: boolean; membership?: boolean } = {},
) {
  const calls: Array<{ fn: RpcName; args: Record<string, unknown> }> = [];
  const client = {
    async rpc(fn: RpcName, args: Record<string, unknown>) {
      calls.push({ fn, args });
      const value =
        fn === "has_permission"
          ? (options.permission ?? true)
          : fn === "is_account_active"
            ? (options.active ?? true)
            : (options.membership ?? true);
      return { data: value, error: null };
    },
  } as unknown as SupabaseClient<Database>;

  return { client, calls };
}

function row(systemhouseId = SH_A): ProjectControllingRow {
  return {
    activityId: "activity-1",
    activityDate: "2026-09-10",
    activityTitle: "Nicht im Kiosk anzeigen",
    durationHours: 2,
    billable: true,
    billingStatus: "open",
    systemhouseId,
    systemhouseName: "Systemhaus",
    customerId: "22222222-2222-4222-8222-222222222222",
    customerName: "Kunde",
    projectSourceId: "project-1",
    projectName: "Projekt",
    workPackageSourceId: "wp-1",
    workPackageTitle: "AP",
    categoryObserved: true,
    categoryKey: "wartung",
    categoryLabel: "Wartung",
    categoryState: "known",
    projectPublishedAt: "2026-09-10T07:00:00.000Z",
    workPackagePublishedAt: "2026-09-10T08:00:00.000Z",
    activityPublishedAt: "2026-09-10T09:00:00.000Z",
  };
}

function repository(systemhouses: string[]): ProjectControllingRepository {
  const options: ProjectControllingScopeOption[] = systemhouses.map((systemhouseId) => ({
    kind: "systemhouse",
    systemhouseId,
    label: `Systemhaus ${systemhouseId}`,
  }));

  return {
    async listRows(filters) {
      return filters.systemhouseId === SH_A ? [row(SH_A)] : [];
    },
    async listScopeOptions() {
      return options;
    },
  };
}

describe("BSF-KIOSK-02 internal kiosk server contract", () => {
  it("uses the current calendar month through today", () => {
    expect(currentMonthInternalKioskFilters(new Date(2026, 8, 19, 5, 30), SH_A)).toEqual({
      from: "2026-09-01",
      to: "2026-09-19",
      billable: "all",
      systemhouseId: SH_A,
    });
  });

  it("auto-selects exactly one allowed systemhouse before aggregation", async () => {
    const { client, calls } = fakeClient();

    const outcome = await executeInternalKioskSnapshotRequest(
      client,
      USER_ID,
      undefined,
      repository([SH_A]),
      new Date(2026, 8, 19, 5, 30),
    );

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value.period).toEqual({ from: "2026-09-01", to: "2026-09-19" });
    expect(outcome.value.domains.find((domain) => domain.id === "activities")?.metrics).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Gesamtstunden", value: 2 })]),
    );
    expect(calls).toEqual(
      expect.arrayContaining([
        {
          fn: "has_permission",
          args: { _user_id: USER_ID, _perm: "project.controlling.view" },
        },
        {
          fn: "has_active_systemhouse_membership",
          args: { _user_id: USER_ID, _systemhouse_id: SH_A },
        },
      ]),
    );
  });

  it("requires explicit scope when more than one systemhouse is available", async () => {
    const { client } = fakeClient();

    await expect(
      executeInternalKioskSnapshotRequest(
        client,
        USER_ID,
        undefined,
        repository([SH_A, SH_B]),
        new Date(2026, 8, 19),
      ),
    ).resolves.toEqual({ ok: false, error: "INTERNAL_KIOSK_SCOPE_REQUIRED" });

    expect(INTERNAL_KIOSK_SCOPE_REQUIRED).toContain("Systemhaus");
  });

  it("denies a manipulated foreign systemhouse without aggregating it", async () => {
    const { client } = fakeClient();

    await expect(
      executeInternalKioskSnapshotRequest(
        client,
        USER_ID,
        SH_B,
        repository([SH_A]),
        new Date(2026, 8, 19),
      ),
    ).rejects.toThrow(PROJECT_CONTROLLING_DENIED);
  });

  it.each([
    [{ permission: false }, "missing project.controlling.view"],
    [{ active: false }, "inactive account"],
  ])("denies %s (%s)", async (auth) => {
    const { client } = fakeClient(auth);

    await expect(
      executeInternalKioskSnapshotRequest(
        client,
        USER_ID,
        undefined,
        repository([SH_A]),
        new Date(2026, 8, 19),
      ),
    ).rejects.toThrow(PROJECT_CONTROLLING_DENIED);
  });

  it("uses authenticated User-JWT wiring and contains no privileged client path", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/lib/kiosk-runtime/internal-kiosk.functions.ts"),
      "utf8",
    );

    expect(source).toContain("middleware([requireSupabaseAuth])");
    expect(source).toContain("requireProjectControllingAccess");
    expect(source).toContain("executeProjectControllingRequest");
    expect(source).not.toContain("client.server");
    expect(source).not.toContain("supabaseAdmin");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE");
    expect(source).not.toContain("service_role");
  });
});
