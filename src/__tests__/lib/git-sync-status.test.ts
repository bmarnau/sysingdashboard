import { describe, expect, it } from "vitest";
import { commitsMatch, resolveGitSyncState } from "@/lib/git-sync-status";

describe("git sync status", () => {
  it("treats full and short forms of the same SHA as synchronized", () => {
    expect(
      commitsMatch(
        "d822046c367241868bb9f1d7e2810b3a55a3660e",
        "d822046c367241868bb9f1d7e2810b3a55a3660e",
      ),
    ).toBe(true);
    expect(commitsMatch("d822046c3672", "d822046c367241868bb9f1d7e2810b3a55a3660e")).toBe(true);
    expect(resolveGitSyncState("d822046c3672", "d822046c367241868bb9f1d7e2810b3a55a3660e")).toBe(
      "synchronized",
    );
  });

  it("reports different only when both commits are known", () => {
    expect(resolveGitSyncState("aaaaaaaaaaaa", "bbbbbbbbbbbb")).toBe("different");
  });

  it("fails closed when matching SHAs come from stale evidence", () => {
    expect(
      resolveGitSyncState(
        "d822046c367241868bb9f1d7e2810b3a55a3660e",
        "d822046c367241868bb9f1d7e2810b3a55a3660e",
        false,
      ),
    ).toBe("unknown");
  });

  it("never invents synchronization when metadata is missing or invalid", () => {
    expect(resolveGitSyncState("unknown", "d822046c3672")).toBe("unknown");
    expect(resolveGitSyncState(null, "d822046c3672")).toBe("unknown");
    expect(resolveGitSyncState("not-a-sha", "d822046c3672")).toBe("unknown");
  });
});
