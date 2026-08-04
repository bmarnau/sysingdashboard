/**
 * Orchestrierung: Backup erstellen, verwalten, täglich planen.
 */

import { logger } from "../logger";
import { BackupError } from "../errors";
import { readLog, writeLog } from "./audit";
import { LAST_BACKUP_KEY, LOG_KEY, buildFileName } from "./constants";
import { runConsistencyCheck, validateZip } from "./integrity";
import { collectSnapshot } from "./snapshot";
import { dbTx } from "./storage";
import { buildZip } from "./zip";
import type {
  BackupCheckResult,
  BackupCheckStatus,
  BackupLogEntry,
  BackupRecord,
  BackupRecordMeta,
  BackupRecordStored,
  CreateBackupOptions,
  CreateBackupResult,
} from "./types";

export const BackupService = {
  buildFileName,

  async createBackup(opts: CreateBackupOptions = {}): Promise<CreateBackupResult> {
    const manual = opts.manual ?? false;
    const errors: string[] = [];
    const fileName = buildFileName();
    const id = crypto.randomUUID();
    let consistency: BackupCheckResult = { status: "ok", messages: [] };
    let zipValidation: BackupCheckResult = { status: "ok", messages: [] };
    let sizeBytes = 0;

    try {
      // 1. Snapshot sammeln
      const snapshot = await collectSnapshot();

      // 2. Vor-Validierung
      consistency = runConsistencyCheck(snapshot);
      if (consistency.status === "failed") {
        throw new Error("Projektprüfung fehlgeschlagen: " + consistency.messages.join("; "));
      }

      // 3. ZIP bauen
      const bytes = buildZip(snapshot);
      sizeBytes = bytes.length;
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/zip" });

      // 4. ZIP validieren
      zipValidation = validateZip(bytes, snapshot);
      if (zipValidation.status === "failed") {
        throw new Error("ZIP-Validierung fehlgeschlagen: " + zipValidation.messages.join("; "));
      }

      // 5. Persistieren
      const status: BackupCheckStatus =
        consistency.status === "warning" || zipValidation.status === "warning" ? "warning" : "ok";

      const record: BackupRecord = {
        id,
        fileName,
        createdAt: new Date().toISOString(),
        sizeBytes,
        manual,
        status,
        checkMessages: [...consistency.messages, ...zipValidation.messages],
        blob,
        bytes: new Uint8Array(bytes),
      };

      const stored: BackupRecordStored = {
        id: record.id,
        fileName: record.fileName,
        createdAt: record.createdAt,
        sizeBytes: record.sizeBytes,
        manual: record.manual,
        status: record.status,
        checkMessages: record.checkMessages,
        bytes: record.bytes,
      };
      await dbTx("readwrite", (s) => s.put(stored));
      window.localStorage.setItem(LAST_BACKUP_KEY, record.createdAt);

      const logEntry: BackupLogEntry = {
        id,
        timestamp: record.createdAt,
        fileName,
        sizeBytes,
        manual,
        consistency,
        zipValidation,
        errors: [],
      };
      writeLog(logEntry);

      const { blob: _b, bytes: _by, ...meta } = record;
      return { ok: true, record: meta, log: logEntry };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      logger.error(
        "Backup failed",
        new BackupError("BACKUP_FAILED", message, { cause: err, context: { manual, fileName } }),
        { manual, fileName },
      );

      const logEntry: BackupLogEntry = {
        id,
        timestamp: new Date().toISOString(),
        fileName,
        sizeBytes,
        manual,
        consistency,
        zipValidation,
        errors,
      };
      writeLog(logEntry);
      return { ok: false, log: logEntry };
    }
  },

  async list(): Promise<BackupRecordMeta[]> {
    try {
      const all = await dbTx<BackupRecordStored[]>(
        "readonly",
        (s) => s.getAll() as IDBRequest<BackupRecordStored[]>,
      );
      return all
        .map(({ bytes: _by, ...meta }) => meta)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err) {
      logger.error("Backup list could not be loaded", err);
      return [];
    }
  },

  async get(id: string): Promise<BackupRecord | undefined> {
    const stored = await dbTx<BackupRecordStored | undefined>(
      "readonly",
      (s) => s.get(id) as IDBRequest<BackupRecordStored | undefined>,
    );
    if (!stored) return undefined;
    const bytes = stored.bytes instanceof Uint8Array ? stored.bytes : new Uint8Array(stored.bytes);
    const blob = new Blob([bytes as BlobPart], { type: "application/zip" });
    return { ...stored, bytes, blob };
  },

  async delete(id: string): Promise<void> {
    await dbTx("readwrite", (s) => s.delete(id));
  },

  async clear(): Promise<void> {
    await dbTx("readwrite", (s) => s.clear());
  },

  log(): BackupLogEntry[] {
    return readLog();
  },

  clearLog(): void {
    if (typeof window !== "undefined") window.localStorage.removeItem(LOG_KEY);
  },

  lastAuto(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(LAST_BACKUP_KEY);
  },

  /**
   * Stößt täglich automatisch ein Backup an. Aufruf einmalig in der App
   * (z. B. im Root-useEffect). Erstellt höchstens 1× pro Kalendertag ein
   * automatisches Backup.
   */
  scheduleDaily(): void {
    if (typeof window === "undefined") return;

    const tryRun = () => {
      const last = window.localStorage.getItem(LAST_BACKUP_KEY);
      const today = new Date().toISOString().slice(0, 10);
      const lastDay = last?.slice(0, 10);
      if (lastDay === today) return;
      // Nicht blockierend
      void this.createBackup({ manual: false }).catch((err) => {
        logger.error("Scheduled backup failed", err, { manual: false });
      });
    };

    // Sofortiger Check beim Start
    tryRun();
    // Alle 6 Stunden erneut prüfen (für lange offene Tabs)
    window.setInterval(tryRun, 6 * 60 * 60 * 1000);
  },
};

export function triggerBackupDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
