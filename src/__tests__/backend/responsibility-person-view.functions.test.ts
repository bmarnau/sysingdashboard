import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/integrations/supabase/types";
import type {
  ResponsibilityPersonViewRepository,
  ResponsibilityPersonViewSourceRow,
} from "@/lib/avkk/responsibility-management.types";
import {
  RESPONSIBILITY_PERSON_VIEW_DENIED,
  executeResponsibilityPersonViewRequest,
  parseResponsibilityPersonViewRequest,
} from "@/lib/avkk-runtime/responsibility-person-view.functions";

const USER = "11111111-1111-4111-8111-111111111111";
const PERSON = "22222222-2222-4222-8222-222222222222";

interface RpcCall {
  fn: string;
  args: Record<string, unknown>;
}

function fakeAuthClient(
  options: { active?: boolean; permission?: boolean; error?: boolean } = {},
): {
  client: SupabaseClient<Database>;
  calls: RpcCall[];
} {
  const calls: RpcCall[] = [];
  const client = {
    async rpc(fn: string, args: Record<string, unknown>) {
      calls.push({ fn, args });
      if (options.error) return { data: null, error: { message: "synthetic rpc error" } };
      if (fn === "is_account_active") return { data: options.active ?? true, error: null };
      if (fn === "has_permission") return { data: options.permission ?? true, error: null };
      return { data: null, error: { message: "unexpected rpc" } };
    },
  } as unknown as SupabaseClient<Database>;
  return { client, calls };
}

function sourceRow(): ResponsibilityPersonViewSourceRow {
  return {
    responsibilityId: "33333333-3333-4333-8333-333333333333",
    subjectRef: "44444444-4444-4444-8444-444444444444",
    personId: PERSON,
    displayName: "Ada Beispiel",
    role: "owner",
    subjectType: "project",
    subjectId: "P-1",
    title: "Projekt Eins",
    systemhouseId: "55555555-5555-4555-8555-555555555555",
    customerId: "66666666-6666-4666-8666-666666666666",
    customerName: "Kunde Eins",
    status: "active",
    due: null,
    missingCount: 0,
    partialCount: 0,
    supportNeeded: false,
    validFrom: "2026-09-01T00:00:00Z",
    validTo: null,
  };
}

function repository(): ResponsibilityPersonViewRepository {
  return {
    listByPerson: vi.fn(async () => [sourceRow()]),
    readRiskThreshold: vi.fn(async () => ({ missingCount: 1, partialCount: 2 })),
  };
}

describe("BSF-03E P1 person-view request validation", () => {
  it("accepts only a UUID personId", () => {
    expect(parseResponsibilityPersonViewRequest({ personId: PERSON })).toEqual({
      personId: PERSON,
    });
    expect(() => parseResponsibilityPersonViewRequest({ personId: "not-a-uuid" })).toThrow();
    expect(() =>
      parseResponsibilityPersonViewRequest({ personId: PERSON, systemhouseId: USER }),
    ).toThrow();
  });
});

describe("BSF-03E P1 person-view server authorization", () => {
  it("requires an active account and avkk.management.view before reading the repository", async () => {
    const { client, calls } = fakeAuthClient();
    const repo = repository();

    const rows = await executeResponsibilityPersonViewRequest(client, USER, PERSON, repo);

    expect(rows).toHaveLength(1);
    expect(calls).toEqual(
      expect.arrayContaining([
        { fn: "is_account_active", args: { _user_id: USER } },
        {
          fn: "has_permission",
          args: { _user_id: USER, _perm: "avkk.management.view" },
        },
      ]),
    );
    expect(repo.listByPerson).toHaveBeenCalledWith(PERSON);
  });

  it("denies viewer/engineer/customer semantics when avkk.management.view is absent", async () => {
    const { client } = fakeAuthClient({ permission: false });
    const repo = repository();

    await expect(
      executeResponsibilityPersonViewRequest(client, USER, PERSON, repo),
    ).rejects.toThrow(RESPONSIBILITY_PERSON_VIEW_DENIED);
    expect(repo.listByPerson).not.toHaveBeenCalled();
  });

  it("denies an inactive account without touching the repository", async () => {
    const { client } = fakeAuthClient({ active: false });
    const repo = repository();

    await expect(
      executeResponsibilityPersonViewRequest(client, USER, PERSON, repo),
    ).rejects.toThrow(RESPONSIBILITY_PERSON_VIEW_DENIED);
    expect(repo.listByPerson).not.toHaveBeenCalled();
  });

  it("fails closed when authorization cannot be checked", async () => {
    const { client } = fakeAuthClient({ error: true });

    await expect(
      executeResponsibilityPersonViewRequest(client, USER, PERSON, repository()),
    ).rejects.toThrow(/Autorisierung konnte nicht geprüft werden/);
  });
});
