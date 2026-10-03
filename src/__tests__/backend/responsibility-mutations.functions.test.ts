import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/integrations/supabase/types";
import type { ResponsibilityMutationPort } from "@/lib/avkk/responsibility-mutations";
import {
  executeResponsibilityCandidatesRequest,
  parseAddDeputyRequest,
  parseEndResponsibilityRequest,
  parseResponsibilityCandidatesRequest,
  parseTransferOwnerRequest,
  requireResponsibilityMutationAccess,
} from "@/lib/avkk-runtime/responsibility-mutations.functions";

const USER = "11111111-1111-4111-8111-111111111111";
const RESPONSIBILITY = "22222222-2222-4222-8222-222222222222";
const TARGET = "33333333-3333-4333-8333-333333333333";

function fakeAuthClient(options: { active?: boolean; permission?: boolean; error?: boolean } = {}) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const client = {
    async rpc(fn: string, args: Record<string, unknown>) {
      calls.push({ fn, args });
      if (options.error) return { data: null, error: { message: "synthetic" } };
      if (fn === "is_account_active") return { data: options.active ?? true, error: null };
      if (fn === "has_permission") return { data: options.permission ?? true, error: null };
      return { data: null, error: { message: "unexpected" } };
    },
  } as unknown as SupabaseClient<Database>;
  return { client, calls };
}

function port(): ResponsibilityMutationPort {
  return {
    listCandidates: vi.fn(async () => [{ userId: TARGET, displayName: "Ada Beispiel" }]),
    transferOwner: vi.fn(async () => TARGET),
    addDeputy: vi.fn(async () => TARGET),
    endResponsibility: vi.fn(async () => true),
  };
}

describe("BSF-03E P3a responsibility mutation inputs", () => {
  it("accepts only strict UUID payloads and rejects client supplied scopes", () => {
    expect(parseResponsibilityCandidatesRequest({ responsibilityId: RESPONSIBILITY })).toEqual({
      responsibilityId: RESPONSIBILITY,
    });
    expect(
      parseTransferOwnerRequest({ responsibilityId: RESPONSIBILITY, targetUserId: TARGET }),
    ).toEqual({ responsibilityId: RESPONSIBILITY, targetUserId: TARGET });
    expect(
      parseAddDeputyRequest({ responsibilityId: RESPONSIBILITY, targetUserId: TARGET }),
    ).toEqual({ responsibilityId: RESPONSIBILITY, targetUserId: TARGET });
    expect(parseEndResponsibilityRequest({ responsibilityId: RESPONSIBILITY })).toEqual({
      responsibilityId: RESPONSIBILITY,
    });
    for (const extra of ["subjectId", "systemhouseId", "customerId"]) {
      expect(() =>
        parseResponsibilityCandidatesRequest({ responsibilityId: RESPONSIBILITY, [extra]: USER }),
      ).toThrow();
    }
    expect(() =>
      parseTransferOwnerRequest({ responsibilityId: "not-a-uuid", targetUserId: TARGET }),
    ).toThrow();
    expect(() =>
      parseAddDeputyRequest({ responsibilityId: RESPONSIBILITY, targetUserId: "not-a-uuid" }),
    ).toThrow();
  });
});

describe("BSF-03E P3a responsibility mutation authorization", () => {
  it("requires active account and avkk.responsibility.assign", async () => {
    const { client, calls } = fakeAuthClient();
    await requireResponsibilityMutationAccess(client, USER);
    expect(calls).toEqual(
      expect.arrayContaining([
        { fn: "is_account_active", args: { _user_id: USER } },
        { fn: "has_permission", args: { _user_id: USER, _perm: "avkk.responsibility.assign" } },
      ]),
    );
  });

  it("denies inactive, denied, and failed authorization checks", async () => {
    await expect(
      requireResponsibilityMutationAccess(fakeAuthClient({ active: false }).client, USER),
    ).rejects.toThrow(/nicht zulässig/);
    await expect(
      requireResponsibilityMutationAccess(fakeAuthClient({ permission: false }).client, USER),
    ).rejects.toThrow(/nicht zulässig/);
    await expect(
      requireResponsibilityMutationAccess(fakeAuthClient({ error: true }).client, USER),
    ).rejects.toThrow(/nicht autorisiert/);
  });

  it("derives candidates only through the server-side responsibility port after authorization", async () => {
    const { client } = fakeAuthClient();
    const mutationPort = port();
    await expect(
      executeResponsibilityCandidatesRequest(
        client,
        USER,
        { responsibilityId: RESPONSIBILITY },
        mutationPort,
      ),
    ).resolves.toEqual([{ userId: TARGET, displayName: "Ada Beispiel" }]);
    expect(mutationPort.listCandidates).toHaveBeenCalledWith(RESPONSIBILITY);
  });
});
