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
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init });
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
      failure: null,
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
      failure: { reason: "http_error", httpStatus: 429, rateLimitRemaining: null },
    });
  });

  it("reports an exhausted anonymous rate limit as the failure cause", async () => {
    const result = await getGithubMainStatus({
      fetchImpl: async () =>
        new Response(null, { status: 403, headers: { "x-ratelimit-remaining": "0" } }),
      cacheTtlMs: 0,
    });

    expect(result.reachable).toBe(false);
    expect(result.failure).toEqual({
      reason: "http_error",
      httpStatus: 403,
      rateLimitRemaining: 0,
    });
  });

  it("reports a timeout separately from other network errors", async () => {
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
    const timeout = await getGithubMainStatus({
      fetchImpl: async () => {
        throw abortError;
      },
      cacheTtlMs: 0,
    });
    const network = await getGithubMainStatus({
      fetchImpl: async () => {
        throw new TypeError("fetch failed");
      },
      cacheTtlMs: 0,
    });

    expect(timeout.failure).toEqual({
      reason: "timeout",
      httpStatus: null,
      rateLimitRemaining: null,
    });
    expect(network.failure).toEqual({
      reason: "network_error",
      httpStatus: null,
      rateLimitRemaining: null,
    });
  });

  it("reports a missing fetch implementation", async () => {
    const result = await getGithubMainStatus({
      fetchImpl: null as unknown as typeof fetch,
      cacheTtlMs: 0,
    });

    expect(result.reachable).toBe(false);
    expect(result.failure?.reason).toBe("fetch_unavailable");
  });

  it("rejects malformed commit metadata instead of inventing sync", async () => {
    const result = await getGithubMainStatus({
      fetchImpl: async () =>
        new Response(JSON.stringify({ object: { sha: "not-a-commit" } }), { status: 200 }),
      cacheTtlMs: 0,
    });

    expect(result.reachable).toBe(false);
    expect(result.mainCommit).toBeNull();
    expect(result.failure?.reason).toBe("invalid_response");
  });

  it("never exposes response bodies or headers beyond the numeric diagnosis", async () => {
    const result = await getGithubMainStatus({
      fetchImpl: async () =>
        new Response("secret-looking body", {
          status: 500,
          headers: { "set-cookie": "a=b", "x-ratelimit-remaining": "42" },
        }),
      cacheTtlMs: 0,
    });

    expect(JSON.stringify(result)).not.toContain("secret-looking");
    expect(JSON.stringify(result)).not.toContain("a=b");
    expect(result.failure).toEqual({
      reason: "http_error",
      httpStatus: 500,
      rateLimitRemaining: 42,
    });
  });
});
