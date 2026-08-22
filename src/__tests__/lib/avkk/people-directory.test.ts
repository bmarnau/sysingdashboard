import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc },
}));

import { listAvkkPeopleDirectory } from "@/lib/avkk/people-directory";

describe("listAvkkPeopleDirectory", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("ruft ausschliesslich den dedizierten AVKK-Verzeichnisvertrag auf", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          id: "user-georg",
          display_name: "Georg Marnau",
          role: "teamlead",
          status: "active",
        },
      ],
      error: null,
    });

    await expect(listAvkkPeopleDirectory()).resolves.toEqual([
      {
        id: "user-georg",
        displayName: "Georg Marnau",
        role: "teamlead",
        status: "active",
      },
    ]);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("avkk_people_directory");
  });

  it("reicht einen Serverfehler weiter und faellt nicht auf Vollprofile zurueck", async () => {
    const failure = new Error("RPC nicht verfuegbar");
    rpc.mockResolvedValue({ data: null, error: failure });

    await expect(listAvkkPeopleDirectory()).rejects.toBe(failure);
    expect(rpc).toHaveBeenCalledWith("avkk_people_directory");
  });
});
