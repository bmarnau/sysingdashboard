/**
 * Gemeinsame Typen des Backup-/Restore-Moduls.
 *
 * Bewusst frei von Laufzeitcode, damit jedes Teilmodul die Typen importieren
 * kann, ohne Zyklen zu erzeugen.
 */

export type BackupCheckStatus = "ok" | "warning" | "failed";

export interface BackupCheckResult {
  status: BackupCheckStatus;
  messages: string[];
}

export interface BackupRecordMeta {
  id: string;
  fileName: string;
  createdAt: string;
  sizeBytes: number;
  manual: boolean;
  status: BackupCheckStatus;
  checkMessages: string[];
}

export interface BackupLogEntry {
  id: string;
  timestamp: string;
  fileName: string;
  sizeBytes: number;
  manual: boolean;
  consistency: BackupCheckResult;
  zipValidation: BackupCheckResult;
  errors: string[];
}

export interface BackupRecordStored extends BackupRecordMeta {
  bytes: Uint8Array;
}

export interface BackupRecord extends BackupRecordMeta {
  blob: Blob;
  bytes: Uint8Array;
}

export interface Snapshot {
  manifest: {
    version: 1;
    project: string;
    createdAt: string;
    keyCount: number;
    excludedKeys: string[];
    archiveItemCount: number;
    note: string;
  };
  data: Record<string, unknown>;
  archive: Array<{
    id: string;
    fileName: string;
    format: string;
    reportId: string;
    createdAt: string;
    sizeBytes: number;
  }>;
}

export interface CreateBackupOptions {
  manual?: boolean;
}

export interface CreateBackupResult {
  ok: boolean;
  record?: BackupRecordMeta;
  log: BackupLogEntry;
}

/**
 * Wiederherstellungsmodi:
 *  - "empty"     verlangt einen leeren Zielzustand (keine App-Keys vorhanden).
 *  - "overwrite" ersetzt vorhandene Keys komplett.
 *  - "merge"     überschreibt nur die im Backup enthaltenen Keys, lässt
 *                unbekannte lokale Keys stehen.
 */
export type RestoreMode = "empty" | "overwrite" | "merge";

export interface RestoreOptions {
  actor: string;
  mode: RestoreMode;
  /** Ältere MINOR/PATCH akzeptieren (Default true). */
  allowOlderMinor?: boolean;
  /** Neuere MAJOR/MINOR akzeptieren (Default false — Vorsicht). */
  allowNewer?: boolean;
  /** Erwarteter Projektname. Default `dashboard`. */
  expectedProject?: string;
}

export interface RestoreResult {
  ok: boolean;
  runId: string;
  snapshotId: string | null;
  startedAt: string;
  finishedAt: string;
  actor: string;
  mode: RestoreMode;
  fileName?: string;
  counts: { keysWritten: number; keysSkipped: number; keysConsidered: number };
  warnings: string[];
  errors: string[];
  rollback: boolean;
}

export interface RestoreSnapshot {
  id: string;
  keys: Array<{ key: string; value: string | null }>;
}
