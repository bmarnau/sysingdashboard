/**
 * Secret Manager
 *
 * Kapselt jeden Zugriff auf sensible Umgebungsvariablen.
 * Regeln:
 *  - Keine Defaultwerte für echte Verbindungen.
 *  - Öffentliche API gibt niemals Roh-Strings zurück, nur Booleans,
 *    maskierte Vorschauen oder einen Statusbericht.
 *  - Klartext nur über `consume(name)` und nur in Production.
 *  - Keine `console.log`-Aufrufe mit Werten.
 */

const { isDev } = require("./env.cjs");

const KNOWN = Object.freeze([
  "AZURE_SQL_CONNECTION",
  "AZURE_TABLE_CONNECTION",
  "AZURE_STORAGE_SAS",
  "AZURE_CLIENT_ID",
  "AZURE_TENANT_ID",
]);

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

function has(name) {
  assertKnown(name);
  return raw(name) !== undefined;
}

function mask(value) {
  if (!value) return "";
  const s = String(value);
  if (s.length <= 8) return "•".repeat(s.length);
  return `${s.slice(0, 2)}…${s.slice(-2)}`;
}

function preview(name) {
  assertKnown(name);
  return mask(raw(name));
}

/**
 * Status aller bekannten Secrets — nur Booleans, keine Werte.
 * Geeignet für Health-Checks und Diagnose-UIs.
 */
function status() {
  const out = {};
  for (const n of KNOWN) out[n] = has(n);
  return out;
}

/**
 * Einziger Weg an den Klartext eines Secrets.
 * Im Dev-Modus blockiert — verhindert versehentliche Azure-Aufrufe
 * gegen echte Endpunkte beim Entwickeln am öffentlichen Repo.
 */
function consume(name) {
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

module.exports = {
  KNOWN,
  has,
  preview,
  status,
  consume,
  mask,
};
