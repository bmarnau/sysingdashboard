import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc },
}));

import { fetchAvkkPeopleDirectoryRows } from "@/lib/avkk/people-directory-adapter";

describe("fetchAvkkPeopleDirectoryRows", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("ruft ausschliesslich den dedizierten AVKK-Verzeichnisvertrag auf", async () => {
    const rows = [
      {
        id: "user-georg",
        display_name: "Georg Marnau",
        role: "teamlead",
        status: "active",
      },
    ];
    rpc.mockResolvedValue({ data: rows, error: null });

    await expect(fetchAvkkPeopleDirectoryRows()).resolves.toEqual(rows);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("avkk_people_directory");
  });

  it("reicht einen RPC-Fehler weiter", async () => {
    const failure = new Error("RPC nicht verfuegbar");
    rpc.mockResolvedValue({ data: null, error: failure });

    await expect(fetchAvkkPeopleDirectoryRows()).rejects.toBe(failure);
    expect(rpc).toHaveBeenCalledWith("avkk_people_directory");
  });
});
