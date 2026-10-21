import { describe, expect, it } from "vitest";
import { describeGithubStatusFailure } from "@/lib/github-status-failure";

describe("describeGithubStatusFailure", () => {
  it("names an exhausted rate limit", () => {
    expect(
      describeGithubStatusFailure({ reason: "http_error", httpStatus: 403, rateLimitRemaining: 0 }),
    ).toBe("GitHub-Anfragelimit erreicht (HTTP 403)");
  });

  it("names other HTTP errors with their status", () => {
    expect(
      describeGithubStatusFailure({
        reason: "http_error",
        httpStatus: 500,
        rateLimitRemaining: 42,
      }),
    ).toBe("GitHub antwortete mit HTTP 500");
  });

  it("names timeouts, network errors, invalid answers and a missing fetch", () => {
    const base = { httpStatus: null, rateLimitRemaining: null };
    expect(describeGithubStatusFailure({ reason: "timeout", ...base })).toContain(
      "Zeitüberschreitung",
    );
    expect(describeGithubStatusFailure({ reason: "network_error", ...base })).toContain("Netzwerk");
    expect(describeGithubStatusFailure({ reason: "invalid_response", ...base })).toContain(
      "Ungültig",
    );
    expect(describeGithubStatusFailure({ reason: "fetch_unavailable", ...base })).toContain(
      "nicht verfügbar",
    );
  });

  it("returns null without a failure", () => {
    expect(describeGithubStatusFailure(null)).toBeNull();
    expect(describeGithubStatusFailure(undefined)).toBeNull();
  });
});
