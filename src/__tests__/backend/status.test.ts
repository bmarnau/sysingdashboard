/**
 * Backend-Integrationstest: prüft, dass `backend/services/statusService.mjs`
 * ein secret-freies Status-Objekt liefert. Wird ohne HTTP-Layer aufgerufen —
 * die HTTP-Wrapper werden im API-Modus getestet.
 */
import { describe, expect, it } from "vitest";
import "../env/test-instance";
import { getStatus } from "../../../backend/services/statusService.mjs";

describe("backend/statusService", () => {
  it("should_returnStatusObject_when_called", () => {
    const status = getStatus();
    expect(status).toBeTypeOf("object");
    expect(status).not.toBeNull();
  });

  it("should_notLeakSecretValues_when_serialized", () => {
    const raw = JSON.stringify(getStatus());
    // JWT-artige Werte oder Bearer-Header-Werte dürfen nicht auftauchen.
    expect(/eyJ[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+/.test(raw)).toBe(false);
    expect(/bearer\s+[a-z0-9]/i.test(raw)).toBe(false);
    // Klassische Connection-String-Marker (Server=…;Password=…)
    expect(/password\s*=\s*[^;\s"]{4,}/i.test(raw)).toBe(false);
  });
});
