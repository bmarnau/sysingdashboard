/**
 * Öffentliche API des Backup-/Restore-Moduls.
 *
 * Einstiegspunkt für die Anwendung; `@/lib/backup-service` bleibt als
 * kompatible Fassade bestehen.
 */

export type {
  BackupCheckResult,
  BackupCheckStatus,
  BackupLogEntry,
  BackupRecord,
  BackupRecordMeta,
  CreateBackupOptions,
  CreateBackupResult,
  RestoreMode,
  RestoreOptions,
  RestoreResult,
} from "./types";

export { BackupService, triggerBackupDownload } from "./create-backup";
export { restoreFromZip } from "./restore";
export { rollbackRestore } from "./rollback";
export { clearRestoreLog, restoreLog } from "./audit";
