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

  it("should_notLeakSecrets_when_serialized", () => {
    const raw = JSON.stringify(getStatus()).toLowerCase();
    for (const forbidden of ["password", "secret", "bearer", "token", "connectionstring"]) {
      expect(raw.includes(forbidden), `Statusfeld enthält verdächtiges Schlüsselwort: ${forbidden}`).toBe(
        false,
      );
    }
  });
});
