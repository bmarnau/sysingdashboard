import { describe, expect, it } from "vitest";
import "../env/test-instance";
import { runSync } from "../../../backend/services/syncService.mjs";

describe("backend/syncService", () => {
  it("should_returnOkResult_when_devSourceProvided", async () => {
    const res = await runSync({ source: "test" });
    expect(res.ok).toBe(true);
    expect(res.source).toBe("test");
  });
});
