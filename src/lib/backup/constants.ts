/**
 * Konstanten und Schlüssel-Klassifikation des Backup-Moduls.
 *
 * Enthält Speicherorte (IndexedDB/localStorage) sowie die Regeln, welche
 * localStorage-Schlüssel gesichert werden dürfen und welche als sensibel
 * gelten.
 */

export const PROJECT_NAME = "dashboard";
export const BACKUP_DB = "engineer-dashboard-backups";
export const BACKUP_STORE = "backups";
export const BACKUP_DB_VERSION = 1;

export const LAST_BACKUP_KEY = "backup:lastAuto";
export const LOG_KEY = "backup:log";
export const LOG_MAX = 100;

export const RESTORE_LOG_KEY = "backup:restoreLog";
export const RESTORE_LOG_MAX = 100;

/**
 * localStorage-Keys/Prefixes, die zum Dashboard gehören und gesichert werden
 * sollen. Bewusst breit gehalten (alle App-eigenen Keys), aber per Denylist
 * werden potenzielle Secrets ausgefiltert.
 */
export const APP_KEY_ALLOWLIST_PREFIXES = [
  "engineer-dashboard",
  "engineerDashboard",
  "engineer:",
  "dashboard:",
  "user-management",
  "userManagement",
  "users:",
  "working-time",
  "workingTime",
  "target-time",
  "targetTime",
  "time-period",
  "timePeriod",
  "perf-report",
  "performance-report",
  "report:",
  "app.locale",
  "i18n:",
  "backup:log", // Log selbst mitsichern, damit Historie erhalten bleibt
];

/**
 * Substrings, die auf sensible Daten hindeuten und NIE ins Backup wandern.
 */
export const SENSITIVE_SUBSTRINGS = [
  "password",
  "passwd",
  "secret",
  "token",
  "api_key",
  "apikey",
  "api-key",
  "private_key",
  "privatekey",
  "credential",
  "auth_token",
  "access_token",
  "refresh_token",
  "bearer",
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function buildFileName(date = new Date()): string {
  return `${PROJECT_NAME}-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}-${pad(date.getHours())}-${pad(date.getMinutes())}.zip`;
}

export function isAppKey(key: string): boolean {
  return APP_KEY_ALLOWLIST_PREFIXES.some((p) => key.startsWith(p));
}

export function looksSensitive(key: string, value: string): boolean {
  const k = key.toLowerCase();
  if (SENSITIVE_SUBSTRINGS.some((s) => k.includes(s))) return true;
  // Werte mit sehr langem Zufallsstring + bekannten Keys absichern
  if (/(eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/.test(value)) return true; // JWT
  return false;
}

/** Dateiname-sichere Repräsentation eines Storage-Keys. */
export function safeKeyFileName(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** Aktuelle Manifest-Version (Backupformat 2.0). */
export const MANIFEST_VERSION = "2.0";

/** MAJOR-Version, die dieser Client schreibt und primär versteht. */
export const EXPECTED_MANIFEST_MAJOR = 2;

/** Speicherpräfix der Datendateien im Archiv. */
export const DATA_DIR = "data/";

/** Ableitung des Inhaltstyps aus der Speicheradresse. */
export function contentTypeForPath(path: string): string {
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".md")) return "text/markdown";
  return "text/plain";
}
