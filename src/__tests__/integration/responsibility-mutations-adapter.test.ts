import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createSupabaseResponsibilityMutationPort } from "@/integrations/supabase/responsibility-mutations-adapter";
import type { Database } from "@/integrations/supabase/types";

const RESPONSIBILITY_ID = "11111111-1111-4111-8111-111111111111";
const SUBJECT_ID = "22222222-2222-4222-8222-222222222222";
const TARGET_USER_ID = "33333333-3333-4333-8333-333333333333";

function client() {
  const rpc = vi.fn(async (fn: string) => {
    if (fn === "bsf03e_avkk_responsibility_candidates") {
      return { data: [{ user_id: TARGET_USER_ID, display_name: "Ada Beispiel" }], error: null };
    }
    if (fn === "bsf03e_end_responsibility") return { data: true, error: null };
    return { data: TARGET_USER_ID, error: null };
  });
  const maybeSingle = vi.fn(async () => ({
    data: { id: RESPONSIBILITY_ID, avkk_subject_id: SUBJECT_ID },
    error: null,
  }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return {
    supabase: { from, rpc } as unknown as SupabaseClient<Database>,
    from,
    select,
    eq,
    maybeSingle,
    rpc,
  };
}

describe("BSF-03E P3a responsibility mutation adapter", () => {
  it("derives candidate scope from the readable responsibility before calling the candidate RPC", async () => {
    const fake = client();
    const port = createSupabaseResponsibilityMutationPort(fake.supabase);

    await expect(port.listCandidates(RESPONSIBILITY_ID)).resolves.toEqual([
      { userId: TARGET_USER_ID, displayName: "Ada Beispiel" },
    ]);

    expect(fake.from).toHaveBeenCalledWith("avkk_responsibility");
    expect(fake.select).toHaveBeenCalledWith("id,avkk_subject_id");
    expect(fake.eq).toHaveBeenCalledWith("id", RESPONSIBILITY_ID);
    expect(fake.rpc).toHaveBeenCalledWith("bsf03e_avkk_responsibility_candidates", {
      _subject: SUBJECT_ID,
    });
  });

  it("uses the typed P2 RPC parameter contracts for mutations", async () => {
    const fake = client();
    const port = createSupabaseResponsibilityMutationPort(fake.supabase);

    await expect(
      port.transferOwner({ responsibilityId: RESPONSIBILITY_ID, targetUserId: TARGET_USER_ID }),
    ).resolves.toBe(TARGET_USER_ID);
    await expect(
      port.addDeputy({ responsibilityId: RESPONSIBILITY_ID, targetUserId: TARGET_USER_ID }),
    ).resolves.toBe(TARGET_USER_ID);
    await expect(port.endResponsibility({ responsibilityId: RESPONSIBILITY_ID })).resolves.toBe(
      true,
    );

    expect(fake.rpc).toHaveBeenCalledWith("bsf03e_transfer_owner", {
      _responsibility_id: RESPONSIBILITY_ID,
      _target_user_id: TARGET_USER_ID,
    });
    expect(fake.rpc).toHaveBeenCalledWith("bsf03e_add_deputy", {
      _source_responsibility_id: RESPONSIBILITY_ID,
      _target_user_id: TARGET_USER_ID,
    });
    expect(fake.rpc).toHaveBeenCalledWith("bsf03e_end_responsibility", {
      _responsibility_id: RESPONSIBILITY_ID,
    });
  });
});
