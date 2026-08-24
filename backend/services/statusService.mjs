/**
 * Status Service (ESM)
 *
 * Liefert einen vollständigen, secret-freien Snapshot des Betriebszustands
 * für /api/status. Enthält ausschließlich Booleans, Counts, optional
 * freigegebene ENV-Namen und Metadaten — niemals Werte, Connection-Strings,
 * SAS-Tokens oder Secrets.
 */
import { getMode, isDev } from "../../config/env.mjs";
import {
  KNOWN as KNOWN_AZURE_ENVS,
  has,
  status as secretStatus,
} from "../../config/secretManager.mjs";
import { isKeyVaultConfigured } from "../../config/keyVault.mjs";
import { getSyncMeta } from "./syncService.mjs";
import { ALL_ROLES, ALL_PERMISSIONS } from "./rbac.mjs";

const BOOT_AT = new Date().toISOString();
const PUBLIC_GITHUB_REPOSITORY_URL = "https://github.com/bmarnau/sysingdashboard";
const ENTRA_PROVIDER_NAMES = new Set(["entra", "entra-id", "azure-ad"]);

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

function resolveAuthProvider() {
  return (envOrNull("AUTH_PROVIDER") || "supabase").toLowerCase();
}

/**
 * Bewertet nur Pflichtvariablen der aktuell aktiven Auth-Plattform.
 *
 * Supabase ist der produktive MVP-Provider und benötigt im Backend keine
 * Azure-Secrets. Optionale Azure-Daten-/Zielintegration wird separat unter
 * `azure` ausgewiesen und darf die allgemeine Security-Ampel nicht rot färben.
 * Für einen später aktivierten Entra-Provider sind Client- und Tenant-ID die
 * derzeit bekannten Mindestanforderungen.
 */
function getActiveProviderEnvStatus(authProvider) {
  const required = ENTRA_PROVIDER_NAMES.has(authProvider)
    ? ["AZURE_CLIENT_ID", "AZURE_TENANT_ID"]
    : [];
  const missing = required.filter((name) => !has(name));

  return {
    scope: authProvider,
    ok: missing.length === 0,
    // Öffentlicher Status: in PROD nur Count, keine Infrastruktur-Fingerprints.
    missing: isDev() ? missing : [],
    missingCount: missing.length,
  };
}

export function getStatus() {
  const azureSecrets = secretStatus(); // { NAME: boolean }
  const azureMissing = KNOWN_AZURE_ENVS.filter((n) => !azureSecrets[n]);
  const authMode = resolveAuthProvider();
  const activeProviderEnv = getActiveProviderEnvStatus(authMode);
  const lovablePublishedUrl = envOrNull("LOVABLE_PUBLISHED_URL");
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
      // Project IDs gehören nicht in den öffentlichen Status-Payload.
      publishedUrl: lovablePublishedUrl,
      lastDeploymentAt: envOrNull("LOVABLE_DEPLOYED_AT"),
      // Fehlende Hosting-Metadaten sind "unbekannt", nicht "nicht deployed".
      status: lovablePublishedUrl ? "configured" : null,
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
      authMode,
      rbac: {
        enabled: true,
        rolesCount: ALL_ROLES.length,
        permissionsCount: ALL_PERMISSIONS.length,
      },
      secretManager: {
        enabled: true,
        missing: isDev() ? azureMissing : [],
        missingCount: azureMissing.length,
      },
      envValidation: activeProviderEnv,
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
