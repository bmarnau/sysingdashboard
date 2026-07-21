/**
 * Wurf-freie Ermittlung des Auth-Konfigurationsstatus.
 *
 * Wird sowohl im Browser als auch im Server-Kontext benutzt und darf niemals
 * throwen — Consumer entscheiden selbst, ob sie einen Fehlerzustand rendern
 * oder abbrechen. Gibt ausschließlich nicht-sensible Metadaten zurück; keine
 * URLs, keine Keys, keine Tokens.
 */

export type AuthConfigStatus = "configured" | "missing" | "invalid";

export interface AuthConfiguration {
  status: AuthConfigStatus;
  provider: "supabase";
  missingKeys: string[];
  /** Kurzer, secret-freier Grund für `invalid` — nur DEV-freundliche Meldung. */
  invalidReason?: string;
}

/** Secret-freie Fehlerklasse für Consumer, die throwen möchten. */
export class AuthConfigurationError extends Error {
  readonly code: AuthConfigStatus;
  constructor(config: AuthConfiguration) {
    super(
      config.status === "invalid"
        ? `Auth configuration invalid: ${config.invalidReason ?? "unknown"}`
        : `Auth configuration missing: ${config.missingKeys.join(", ") || "unknown"}`,
    );
    this.name = "AuthConfigurationError";
    this.code = config.status;
  }
}

/**
 * WICHTIG: Vite ersetzt `import.meta.env.VITE_*` NUR bei statischem
 * Property-Zugriff zur Build-Zeit. Ein dynamischer Zugriff über einen
 * Variablennamen (`env[name]`) bleibt im Production-Bundle leer, weil
 * Vite `import.meta.env` bei statischer Analyse nicht als vollständiges
 * Objekt bereitstellt. Deshalb hier zwingend statische Reads.
 */
const VITE_SUPABASE_URL: string | undefined =
  typeof import.meta.env.VITE_SUPABASE_URL === "string" &&
  import.meta.env.VITE_SUPABASE_URL.length > 0
    ? import.meta.env.VITE_SUPABASE_URL
    : undefined;

const VITE_SUPABASE_PUBLISHABLE_KEY: string | undefined =
  typeof import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY === "string" &&
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY.length > 0
    ? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    : undefined;

function readProcessEnv(name: string): string | undefined {
  try {
    if (typeof process === "undefined" || !process.env) return undefined;
    const v = process.env[name];
    return typeof v === "string" && v.length > 0 ? v : undefined;
  } catch {
    return undefined;
  }
}

function isValidHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function isPlausiblePublishableKey(value: string): boolean {
  if (value.startsWith("sb_secret_")) return false; // hart verboten im Client
  if (value.startsWith("sb_publishable_")) return true;
  // Legacy-JWT-Anon-Key: drei durch Punkt getrennte Base64-Segmente.
  const parts = value.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

/**
 * Ermittelt den Auth-Konfigurationsstatus, ohne zu werfen.
 * Bevorzugt VITE_-Variablen (Browser + SSR-Vite-Build), fällt sonst auf die
 * serverseitigen `SUPABASE_*` zurück.
 */
export function getAuthConfigurationStatus(): AuthConfiguration {
  const url = VITE_SUPABASE_URL ?? readProcessEnv("SUPABASE_URL");
  const key = VITE_SUPABASE_PUBLISHABLE_KEY ?? readProcessEnv("SUPABASE_PUBLISHABLE_KEY");

  const missing: string[] = [];
  if (!url) missing.push("SUPABASE_URL");
  if (!key) missing.push("SUPABASE_PUBLISHABLE_KEY");
  if (missing.length > 0) {
    return { status: "missing", provider: "supabase", missingKeys: missing };
  }

  if (!isValidHttpsUrl(url!)) {
    return {
      status: "invalid",
      provider: "supabase",
      missingKeys: [],
      invalidReason: "SUPABASE_URL is not a valid URL",
    };
  }
  if (!isPlausiblePublishableKey(key!)) {
    return {
      status: "invalid",
      provider: "supabase",
      missingKeys: [],
      invalidReason: key!.startsWith("sb_secret_")
        ? "Service-role key found in publishable slot — refuse to ship secret to client"
        : "SUPABASE_PUBLISHABLE_KEY has unexpected format",
    };
  }

  return { status: "configured", provider: "supabase", missingKeys: [] };
}

export function isAuthConfigured(): boolean {
  return getAuthConfigurationStatus().status === "configured";
}
