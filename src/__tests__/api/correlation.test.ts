/**
 * Correlation-ID Tests (Prompt 2A.4B).
 *
 * Deckt Kern-Utilities und den Handler-Wrapper ab:
 *  - Format-Validierung (UUID + Relaxed) und Ablehnung böser Inputs.
 *  - Handler mit/ohne Header, mit ungültigem/überlangem Header.
 *  - Response-Header wird immer gesetzt und niemals durch den Handler
 *    überschreibbar.
 *  - Parallele Requests bekommen unterschiedliche IDs.
 *  - Structured Error Body enthält `code`, `correlationId`, `timestamp`.
 *  - Backend-Logger reichert Einträge mit `correlationId` an.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../env/test-instance";
import {
  CORRELATION_HEADER,
  CORRELATION_MAX_LEN,
  acceptOrGenerateCorrelationId,
  generateCorrelationId,
  isValidCorrelationId,
} from "../../lib/correlation";
import {
  getCurrentCorrelationId,
  jsonErrorWithCorrelation,
  withCorrelation,
} from "../../lib/correlation-context.server";

describe("correlation utils", () => {
  it("should_generateUuidV4_when_generateCalled", () => {
    const id = generateCorrelationId();
    expect(isValidCorrelationId(id)).toBe(true);
    // v4-Muster grob checken
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("should_generateUniqueIds_when_calledRepeatedly", () => {
    const ids = new Set(Array.from({ length: 500 }, () => generateCorrelationId()));
    expect(ids.size).toBe(500);
  });

  it("should_acceptValidUuid_and_rejectGarbage", () => {
    expect(isValidCorrelationId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidCorrelationId("trace-abc.123_XY")).toBe(true); // relaxed
    expect(isValidCorrelationId("short")).toBe(false);
    expect(isValidCorrelationId("<script>alert(1)</script>")).toBe(false);
    expect(isValidCorrelationId("has spaces here")).toBe(false);
    expect(isValidCorrelationId("has/slashes/here")).toBe(false);
    expect(isValidCorrelationId("x".repeat(CORRELATION_MAX_LEN + 1))).toBe(false);
    expect(isValidCorrelationId(null)).toBe(false);
    expect(isValidCorrelationId(undefined)).toBe(false);
    expect(isValidCorrelationId(42)).toBe(false);
  });

  it("should_replaceInvalidHeader_when_accepting", () => {
    expect(acceptOrGenerateCorrelationId(null)).toMatch(/^[0-9a-f-]{36}$/);
    expect(acceptOrGenerateCorrelationId("<bad>")).toMatch(/^[0-9a-f-]{36}$/);
    expect(acceptOrGenerateCorrelationId("x".repeat(200))).toMatch(/^[0-9a-f-]{36}$/);
    const ok = "550e8400-e29b-41d4-a716-446655440000";
    expect(acceptOrGenerateCorrelationId(ok)).toBe(ok);
  });
});

function makeReq(headers?: Record<string, string>): Request {
  return new Request("http://localhost/api/test", { method: "GET", headers });
}

describe("withCorrelation handler wrapper", () => {
  it("should_generateId_when_headerMissing", async () => {
    const handler = withCorrelation(async () => {
      expect(getCurrentCorrelationId()).toMatch(/^[0-9a-f-]{36}$/);
      return Response.json({ ok: true, id: getCurrentCorrelationId() });
    });
    const res = await handler({ request: makeReq() });
    const cid = res.headers.get(CORRELATION_HEADER);
    expect(cid).toMatch(/^[0-9a-f-]{36}$/);
    const body = (await res.json()) as { id: string };
    expect(body.id).toBe(cid);
  });

  it("should_acceptValidClientId_when_headerPresent", async () => {
    const client = "trace-abcdef.12345";
    const handler = withCorrelation(async () =>
      Response.json({ ok: true, id: getCurrentCorrelationId() }),
    );
    const res = await handler({
      request: makeReq({ [CORRELATION_HEADER]: client }),
    });
    expect(res.headers.get(CORRELATION_HEADER)).toBe(client);
    const body = (await res.json()) as { id: string };
    expect(body.id).toBe(client);
  });

  it("should_rejectInvalidClientId_and_generateNewOne", async () => {
    const handler = withCorrelation(async () =>
      Response.json({ ok: true, id: getCurrentCorrelationId() }),
    );
    const res = await handler({
      request: makeReq({ [CORRELATION_HEADER]: "<script>evil()</script>" }),
    });
    const cid = res.headers.get(CORRELATION_HEADER)!;
    expect(cid).not.toContain("<script>");
    expect(isValidCorrelationId(cid)).toBe(true);
  });

  it("should_rejectOverlongClientId_and_generateNewOne", async () => {
    const handler = withCorrelation(async () => Response.json({ ok: true }));
    const res = await handler({
      request: makeReq({ [CORRELATION_HEADER]: "a".repeat(500) }),
    });
    const cid = res.headers.get(CORRELATION_HEADER)!;
    expect(cid.length).toBeLessThanOrEqual(CORRELATION_MAX_LEN);
    expect(isValidCorrelationId(cid)).toBe(true);
  });

  it("should_returnStructuredError_when_handlerThrows", async () => {
    const handler = withCorrelation(async () => {
      throw new Error("boom with token=eyJabcdef.stack info");
    });
    const res = await handler({ request: makeReq() });
    expect(res.status).toBe(500);
    const cid = res.headers.get(CORRELATION_HEADER)!;
    expect(isValidCorrelationId(cid)).toBe(true);
    const body = (await res.json()) as {
      ok: boolean;
      code: string;
      correlationId: string;
      timestamp: string;
      message: string;
    };
    expect(body.ok).toBe(false);
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.correlationId).toBe(cid);
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // Kein Stack, kein Secret durchgereicht
    expect(JSON.stringify(body)).not.toContain("eyJabcdef");
    expect(JSON.stringify(body)).not.toContain("boom");
  });

  it("should_produceUniqueIds_when_parallelRequests", async () => {
    const seen: string[] = [];
    const handler = withCorrelation(async () => {
      seen.push(getCurrentCorrelationId()!);
      // kleiner Delay, damit ALS-Contexts wirklich überlappen
      await new Promise((r) => setTimeout(r, 5));
      return Response.json({ ok: true });
    });
    const results = await Promise.all(
      Array.from({ length: 25 }, () => handler({ request: makeReq() })),
    );
    const headerIds = results.map((r) => r.headers.get(CORRELATION_HEADER)!);
    expect(new Set(headerIds).size).toBe(25);
    expect(new Set(seen).size).toBe(25);
    // Und ALS-IDs matchen die Header-IDs (Reihenfolge egal)
    expect(new Set(seen)).toEqual(new Set(headerIds));
  });

  it("should_expose_correlationId_via_jsonErrorHelper", async () => {
    const handler = withCorrelation(async () =>
      jsonErrorWithCorrelation(400, "TEST_CODE", "test message"),
    );
    const res = await handler({ request: makeReq() });
    const cid = res.headers.get(CORRELATION_HEADER)!;
    const body = (await res.json()) as {
      code: string;
      message: string;
      correlationId: string;
    };
    expect(body.correlationId).toBe(cid);
    expect(body.code).toBe("TEST_CODE");
    expect(body.message).toBe("test message");
  });
});

describe("backend logger correlation enrichment", () => {
  beforeEach(() => {
    // Console-Spy setzen, damit wir den serialisierten Kontext lesen können.
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("should_addCorrelationFields_when_loggingInsideRequest", async () => {
    const { logger } = await import("../../../backend/services/logger.mjs");
    const handler = withCorrelation(async () => {
      logger.info("hello from handler", { extra: 1 });
      return Response.json({ ok: true });
    });
    await handler({ request: makeReq() });
    const call = (console.info as unknown as { mock: { calls: unknown[][] } }).mock.calls.find(
      (c) => String(c[0]).includes("hello from handler"),
    );
    expect(call, "log call fehlt").toBeDefined();
    const ctx = call![1] as Record<string, unknown>;
    expect(typeof ctx.correlationId).toBe("string");
    expect(isValidCorrelationId(ctx.correlationId)).toBe(true);
    expect(ctx.route).toBe("/api/test");
    expect(ctx.method).toBe("GET");
    expect(typeof ctx.durationMs).toBe("number");
    expect(ctx.extra).toBe(1);
  });

  it("should_omitCorrelationFields_when_noRequestContext", async () => {
    const { logger } = await import("../../../backend/services/logger.mjs");
    logger.info("no request here");
    const call = (console.info as unknown as { mock: { calls: unknown[][] } }).mock.calls.find(
      (c) => String(c[0]).includes("no request here"),
    );
    expect(call).toBeDefined();
    const ctx = (call![1] ?? {}) as Record<string, unknown>;
    expect(ctx.correlationId).toBeUndefined();
    expect(ctx.route).toBeUndefined();
  });
});
