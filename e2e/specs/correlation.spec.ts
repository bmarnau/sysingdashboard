/**
 * E2E: Correlation-ID (Prompt 2A.4B).
 *
 * Prüft am laufenden Dev-Server:
 *  - Fehlender Header → Response bekommt gültige neue ID.
 *  - Gültiger Header → Response spiegelt die ID.
 *  - Böser/Zu langer Header → Server verwirft und erzeugt neue ID.
 *  - Parallele Requests bekommen verschiedene IDs.
 *  - Fehler-Response enthält `code` + `correlationId` + `timestamp`.
 */
import { expect, test } from "@playwright/test";

const HEADER = "x-correlation-id";
const UUID_RE = /^[0-9a-f-]{36}$/;
const RELAXED_RE = /^[A-Za-z0-9._-]{8,64}$/;

test.describe("Correlation-ID Middleware", () => {
  test("liefert neue ID, wenn Header fehlt", async ({ request }) => {
    const res = await request.get("/api/status");
    const cid = res.headers()[HEADER];
    expect(cid, "Response muss X-Correlation-Id enthalten").toBeTruthy();
    expect(cid).toMatch(UUID_RE);
    const body = await res.json();
    expect(body.correlationId).toBe(cid);
  });

  test("übernimmt gültige Client-ID", async ({ request }) => {
    const client = "e2e-abcdef.12345";
    expect(client).toMatch(RELAXED_RE);
    const res = await request.get("/api/status", { headers: { [HEADER]: client } });
    expect(res.headers()[HEADER]).toBe(client);
  });

  test("verwirft ungültige Client-ID", async ({ request }) => {
    const res = await request.get("/api/status", {
      headers: { [HEADER]: "<script>alert(1)</script>" },
    });
    const cid = res.headers()[HEADER];
    expect(cid).not.toContain("<script>");
    expect(cid).toMatch(UUID_RE);
  });

  test("verwirft überlange Client-ID", async ({ request }) => {
    const res = await request.get("/api/status", {
      headers: { [HEADER]: "a".repeat(500) },
    });
    const cid = res.headers()[HEADER];
    expect(cid.length).toBeLessThanOrEqual(64);
    expect(cid).toMatch(UUID_RE);
  });

  test("parallele Requests bekommen verschiedene IDs", async ({ request }) => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => request.get("/api/status")),
    );
    const ids = results.map((r) => r.headers()[HEADER]);
    expect(new Set(ids).size).toBe(10);
  });

  test("Fehler-Response enthält strukturierte Correlation-Felder", async ({ request }) => {
    // /api/sync ohne Body → 400 mit strukturierter Fehlerantwort
    const res = await request.post("/api/sync", { data: "not-json" });
    expect(res.status()).toBe(400);
    const cid = res.headers()[HEADER];
    expect(cid).toMatch(UUID_RE);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("INVALID_JSON");
    expect(body.correlationId).toBe(cid);
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // Kein Stack, kein Secret
    const text = JSON.stringify(body);
    expect(text).not.toMatch(/\n\s+at\s+/);
    expect(text).not.toMatch(/eyJ[A-Za-z0-9._-]{10,}/);
  });
});
