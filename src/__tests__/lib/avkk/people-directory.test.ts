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

  it("normalisiert Vor- und Nachnamen fuer die AVKK-Anzeige", async () => {
    fetchRows.mockResolvedValue([
      {
        id: "user-alex",
        display_name: "alex marnau",
        role: "engineer",
        status: "active",
      },
      {
        id: "user-alexa",
        display_name: "alexa Marnau",
        role: "viewer",
        status: "active",
      },
      {
        id: "user-georg",
        display_name: "georg Marnau",
        role: "teamlead",
        status: "active",
      },
      {
        id: "user-petra",
        display_name: "petra Marnau",
        role: "projectmanager",
        status: "active",
      },
      {
        id: "user-sam",
        display_name: "sam Marnau",
        role: "engineer",
        status: "active",
      },
      {
        id: "user-bernd",
        display_name: "Bernd Marnau",
        role: "sysadmin",
        status: "active",
      },
    ]);

    await expect(listAvkkPeopleDirectory()).resolves.toEqual([
      expect.objectContaining({ id: "user-alex", displayName: "Alex Marnau" }),
      expect.objectContaining({ id: "user-alexa", displayName: "Alexa Marnau" }),
      expect.objectContaining({ id: "user-georg", displayName: "Georg Marnau" }),
      expect.objectContaining({ id: "user-petra", displayName: "Petra Marnau" }),
      expect.objectContaining({ id: "user-sam", displayName: "Sam Marnau" }),
      expect.objectContaining({ id: "user-bernd", displayName: "Bernd Marnau" }),
    ]);
  });

  it("reicht einen Adapterfehler weiter und faellt nicht auf Vollprofile zurueck", async () => {
    const failure = new Error("RPC nicht verfuegbar");
    fetchRows.mockRejectedValue(failure);

    await expect(listAvkkPeopleDirectory()).rejects.toBe(failure);
    expect(fetchRows).toHaveBeenCalledTimes(1);
  });
});
