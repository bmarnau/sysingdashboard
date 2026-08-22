/**
 * Status Service (ESM)
 *
 * Liefert einen vollständigen, secret-freien Snapshot des Betriebszustands
 * für /api/status. Enthält ausschließlich Booleans, ENV-Namen und
 * Metadaten — niemals Werte, Connection-Strings, SAS-Tokens oder Secrets.
 */
import { getMode, isDev } from "../../config/env.mjs";
import {
  KNOWN as KNOWN_AZURE_ENVS,
  has,
  status as secretStatus,
  validate as validateEnv,
} from "../../config/secretManager.mjs";
import { isKeyVaultConfigured } from "../../config/keyVault.mjs";
import { getSyncMeta } from "./syncService.mjs";
import { ALL_ROLES, ALL_PERMISSIONS } from "./rbac.mjs";

const BOOT_AT = new Date().toISOString();
const PUBLIC_GITHUB_REPOSITORY_URL = "https://github.com/bmarnau/sysingdashboard";

function envOrNull(name) {
  if (typeof process === "undefined" || !process.env) return null;
  const v = process.env[name];
  return v && v.length > 0 ? v : null;
}

function resolveAzureAuthMode() {
  if (has("AZURE_CLIENT_ID") && has("AZURE_TENANT_ID")) {
    // Klassisches Service-Principal-Setup; Managed Identity wäre ENV-frei.
    return "client-secret";
  }
  if (envOrNull("AZURE_USE_MANAGED_IDENTITY") === "1") {
    return "managed-identity";
  }
  return "none";
}

export function getStatus() {
  let envValidation;
  try {
    envValidation = validateEnv();
  } catch (err) {
    // validate() wirft in PROD bei Fehlen — fangen, damit /api/status
    // selbst dann antworten kann und das UI die fehlenden Namen sieht.
    const msg = err && err.message ? String(err.message) : "validation failed";
    const missing = msg
      .replace(/^Missing required ENV variables:\s*/, "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    envValidation = { mode: getMode(), missing, ok: false };
  }

  const azureSecrets = secretStatus(); // { NAME: boolean }
  const azureMissing = KNOWN_AZURE_ENVS.filter((n) => !azureSecrets[n]);

  const sync = getSyncMeta();

  return {
    application: {
      name: "Engineer Console",
      mode: getMode(),
      startedAt: BOOT_AT,
    },
    github: {
      // Public endpoint: never expose runtime Git remotes. Hosted environments
      // may inject credential-bearing internal clone URLs. The canonical GitHub
      // repository is project metadata and therefore fixed here intentionally.
      repositoryUrl: PUBLIC_GITHUB_REPOSITORY_URL,
      branch: envOrNull("GITHUB_REF_NAME") || envOrNull("GIT_BRANCH"),
      commit: envOrNull("GITHUB_SHA") || envOrNull("GIT_COMMIT"),
    },
    lovable: {
      projectId: envOrNull("LOVABLE_PROJECT_ID"),
      publishedUrl: envOrNull("LOVABLE_PUBLISHED_URL"),
      lastDeploymentAt: envOrNull("LOVABLE_DEPLOYED_AT"),
      status: envOrNull("LOVABLE_PUBLISHED_URL") ? "configured" : "not_configured",
    },
    azure: {
      allowed: !isDev(),
      authMode: resolveAzureAuthMode(),
      sql: { configured: Boolean(azureSecrets.AZURE_SQL_CONNECTION) },
      table: { configured: Boolean(azureSecrets.AZURE_TABLE_CONNECTION) },
      storage: { configured: Boolean(azureSecrets.AZURE_STORAGE_SAS) },
      lastConnectionTestAt: null, // Stub — echter Test folgt mit PROD-Anbindung.
      // In PROD nur Anzahl freigeben — Variablennamen sind ein leichter
      // Fingerabdruck der Infra und gehören nicht in eine öffentliche Antwort.
      missingEnv: isDev() ? azureMissing : [],
      missingEnvCount: azureMissing.length,
    },
    security: {
      // Supabase ist der produktive MVP-Provider. Ein zukünftiger Provider
      // (z. B. Entra) kann weiterhin explizit über AUTH_PROVIDER gesetzt werden.
      authMode: envOrNull("AUTH_PROVIDER") || "supabase",
      rbac: {
        enabled: true,
        rolesCount: ALL_ROLES.length,
        permissionsCount: ALL_PERMISSIONS.length,
      },
      secretManager: { enabled: true, missing: envValidation.missing },
      envValidation: { ok: envValidation.ok, missing: envValidation.missing },
      keyVault: { configured: isKeyVaultConfigured() },
      correlationId: {
        middlewareActive: true,
        header: "X-Correlation-Id",
        // Aktive Routen sind statisch bekannt (src/routes/api/*.ts). Beide
        // sind auf `withCorrelation` migriert — spätere Routen erben die
        // Middleware, sonst schlägt der Tech-Debt-Detector Alarm.
        activeRoutesWithSupport: 2,
        activeRoutesWithoutSupport: 0,
        lastTestAt: null,
      },
    },
    data: {
      lastAzureExportAt: sync.lastRun, // letzter Sync-Lauf gilt als Export-Indikator
      lastAzureImportAt: null,
    },
    sync,
    mode: getMode(), // Legacy-Feld für ältere Clients
    timestamp: new Date().toISOString(),
  };
}
