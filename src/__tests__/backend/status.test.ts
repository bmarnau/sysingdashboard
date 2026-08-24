/**
 * Backend-Integrationstest: prüft, dass `backend/services/statusService.mjs`
 * ein secret-freies Status-Objekt liefert. Wird ohne HTTP-Layer aufgerufen —
 * die HTTP-Wrapper werden im API-Modus getestet.
 */
import { describe, expect, it } from "vitest";
import "../env/test-instance";
import { getStatus } from "../../../backend/services/statusService.mjs";

const PUBLIC_REPOSITORY_URL = "https://github.com/bmarnau/sysingdashboard";
const AZURE_ENV_NAMES = [
  "AZURE_SQL_CONNECTION",
  "AZURE_TABLE_CONNECTION",
  "AZURE_STORAGE_SAS",
  "AZURE_CLIENT_ID",
  "AZURE_TENANT_ID",
] as const;

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

  it("should_notExposeLovableProjectId", () => {
    const previousProjectId = process.env.LOVABLE_PROJECT_ID;
    process.env.LOVABLE_PROJECT_ID = "unneeded-provider-identifier";

    try {
      const status = getStatus();
      expect(status.lovable).not.toHaveProperty("projectId");
      expect(JSON.stringify(status)).not.toContain("unneeded-provider-identifier");
    } finally {
      if (previousProjectId === undefined) delete process.env.LOVABLE_PROJECT_ID;
      else process.env.LOVABLE_PROJECT_ID = previousProjectId;
    }
  });

  it("should_reportMissingLovableHostingMetadataAsUnknown", () => {
    const previousPublishedUrl = process.env.LOVABLE_PUBLISHED_URL;
    const previousDeployedAt = process.env.LOVABLE_DEPLOYED_AT;
    delete process.env.LOVABLE_PUBLISHED_URL;
    delete process.env.LOVABLE_DEPLOYED_AT;

    try {
      const status = getStatus();
      expect(status.lovable.publishedUrl).toBeNull();
      expect(status.lovable.lastDeploymentAt).toBeNull();
      expect(status.lovable.status).toBeNull();
    } finally {
      if (previousPublishedUrl === undefined) delete process.env.LOVABLE_PUBLISHED_URL;
      else process.env.LOVABLE_PUBLISHED_URL = previousPublishedUrl;
      if (previousDeployedAt === undefined) delete process.env.LOVABLE_DEPLOYED_AT;
      else process.env.LOVABLE_DEPLOYED_AT = previousDeployedAt;
    }
  });

  it("should_notFailSupabaseRuntimeWhenOptionalAzureEnvIsMissing", () => {
    const previousAuthProvider = process.env.AUTH_PROVIDER;
    const previousAzureEnv = Object.fromEntries(
      AZURE_ENV_NAMES.map((name) => [name, process.env[name]]),
    ) as Record<(typeof AZURE_ENV_NAMES)[number], string | undefined>;

    delete process.env.AUTH_PROVIDER;
    for (const name of AZURE_ENV_NAMES) delete process.env[name];

    try {
      const status = getStatus();
      expect(status.security.authMode).toBe("supabase");
      expect(status.security.envValidation.scope).toBe("supabase");
      expect(status.security.envValidation.ok).toBe(true);
      expect(status.security.envValidation.missingCount).toBe(0);
      expect(status.azure.missingEnvCount).toBe(AZURE_ENV_NAMES.length);
    } finally {
      if (previousAuthProvider === undefined) delete process.env.AUTH_PROVIDER;
      else process.env.AUTH_PROVIDER = previousAuthProvider;
      for (const name of AZURE_ENV_NAMES) {
        const previous = previousAzureEnv[name];
        if (previous === undefined) delete process.env[name];
        else process.env[name] = previous;
      }
    }
  });

  it("should_validateKnownEntraMinimumWhenEntraBecomesActive", () => {
    const previousAuthProvider = process.env.AUTH_PROVIDER;
    const clientIdName = AZURE_ENV_NAMES[3];
    const tenantIdName = AZURE_ENV_NAMES[4];
    const previousClientId = process.env[clientIdName];
    const previousTenantId = process.env[tenantIdName];
    process.env.AUTH_PROVIDER = "entra";
    delete process.env[clientIdName];
    delete process.env[tenantIdName];

    try {
      const status = getStatus();
      expect(status.security.authMode).toBe("entra");
      expect(status.security.envValidation.scope).toBe("entra");
      expect(status.security.envValidation.ok).toBe(false);
      expect(status.security.envValidation.missingCount).toBe(2);
    } finally {
      if (previousAuthProvider === undefined) delete process.env.AUTH_PROVIDER;
      else process.env.AUTH_PROVIDER = previousAuthProvider;
      if (previousClientId === undefined) delete process.env[clientIdName];
      else process.env[clientIdName] = previousClientId;
      if (previousTenantId === undefined) delete process.env[tenantIdName];
      else process.env[tenantIdName] = previousTenantId;
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
