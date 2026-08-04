/**
 * Fassade — Backup-/Restore-Service.
 *
 * Die Implementierung liegt seit Sprint 05E modular unter `src/lib/backup/`
 * (siehe ADR-0021). Dieses Modul bleibt als stabile, öffentliche
 * Importadresse bestehen und leitet ausschließlich weiter — bewusst ohne
 * eigene Logik, damit es keine zweite Wahrheit gibt.
 *
 * Modulübersicht:
 *   - `backup/constants.ts`    Speicherorte, Key-Allowlist, Secret-Denylist
 *   - `backup/storage.ts`      IndexedDB-Zugriff
 *   - `backup/snapshot.ts`     Sammeln + Filtern des App-Zustands
 *   - `backup/templates.ts`    README/INSTALL/.env.example
 *   - `backup/zip.ts`          ZIP-Erzeugung inkl. `dashboard.json`
 *   - `backup/integrity.ts`    Konsistenz- und ZIP-Prüfung
 *   - `backup/audit.ts`        Backup- und Restore-Protokoll
 *   - `backup/rollback.ts`     Pre-Snapshot und Rücknahme
 *   - `backup/merge.ts`        Modusabhängige Schreibstrategie
 *   - `backup/restore.ts`      Wiederherstellung (transaktional)
 *   - `backup/create-backup.ts` Orchestrierung + Zeitplan
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
} from "./backup/types";

export {
  BackupService,
  clearRestoreLog,
  restoreFromZip,
  restoreLog,
  rollbackRestore,
  triggerBackupDownload,
} from "./backup";
