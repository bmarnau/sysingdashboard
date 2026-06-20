/**
 * ImportLogService — persistierte Historie aller JSON-Import-Läufe.
 * Speicher: IndexedDB (analog `export-archive`); kein Cloud-Sync,
 * Datenstruktur jedoch so geformt, dass ein späterer Sync 1:1 möglich
 * ist (Stufe 1 Punkt 1 aus dem PDF-Export-Setup).
 */

import type { ImportResult } from "@/lib/json-import-service";

export interface ImportLogEntry extends ImportResult {
  /** Liste der konkreten Konflikt-Fixes (für Audit). */
  conflicts: Array<{
    activityId: string;
    field: string;
    activityValue: unknown;
    timeEntryValue: unknown;
  }>;
  /** Persistierte Mapping-Entscheidungen (für Reproduzierbarkeit). */
  mappings: {
    engineer?: Record<string, string>;
    customer?: Record<string, string>;
  };
  scopes: string[];
}

const DB_NAME = "engineer-dashboard-import-log";
const DB_VERSION = 1;
const STORE = "log";
const RETENTION_DAYS_KEY = "import-log:retention-days";
const DEFAULT_RETENTION_DAYS = 90;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: "runId" });
        s.createIndex("startedAt", "startedAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const r = fn(t.objectStore(STORE));
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        t.oncomplete = () => db.close();
        t.onerror = () => reject(t.error);
      }),
  );
}

export const ImportLogService = {
  isSupported(): boolean {
    return typeof indexedDB !== "undefined";
  },

  getRetentionDays(): number {
    if (typeof window === "undefined") return DEFAULT_RETENTION_DAYS;
    const v = window.localStorage.getItem(RETENTION_DAYS_KEY);
    const n = v ? Number(v) : DEFAULT_RETENTION_DAYS;
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_RETENTION_DAYS;
  },

  setRetentionDays(days: number): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(RETENTION_DAYS_KEY, String(Math.max(1, Math.round(days))));
  },

  async add(entry: ImportLogEntry): Promise<void> {
    if (!this.isSupported()) return;
    await tx("readwrite", (s) => s.put(entry));
  },

  async list(): Promise<ImportLogEntry[]> {
    if (!this.isSupported()) return [];
    const all = await tx<ImportLogEntry[]>("readonly", (s) => s.getAll() as IDBRequest<ImportLogEntry[]>);
    return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  },

  async delete(runId: string): Promise<void> {
    if (!this.isSupported()) return;
    await tx("readwrite", (s) => s.delete(runId));
  },

  async clear(): Promise<void> {
    if (!this.isSupported()) return;
    await tx("readwrite", (s) => s.clear());
  },

  async sweepExpired(): Promise<number> {
    if (!this.isSupported()) return 0;
    const days = this.getRetentionDays();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const all = await this.list();
    let removed = 0;
    for (const e of all) {
      if (new Date(e.startedAt).getTime() < cutoff) {
        await this.delete(e.runId);
        removed++;
      }
    }
    return removed;
  },
};
