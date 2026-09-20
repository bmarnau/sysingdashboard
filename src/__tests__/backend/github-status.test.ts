import { afterEach, describe, expect, it } from "vitest";
import {
  getGithubMainStatus,
  resetGithubMainStatusCacheForTests,
} from "../../../backend/services/githubStatus.mjs";

const MAIN_SHA = "d822046c367241868bb9f1d7e2810b3a55a3660e";

afterEach(() => {
  resetGithubMainStatusCacheForTests();
});

describe("backend/githubStatus", () => {
  it("returns the live public main SHA without credentials", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ object: { sha: MAIN_SHA } }), { status: 200 });
    };

    const result = await getGithubMainStatus({
      fetchImpl,
      now: () => Date.parse("2026-09-20T06:00:00.000Z"),
      cacheTtlMs: 0,
    });

    expect(result).toEqual({
      branch: "main",
      mainCommit: MAIN_SHA,
      checkedAt: "2026-09-20T06:00:00.000Z",
      reachable: true,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain("/repos/bmarnau/sysingdashboard/git/ref/heads/main");
    expect(calls[0]?.init?.headers).not.toHaveProperty("Authorization");
  });

  it("fails closed to not-checkable when GitHub is unavailable", async () => {
    const result = await getGithubMainStatus({
      fetchImpl: async () => new Response(null, { status: 429 }),
      now: () => Date.parse("2026-09-20T06:01:00.000Z"),
      cacheTtlMs: 0,
    });

    expect(result).toEqual({
      branch: "main",
      mainCommit: null,
      checkedAt: "2026-09-20T06:01:00.000Z",
      reachable: false,
    });
  });

  it("rejects malformed commit metadata instead of inventing sync", async () => {
    const result = await getGithubMainStatus({
      fetchImpl: async () =>
        new Response(JSON.stringify({ object: { sha: "not-a-commit" } }), { status: 200 }),
      cacheTtlMs: 0,
    });

    expect(result.reachable).toBe(false);
    expect(result.mainCommit).toBeNull();
  });
});
