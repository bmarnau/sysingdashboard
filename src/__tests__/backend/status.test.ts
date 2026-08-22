/**
 * Backend-Integrationstest: prüft, dass `backend/services/statusService.mjs`
 * ein secret-freies Status-Objekt liefert. Wird ohne HTTP-Layer aufgerufen —
 * die HTTP-Wrapper werden im API-Modus getestet.
 */
import { describe, expect, it } from "vitest";
import "../env/test-instance";
import { getStatus } from "../../../backend/services/statusService.mjs";

const PUBLIC_REPOSITORY_URL = "https://github.com/bmarnau/sysingdashboard";

describe("backend/statusService", () => {
  it("should_returnStatusObject_when_called", () => {
    const status = getStatus();
    expect(status).toBeTypeOf("object");
    expect(status).not.toBeNull();
  });

  it("should_useCanonicalPublicRepositoryUrl", () => {
    expect(getStatus().github.repositoryUrl).toBe(PUBLIC_REPOSITORY_URL);
  });

  it("should_notExposeCredentialBearingRuntimeGitRemote", () => {
    const previousRepositoryUrl = process.env.GITHUB_REPOSITORY_URL;
    const previousRepository = process.env.GITHUB_REPOSITORY;
    process.env.GITHUB_REPOSITORY_URL =
      "https://build-user:example-credential@git.internal.invalid/workspace/project";
    process.env.GITHUB_REPOSITORY = "other/example";

    try {
      const status = getStatus();
      const raw = JSON.stringify(status);
      expect(status.github.repositoryUrl).toBe(PUBLIC_REPOSITORY_URL);
      expect(raw).not.toContain("example-credential");
      expect(raw).not.toContain("git.internal.invalid");
    } finally {
      if (previousRepositoryUrl === undefined) delete process.env.GITHUB_REPOSITORY_URL;
      else process.env.GITHUB_REPOSITORY_URL = previousRepositoryUrl;
      if (previousRepository === undefined) delete process.env.GITHUB_REPOSITORY;
      else process.env.GITHUB_REPOSITORY = previousRepository;
    }
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
