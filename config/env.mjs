/**
 * Betriebsmodus-Konfiguration (ESM)
 *
 * Default: development (sicher für öffentliches GitHub-Repository).
 * Im Dev-Modus dürfen keine echten Azure-Verbindungen aufgebaut werden;
 * Datenservices liefern stattdessen Mock-Daten.
 */

const RAW_MODE =
  (typeof process !== "undefined" && process.env && process.env.NODE_ENV) || "development";

export const MODE = RAW_MODE === "production" ? "production" : "development";

export function isDev() {
  return MODE !== "production";
}

export function isProd() {
  return MODE === "production";
}

export function getMode() {
  return MODE;
}

/**
 * Wache: wirft im Dev-Modus, falls Code versucht,
 * eine echte Azure-Verbindung aufzubauen.
 */
export function assertAzureAllowed() {
  if (isDev()) {
    throw new Error(
      "[env] Azure-Verbindungen sind im Development-Modus deaktiviert. " +
        "Setze NODE_ENV=production, um echte Verbindungen zu erlauben.",
    );
  }
}
