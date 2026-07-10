/**
 * Nur-lesende Query-API für den IndexedDB-Log-Sink.
 *
 * Bewusst getrennt von `logger.indexeddb.ts` (Write-Sink), damit der
 * Hot-Path des Loggers minimal bleibt und die Reader-Logik nur vom
 * Log-Viewer geladen wird.
 *
 * Fehler beim Öffnen/Lesen der DB werden verschluckt und als leeres
 * Ergebnis zurückgegeben — der Log-Viewer fällt auf den In-Memory-Ring
 * zurück.
 */
import type { LogEntry } from "./logger";

const DB_NAME = "dashboard-logs";
const STORE = "entries";
const VERSION = 1;

function hasIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
          store.createIndex("ts", "ts");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Liest alle persistierten Log-Einträge (aufsteigend nach Timestamp).
 * Der Aufrufer sortiert/filtert weiter.
 */
export async function readAllLogs(): Promise<LogEntry[]> {
  if (!hasIndexedDb()) return [];
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const rows = (req.result ?? []) as LogEntry[];
        resolve(rows);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/** Löscht alle Einträge aus dem IndexedDB-Sink. Ringpuffer bleibt separat. */
export async function clearAllLogs(): Promise<void> {
  if (!hasIndexedDb()) return;
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
