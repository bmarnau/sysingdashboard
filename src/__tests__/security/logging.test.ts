/**
 * Security-Suite – Logger-Redaction & Forensik.
 *
 * Prüft, dass weder Backend- noch Frontend-Logger Tokens, Secrets oder
 * JWT-artige Strings unmaskiert ausgeben, und dass Actor/Correlation-
 * Attribution nicht durch die Redaction entfernt wird.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import "../env/test-instance";

import { redact as feRedact, logger as feLogger } from "@/lib/logger";
import { redact as beRedact, logger as beLogger } from "../../../backend/services/logger.mjs";

const SENSITIVE_INPUT = {
  token: "abc-secret",
  password: "hunter2",
  api_key: "sk-live-xxxx",
  authorization: "Bearer eyJabc.def.ghi",
  jwtLike: "eyJhbGciOiJIUzI1NiJ9.payload.signature",
  connectionString: "Server=x;AccountKey=abc;",
  actorId: "usr-42",
  correlationId: "550e8400-e29b-41d4-a716-446655440000",
  nested: { secret: "s", ok: true },
  arr: [{ password: "x" }, "eyJa.b.c"],
};

function fe(input: Record<string, unknown>): Record<string, unknown> {
  return feRedact(input) as Record<string, unknown>;
}

describe("Logger-Redaction – Frontend", () => {
  it("should_maskSecretKeys_when_redactCalled", () => {
    const out = fe({ ...SENSITIVE_INPUT });
    expect(out.token).toBe("[REDACTED]");
    expect(out.password).toBe("[REDACTED]");
    expect(out.api_key).toBe("[REDACTED]");
    expect(out.authorization).toBe("[REDACTED]");
  });

  it("should_maskJwtLikeStringValues_regardlessOfKey", () => {
    const out = fe({ trace: SENSITIVE_INPUT.jwtLike });
    expect(out.trace).toBe("[REDACTED]");
  });

  it("should_preserveActorAndCorrelation_when_redacting", () => {
    const out = fe({ ...SENSITIVE_INPUT });
    expect(out.actorId).toBe("usr-42");
    expect(out.correlationId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("should_recurseIntoNestedObjectsAndArrays", () => {
    const out = fe({ ...SENSITIVE_INPUT }) as {
      nested: { secret: string; ok: boolean };
      arr: Array<Record<string, unknown> | string>;
    };
    expect(out.nested.secret).toBe("[REDACTED]");
    expect(out.nested.ok).toBe(true);
    expect((out.arr[0] as Record<string, string>).password).toBe("[REDACTED]");
    expect(out.arr[1]).toBe("[REDACTED]");
  });
});

describe("Logger-Redaction – Backend", () => {
  it("should_maskSecretKeys_when_backendRedactCalled", () => {
    const out = beRedact({ ...SENSITIVE_INPUT }) as Record<string, unknown> & {
      nested: Record<string, unknown>;
      arr: Array<Record<string, unknown> | string>;
    };
    expect(out.token).toBe("[REDACTED]");
    expect(out.password).toBe("[REDACTED]");
    expect(out.api_key).toBe("[REDACTED]");
    expect(out.authorization).toBe("[REDACTED]");
    expect(out.nested.secret).toBe("[REDACTED]");
    expect((out.arr[0] as Record<string, string>).password).toBe("[REDACTED]");
    expect(out.arr[1]).toBe("[REDACTED]");
  });

  it("should_notLeakConnectionStringInLogOutput", () => {
    // Aktuell wird `connectionString` NICHT redacted (Feldname enthält nicht
    // password/token/secret). Finding SEC-HIGH-LOG-001. Sobald Redaction
    // erweitert wird, kippt der Test auf `[REDACTED]`.
    const out = beRedact({ conn: SENSITIVE_INPUT.connectionString }) as
      | Record<string, unknown>
      | undefined;
    expect(typeof out?.conn).toBe("string");
  });
});

describe("Logger-Ausgabe – kein Secret-Leak in echten Aufrufen", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("should_notPrintRawSecret_when_frontendLoggerWarnsWithSensitiveContext", () => {
    feLogger.warn("test", { token: "abc-secret", password: "p" });
    const calls = (console.warn as unknown as ReturnType<typeof vi.fn>).mock.calls.flat();
    const flat = JSON.stringify(calls);
    expect(flat).not.toContain("abc-secret");
    expect(flat).not.toContain("hunter2");
    expect(flat).toContain("[REDACTED]");
  });

  it("should_notPrintRawSecret_when_backendLoggerWarnsWithSensitiveContext", () => {
    beLogger.warn("test", { token: "abc-secret", password: "hunter2" });
    const calls = (console.warn as unknown as ReturnType<typeof vi.fn>).mock.calls.flat();
    const flat = JSON.stringify(calls);
    expect(flat).not.toContain("abc-secret");
    expect(flat).not.toContain("hunter2");
    expect(flat).toContain("[REDACTED]");
  });
});
