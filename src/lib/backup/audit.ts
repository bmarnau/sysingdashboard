/**
 * Protokollierung: Backup-Log und Restore-Log in localStorage.
 */

import { LOG_KEY, LOG_MAX, RESTORE_LOG_KEY, RESTORE_LOG_MAX } from "./constants";
import type { BackupLogEntry, RestoreResult } from "./types";

export function readLog(): BackupLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLog(entry: BackupLogEntry): void {
  if (typeof window === "undefined") return;
  try {
    const log = readLog();
    log.unshift(entry);
    window.localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, LOG_MAX)));
  } catch {
    /* localStorage voll — ignorieren */
  }
}

export function readRestoreLog(): RestoreResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RESTORE_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeRestoreLog(entry: RestoreResult): void {
  if (typeof window === "undefined") return;
  try {
    const log = readRestoreLog();
    log.unshift(entry);
    window.localStorage.setItem(RESTORE_LOG_KEY, JSON.stringify(log.slice(0, RESTORE_LOG_MAX)));
  } catch {
    /* quota — ignore */
  }
}

export function restoreLog(): RestoreResult[] {
  return readRestoreLog();
}

export function clearRestoreLog(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(RESTORE_LOG_KEY);
}
