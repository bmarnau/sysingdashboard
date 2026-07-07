import { describe, it, expect, beforeEach, vi } from "vitest";
import { logger, redact } from "@/lib/logger";
import { DashboardError } from "@/lib/errors";

beforeEach(() => {
  logger.clear();
  vi.restoreAllMocks();
});

describe("redact", () => {
  it("should_maskSecretsByKey", () => {
    const out = redact({
      token: "abc",
      password: "xxx",
      api_key: "k",
      Authorization: "Bearer y",
      userId: "u1",
    });
    expect(out).toEqual({
      token: "[REDACTED]",
      password: "[REDACTED]",
      api_key: "[REDACTED]",
      Authorization: "[REDACTED]",
      userId: "u1",
    });
  });

  it("should_maskJwtLookingStrings", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    const out = redact({ note: jwt });
    expect(out).toEqual({ note: "[REDACTED]" });
  });

  it("should_recurseIntoNestedObjectsAndArrays", () => {
    const out = redact({
      list: [{ password: "p" }, { keep: 1 }],
      nested: { secret: "s", ok: true },
    });
    expect(out).toEqual({
      list: [{ password: "[REDACTED]" }, { keep: 1 }],
      nested: { secret: "[REDACTED]", ok: true },
    });
  });
});

describe("logger buffer", () => {
  it("should_recordAllLevelsInBuffer", () => {
    logger.debug("d", { a: 1 });
    logger.info("i");
    logger.warn("w");
    logger.error("e", new Error("boom"));
    const recent = logger.getRecent();
    expect(recent.map((r) => r.level)).toEqual(["debug", "info", "warn", "error"]);
    expect(recent[3].error?.message).toBe("boom");
  });

  it("should_filterByMinLevel", () => {
    logger.debug("d");
    logger.warn("w");
    logger.error("e", new Error("x"));
    expect(logger.getRecent("warn").map((r) => r.level)).toEqual(["warn", "error"]);
  });

  it("should_redactContextBeforeStoring", () => {
    logger.info("hello", { token: "t", user: "u" });
    const [entry] = logger.getRecent();
    expect(entry.context).toEqual({ token: "[REDACTED]", user: "u" });
  });

  it("should_preserveDashboardErrorCode", () => {
    logger.error("op failed", new DashboardError("X_CODE", "bad"));
    const [entry] = logger.getRecent();
    expect(entry.error?.code).toBe("X_CODE");
    expect(entry.error?.name).toBe("DashboardError");
  });

  it("should_rotateAfter500Entries", () => {
    for (let i = 0; i < 550; i++) logger.info(`msg ${i}`);
    const recent = logger.getRecent();
    expect(recent).toHaveLength(500);
    expect(recent[0].message).toBe("msg 50");
    expect(recent[499].message).toBe("msg 549");
  });
});
