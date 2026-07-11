/**
 * ExportDownloadService — zentraler Zugang zum Downloadbereich.
 *
 * Wrappt die bestehende IndexedDB-Ablage (ExportArchive) und bietet die
 * im Pflichtenheft beschriebene API für den Downloadbereich. Verwaltet
 * zusätzlich eine konfigurierbare Aufbewahrungsdauer (Retention) und
 * setzt abgelaufene Einträge automatisch auf Status "expired".
 */

import {
  ExportArchive,
  downloadBlob,
  type ArchivedExport,
  type ArchivedStatus,
} from "@/lib/export-archive";
import { logger } from "@/lib/logger";

export type ExportDownloadStatus = ArchivedStatus;

export interface ExportDownloadItem {
  id: string;
  fileName: string;
  format: "pdf" | "csv" | "json" | "azure-table" | string;
  period: string;
  createdAt: string;
  createdBy: string;
  fileSize?: number;
  status: ExportDownloadStatus;
  reportId?: string;
  error?: string;
  expiresAt?: string;
  retentionDays?: number;
  /** Sekunden bis Ablauf (negativ wenn bereits abgelaufen). null = kein Ablauf gesetzt. */
  expiresInSeconds: number | null;
}

const RETENTION_KEY = "engineer-dashboard:downloads-retention-days";
const DEFAULT_RETENTION_DAYS = 30;
const MIN_RETENTION_DAYS = 1;
const MAX_RETENTION_DAYS = 365;
/** Wie lange ein "expired" Eintrag noch sichtbar bleibt, bevor er endgültig gelöscht wird. */
const PURGE_GRACE_DAYS = 7;

function clampRetention(days: number): number {
  if (!Number.isFinite(days)) return DEFAULT_RETENTION_DAYS;
  return Math.max(MIN_RETENTION_DAYS, Math.min(MAX_RETENTION_DAYS, Math.round(days)));
}

function nowMs(): number {
  return Date.now();
}

function toItem(a: ArchivedExport): ExportDownloadItem {
  const expiresMs = a.expiresAt ? Date.parse(a.expiresAt) : NaN;
  const expiresInSeconds = Number.isFinite(expiresMs)
    ? Math.round((expiresMs - nowMs()) / 1000)
    : null;
  return {
    id: a.id,
    fileName: a.fileName,
    format: a.format,
    period: a.period ?? "—",
    createdAt: a.createdAt,
    createdBy: a.createdBy ?? "—",
    fileSize: a.sizeBytes,
    status: a.status ?? "ready",
    reportId: a.reportId,
    error: a.error,
    expiresAt: a.expiresAt,
    retentionDays: a.retentionDays,
    expiresInSeconds,
  };
}

export interface AddDownloadInput {
  id?: string;
  fileName: string;
  format: ExportDownloadItem["format"];
  period: string;
  createdBy: string;
  reportId: string;
  blob: Blob | null;
  status?: ExportDownloadStatus;
  error?: string;
  /** Optional individuelle Aufbewahrungsdauer in Tagen. Default: globale Einstellung. */
  retentionDays?: number;
}

export const ExportDownloadService = {
  /* --------------------------- Retention --------------------------- */
  getDefaultRetentionDays(): number {
    return DEFAULT_RETENTION_DAYS;
  },

  getRetentionDays(): number {
    if (typeof window === "undefined") return DEFAULT_RETENTION_DAYS;
    const raw = window.localStorage.getItem(RETENTION_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? clampRetention(n) : DEFAULT_RETENTION_DAYS;
  },

  setRetentionDays(days: number): number {
    const v = clampRetention(days);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(RETENTION_KEY, String(v));
      } catch {
        /* ignore */
      }
    }
    return v;
  },

  computeExpiresAt(createdAt: string, retentionDays: number): string {
    const base = Date.parse(createdAt);
    const start = Number.isFinite(base) ? base : nowMs();
    return new Date(start + retentionDays * 86_400_000).toISOString();
  },

  /* --------------------------- Liste / CRUD --------------------------- */
  async getDownloads(): Promise<ExportDownloadItem[]> {
    if (!ExportArchive.isSupported()) return [];
    await this.sweepExpired();
    const all = await ExportArchive.list();
    return all.map(toItem);
  },

  async addDownload(input: AddDownloadInput): Promise<ExportDownloadItem> {
    const createdAt = new Date().toISOString();
    const retentionDays = clampRetention(input.retentionDays ?? this.getRetentionDays());
    const expiresAt = this.computeExpiresAt(createdAt, retentionDays);
    try {
      const saved = await ExportArchive.save({
        id: input.id,
        createdAt,
        fileName: input.fileName,
        format: input.format,
        reportId: input.reportId,
        period: input.period,
        createdBy: input.createdBy,
        status: input.status ?? (input.blob ? "ready" : "creating"),
        error: input.error,
        sizeBytes: input.blob?.size ?? 0,
        blob: input.blob,
        expiresAt,
        retentionDays,
      });
      logger.debug("Download registered", {
        module: "ExportDownloadService",
        action: "addDownload",
        id: saved.id,
        format: input.format,
        status: saved.status,
        sizeBytes: saved.sizeBytes,
      });
      return toItem(saved);
    } catch (err) {
      logger.error("Download registration failed", err, {
        module: "ExportDownloadService",
        action: "addDownload",
        fileName: input.fileName,
        format: input.format,
      });
      throw err;
    }
  },

  async updateDownloadStatus(
    id: string,
    status: ExportDownloadStatus,
    extra?: { error?: string; blob?: Blob | null; fileSize?: number },
  ): Promise<ExportDownloadItem | null> {
    const patch: Parameters<typeof ExportArchive.update>[1] = { status };
    if (extra?.error !== undefined) patch.error = extra.error;
    if (extra?.blob !== undefined) {
      patch.blob = extra.blob;
      if (extra.blob) patch.sizeBytes = extra.blob.size;
    }
    if (extra?.fileSize !== undefined) patch.sizeBytes = extra.fileSize;
    const updated = await ExportArchive.update(id, patch);
    return updated ? toItem(updated) : null;
  },

  async getDownloadUrl(id: string): Promise<string | null> {
    const rec = await ExportArchive.get(id);
    if (!rec || !rec.blob) return null;
    return URL.createObjectURL(rec.blob);
  },

  async getBlob(id: string): Promise<Blob | null> {
    const rec = await ExportArchive.get(id);
    return rec?.blob ?? null;
  },

  async triggerDownload(id: string): Promise<boolean> {
    const rec = await ExportArchive.get(id);
    if (!rec || !rec.blob) return false;
    downloadBlob(rec.blob, rec.fileName);
    return true;
  },

  async deleteDownload(id: string): Promise<void> {
    await ExportArchive.delete(id);
  },

  /* --------------------------- Expiry-Sweep --------------------------- */

  /**
   * Markiert alle abgelaufenen Einträge als "expired" und entfernt
   * Einträge, die länger als die Karenzzeit (7 Tage) als "expired"
   * vorliegen, endgültig aus der Ablage.
   *
   * Idempotent — kann beliebig oft aufgerufen werden.
   */
  async sweepExpired(): Promise<{ marked: number; purged: number }> {
    if (!ExportArchive.isSupported()) return { marked: 0, purged: 0 };
    const all = await ExportArchive.list();
    const now = nowMs();
    let marked = 0;
    let purged = 0;
    for (const item of all) {
      if (!item.expiresAt) continue;
      const exp = Date.parse(item.expiresAt);
      if (!Number.isFinite(exp)) continue;
      if (now >= exp && item.status !== "expired" && item.status !== "failed") {
        await ExportArchive.update(item.id, { status: "expired" });
        marked++;
      }
      // Endgültiges Löschen nach Karenzzeit
      const purgeAfter = exp + PURGE_GRACE_DAYS * 86_400_000;
      if (item.status === "expired" && now >= purgeAfter) {
        await ExportArchive.delete(item.id);
        purged++;
      }
    }
    if (marked > 0 || purged > 0) {
      logger.info("Download retention sweep", {
        module: "ExportDownloadService",
        action: "sweepExpired",
        marked,
        purged,
      });
    }
    return { marked, purged };
  },

  /** Manuell alle abgelaufenen Einträge löschen (UI-Aktion). */
  async purgeExpiredNow(): Promise<number> {
    const all = await ExportArchive.list();
    let n = 0;
    for (const it of all) {
      if (it.status === "expired") {
        await ExportArchive.delete(it.id);
        n++;
      }
    }
    logger.info("Downloads purged", {
      module: "ExportDownloadService",
      action: "purgeExpiredNow",
      purged: n,
    });
    return n;
  },
};
