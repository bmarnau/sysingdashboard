import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/integrations/supabase/types";
import type { WorkPackageWorkViewRepository } from "@/lib/avkk/work-package-work-view.types";
import {
  WORK_PACKAGE_WORK_VIEW_DENIED,
  executeWorkPackageWorkViewRequest,
  parseWorkPackageWorkViewRequest,
} from "@/lib/avkk-runtime/work-package-work-view.functions";

const USER = "11111111-1111-4111-8111-111111111111";

function authClient(options: { active?: boolean; permission?: boolean; error?: boolean } = {}) {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  return {
    calls,
    client: {
      async rpc(name: string, args: Record<string, unknown>) {
        calls.push({ name, args });
        if (options.error) return { data: null, error: { message: "synthetic rpc error" } };
        if (name === "is_account_active") return { data: options.active ?? true, error: null };
        if (name === "has_permission") return { data: options.permission ?? true, error: null };
        return { data: null, error: { message: "unexpected rpc" } };
      },
    } as unknown as SupabaseClient<Database>,
  };
}

function repository(): WorkPackageWorkViewRepository {
  return { listAuthorizedWorkPackages: vi.fn(async () => []) };
}

describe("BSF-03E P3b-1 work-package request validation", () => {
  it("accepts only an empty request and rejects every client supplied scope", () => {
    expect(parseWorkPackageWorkViewRequest({})).toEqual({});
    expect(() => parseWorkPackageWorkViewRequest({ systemhouseId: USER })).toThrow();
    expect(() => parseWorkPackageWorkViewRequest({ customerId: USER })).toThrow();
    expect(() => parseWorkPackageWorkViewRequest({ subjectId: USER })).toThrow();
  });
});

describe("BSF-03E P3b-1 work-package server authorization", () => {
  it("requires an active account and avkk.management.view before the authorized read", async () => {
    const fake = authClient();
    const repo = repository();
    await expect(
      executeWorkPackageWorkViewRequest(fake.client, USER, repo, "2026-10-03T00:00:00Z"),
    ).resolves.toEqual([]);
    expect(fake.calls).toEqual(
      expect.arrayContaining([
        { name: "is_account_active", args: { _user_id: USER } },
        { name: "has_permission", args: { _user_id: USER, _perm: "avkk.management.view" } },
      ]),
    );
    expect(repo.listAuthorizedWorkPackages).toHaveBeenCalledWith("2026-10-03T00:00:00Z");
  });

  it("denies inactive or unauthorized users without touching the repository", async () => {
    for (const options of [{ active: false }, { permission: false }]) {
      const fake = authClient(options);
      const repo = repository();
      await expect(
        executeWorkPackageWorkViewRequest(fake.client, USER, repo, "2026-10-03T00:00:00Z"),
      ).rejects.toThrow(WORK_PACKAGE_WORK_VIEW_DENIED);
      expect(repo.listAuthorizedWorkPackages).not.toHaveBeenCalled();
    }
  });

  it("fails closed on authorization check errors", async () => {
    await expect(
      executeWorkPackageWorkViewRequest(
        authClient({ error: true }).client,
        USER,
        repository(),
        "2026-10-03T00:00:00Z",
      ),
    ).rejects.toThrow(/Autorisierung konnte nicht geprüft werden/);
  });
});
