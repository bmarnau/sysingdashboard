/**
 * Environment Validator (ESM, Backend-only)
 *
 * Zentrale, sichere Prüfung aller produktionskritischen ENV-Variablen.
 *
 * Regeln:
 *  - Niemals ENV-Werte loggen. Nur Variablennamen.
 *  - Keine Defaultwerte, keine Fallback-Strings.
 *  - DEV bleibt ohne Azure-ENVs lauffähig (Warnung).
 *  - PROD startet hart fehl (Throw), wenn Pflicht-ENVs fehlen.
 *  - Darf NICHT aus src/ (Frontend-Bundle) importiert werden.
 */

import { isDev, isProd, getMode } from "./env.mjs";

export { isDev, isProd };

/**
 * Liste der in Production zwingend erforderlichen ENV-Variablen.
 * In DEV sind alle optional.
 */
export const REQUIRED_IN_PROD = Object.freeze([
  "AZURE_SQL_CONNECTION",
  "AZURE_TABLE_CONNECTION",
  "AZURE_STORAGE_SAS",
  "AZURE_CLIENT_ID",
  "AZURE_TENANT_ID",
]);

function readRaw(name) {
  if (typeof process === "undefined" || !process.env) return undefined;
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

/**
 * Liest eine ENV-Variable nach den oben dokumentierten Regeln.
 *
 * @param {string} name - Name der ENV-Variable.
 * @param {boolean} [requiredInProd=true] - In PROD zwingend?
 * @returns {string|undefined}
 */
export function getEnv(name, requiredInProd = true) {
  if (typeof name !== "string" || name.length === 0) {
    throw new Error("[envValidator] getEnv: name must be a non-empty string");
  }
  const value = readRaw(name);
  if (value !== undefined) return value;

  if (isProd()) {
    if (requiredInProd) {
      throw new Error(`Missing required ENV variable: ${name}`);
    }
    console.warn(`[envValidator] Missing ENV variable (prod, optional): ${name}`);
    return undefined;
  }

  console.warn(`[envValidator] Missing ENV variable (dev, optional): ${name}`);
  return undefined;
}

/**
 * Prüft alle Pflicht-ENVs. In PROD wird bei Fehlen ein aggregierter
 * Error geworfen (alle fehlenden Namen auf einmal), in DEV nur gewarnt.
 *
 * @returns {{ mode: string, missing: string[], ok: boolean }}
 */
export function validateEnv() {
  const missing = [];
  for (const name of REQUIRED_IN_PROD) {
    if (readRaw(name) === undefined) missing.push(name);
  }

  const mode = getMode();
  const ok = missing.length === 0;

  if (!ok) {
    if (isProd()) {
      // Aggregierter Throw — Operator sieht alles fehlende auf einmal.
      throw new Error(
        `Missing required ENV variables: ${missing.join(", ")}`,
      );
    }
    console.warn(
      `[envValidator] DEV mode — missing optional ENV variables: ${missing.join(", ")}`,
    );
  }

  return { mode, missing, ok };
}

export default { isDev, isProd, getEnv, validateEnv, REQUIRED_IN_PROD };
