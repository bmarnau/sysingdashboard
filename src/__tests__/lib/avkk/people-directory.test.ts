import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchRows } = vi.hoisted(() => ({
  fetchRows: vi.fn(),
}));

vi.mock("@/lib/avkk/people-directory-adapter", () => ({
  fetchAvkkPeopleDirectoryRows: fetchRows,
}));

import { listAvkkPeopleDirectory } from "@/lib/avkk/people-directory";

describe("listAvkkPeopleDirectory", () => {
  beforeEach(() => {
    fetchRows.mockReset();
  });

  it("mappt ausschliesslich den minimalen AVKK-Verzeichnisvertrag", async () => {
    fetchRows.mockResolvedValue([
      {
        id: "user-georg",
        display_name: "Georg Marnau",
        role: "teamlead",
        status: "active",
      },
    ]);

    await expect(listAvkkPeopleDirectory()).resolves.toEqual([
      {
        id: "user-georg",
        displayName: "Georg Marnau",
        role: "teamlead",
        status: "active",
      },
    ]);
    expect(fetchRows).toHaveBeenCalledTimes(1);
  });

  it("reicht einen Adapterfehler weiter und faellt nicht auf Vollprofile zurueck", async () => {
    const failure = new Error("RPC nicht verfuegbar");
    fetchRows.mockRejectedValue(failure);

    await expect(listAvkkPeopleDirectory()).rejects.toBe(failure);
    expect(fetchRows).toHaveBeenCalledTimes(1);
  });
});
