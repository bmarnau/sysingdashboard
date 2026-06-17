/**
 * ExportDownloadService — zentraler Zugang zum Downloadbereich.
 *
 * Wrappt die bestehende IndexedDB-Ablage (ExportArchive) und bietet die
 * im Pflichtenheft beschriebene API für den Downloadbereich.
 */

import {
  ExportArchive,
  downloadBlob,
  type ArchivedExport,
  type ArchivedStatus,
} from "@/lib/export-archive";

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
}

function toItem(a: ArchivedExport): ExportDownloadItem {
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
}

export const ExportDownloadService = {
  async getDownloads(): Promise<ExportDownloadItem[]> {
    if (!ExportArchive.isSupported()) return [];
    const all = await ExportArchive.list();
    return all.map(toItem);
  },

  async addDownload(input: AddDownloadInput): Promise<ExportDownloadItem> {
    const saved = await ExportArchive.save({
      id: input.id,
      fileName: input.fileName,
      format: input.format,
      reportId: input.reportId,
      period: input.period,
      createdBy: input.createdBy,
      status: input.status ?? (input.blob ? "ready" : "creating"),
      error: input.error,
      sizeBytes: input.blob?.size ?? 0,
      blob: input.blob,
    });
    return toItem(saved);
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

  /** Erzeugt eine Object-URL zum Download. Caller muss URL.revokeObjectURL() rufen. */
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
};
