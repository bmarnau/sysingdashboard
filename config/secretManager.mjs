/**
 * Secret Manager (ESM, Backend-only)
 *
 * Single Source of Truth für Azure-bezogene ENV-Variablen:
 *  - Liste der bekannten Secrets (`KNOWN`).
 *  - Sicheres Lesen mit `consume()` (PROD only) und Maskierung via `preview()`.
 *  - Validierung beim Boot/Request via `validate()` (PROD: Fail-Fast, DEV: Warn).
 *
 * Regeln:
 *  - Niemals ENV-Werte loggen. Nur Variablennamen.
 *  - Keine Defaultwerte, keine Fallback-Strings.
 *  - DEV bleibt ohne Azure-ENVs lauffähig.
 *  - PROD startet hart fehl, wenn Pflicht-ENVs fehlen.
 *  - Darf NICHT aus src/ (Frontend-Bundle) importiert werden.
 */

import { isDev, isProd, getMode } from "./env.mjs";

export { isDev, isProd };

/**
 * In Production zwingend erforderliche ENV-Variablen.
 * In DEV sind alle optional.
 */
export const KNOWN = Object.freeze([
  "AZURE_SQL_CONNECTION",
  "AZURE_TABLE_CONNECTION",
  "AZURE_STORAGE_SAS",
  "AZURE_CLIENT_ID",
  "AZURE_TENANT_ID",
]);

// Alias für Aufrufer, denen „Pflicht in PROD" semantisch klarer ist.
export const REQUIRED_IN_PROD = KNOWN;

function raw(name) {
  if (typeof process === "undefined" || !process.env) return undefined;
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

function assertKnown(name) {
  if (!KNOWN.includes(name)) {
    throw new Error(`[secretManager] Unbekannter Secret-Name '${name}'.`);
  }
}

export function has(name) {
  assertKnown(name);
  return raw(name) !== undefined;
}

export function mask(value) {
  if (!value) return "";
  const s = String(value);
  if (s.length <= 8) return "•".repeat(s.length);
  return `${s.slice(0, 2)}…${s.slice(-2)}`;
}

export function preview(name) {
  assertKnown(name);
  return mask(raw(name));
}

export function status() {
  const out = {};
  for (const n of KNOWN) out[n] = has(n);
  return out;
}

export function consume(name) {
  assertKnown(name);
  if (isDev()) {
    throw new Error(
      `[secretManager] consume('${name}') ist im Development-Modus blockiert. ` +
        `Setze NODE_ENV=production für echte Verbindungen.`,
    );
  }
  const v = raw(name);
  if (!v) {
    throw new Error(`[secretManager] Secret '${name}' ist nicht gesetzt.`);
  }
  return v;
}

/**
 * Liest eine beliebige ENV-Variable.
 *  - vorhanden → Wert
 *  - fehlt + PROD + required → Throw
 *  - fehlt sonst → Warn + undefined
 */
export function getEnv(name, requiredInProd = true) {
  if (typeof name !== "string" || name.length === 0) {
    throw new Error("[secretManager] getEnv: name must be a non-empty string");
  }
  const value = raw(name);
  if (value !== undefined) return value;

  if (isProd()) {
    if (requiredInProd) {
      throw new Error(`Missing required ENV variable: ${name}`);
    }
    console.warn(`[secretManager] Missing ENV variable (prod, optional): ${name}`);
    return undefined;
  }
  console.warn(`[secretManager] Missing ENV variable (dev, optional): ${name}`);
  return undefined;
}

/**
 * Prüft alle Pflicht-ENVs. PROD: aggregierter Throw. DEV: einzelne Warnung.
 * @returns {{ mode: string, missing: string[], ok: boolean }}
 */
export function validate() {
  const missing = [];
  for (const name of KNOWN) {
    if (raw(name) === undefined) missing.push(name);
  }

  const mode = getMode();
  const ok = missing.length === 0;

  if (!ok) {
    if (isProd()) {
      throw new Error(`Missing required ENV variables: ${missing.join(", ")}`);
    }
    console.warn(
      `[secretManager] DEV mode — missing optional ENV variables: ${missing.join(", ")}`,
    );
  }

  return { mode, missing, ok };
}

export default {
  KNOWN,
  REQUIRED_IN_PROD,
  has,
  preview,
  status,
  consume,
  mask,
  getEnv,
  validate,
  isDev,
  isProd,
};
