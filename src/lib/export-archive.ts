/**
 * Lokale Ablage für erzeugte Exporte.
 *
 * Speichert Blobs in IndexedDB (Browser-lokal, kein Backend). Wird vom
 * Export-Workflow als optionales Speicherziel angeboten.
 */

export type ArchivedStatus = "creating" | "ready" | "failed" | "expired";

export interface ArchivedExport {
  id: string;
  fileName: string;
  format: string;
  reportId: string;
  createdAt: string; // ISO
  sizeBytes: number;
  /** Zeitraum (z. B. "2026-06" oder "Juni 2026"). */
  period?: string;
  /** Anzeigename des Erstellers. */
  createdBy?: string;
  /** Verarbeitungsstatus. */
  status?: ArchivedStatus;
  /** Optionale Fehlermeldung bei status === "failed". */
  error?: string;
  // Blob wird separat geladen; im List-Result kein Blob.
}

interface ArchivedRecord extends ArchivedExport {
  blob: Blob | null;
}

const DB_NAME = "engineer-dashboard-exports";
const DB_VERSION = 1;
const STORE = "exports";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
        t.onerror = () => reject(t.error);
      }),
  );
}

export const ExportArchive = {
  isSupported(): boolean {
    return typeof indexedDB !== "undefined";
  },

  async save(
    record: Omit<ArchivedRecord, "id" | "createdAt"> & { createdAt?: string },
  ): Promise<ArchivedExport> {
    const entry: ArchivedRecord = {
      id: crypto.randomUUID(),
      createdAt: record.createdAt ?? new Date().toISOString(),
      fileName: record.fileName,
      format: record.format,
      reportId: record.reportId,
      sizeBytes: record.sizeBytes,
      blob: record.blob,
    };
    await tx("readwrite", (s) => s.put(entry));
    // Blob aus dem Listen-Result fernhalten
    const { blob: _b, ...meta } = entry;
    return meta;
  },

  async list(): Promise<ArchivedExport[]> {
    const all = await tx<ArchivedRecord[]>(
      "readonly",
      (s) => s.getAll() as IDBRequest<ArchivedRecord[]>,
    );
    return all
      .map(({ blob: _b, ...meta }) => meta)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async get(id: string): Promise<ArchivedRecord | undefined> {
    return tx<ArchivedRecord | undefined>(
      "readonly",
      (s) => s.get(id) as IDBRequest<ArchivedRecord | undefined>,
    );
  },

  async delete(id: string): Promise<void> {
    await tx("readwrite", (s) => s.delete(id));
  },

  async clear(): Promise<void> {
    await tx("readwrite", (s) => s.clear());
  },
};

/* ----------------------- File System Access API ------------------------ */

export type SaveTarget = "picker" | "download" | "archive";

const TARGET_PREF_KEY = "engineer-dashboard:export-target";

export function loadPreferredTarget(): SaveTarget | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(TARGET_PREF_KEY);
  return v === "picker" || v === "download" || v === "archive" ? v : null;
}

export function savePreferredTarget(t: SaveTarget) {
  try {
    window.localStorage.setItem(TARGET_PREF_KEY, t);
  } catch {
    /* ignore */
  }
}

export function isFsAccessSupported(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

/** Datei speichern unter… (mit Pfad-Auswahl). Fallback: normaler Download. */
export async function saveBlobViaPicker(blob: Blob, suggestedName: string): Promise<string | null> {
  if (!isFsAccessSupported()) {
    downloadBlob(blob, suggestedName);
    return suggestedName;
  }
  try {
    const ext = suggestedName.split(".").pop()?.toLowerCase() ?? "pdf";
    const mime = blob.type || (ext === "pdf" ? "application/pdf" : "application/octet-stream");
    // @ts-expect-error showSaveFilePicker not in lib.dom in older TS
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: ext.toUpperCase(),
          accept: { [mime]: [`.${ext}`] },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return handle.name as string;
  } catch (err) {
    if ((err as DOMException)?.name === "AbortError") return null; // User abgebrochen
    throw err;
  }
}

/** Direkter Browser-Download (Standard-Downloads-Ordner). */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
