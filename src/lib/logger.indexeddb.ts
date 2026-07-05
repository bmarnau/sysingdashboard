/**
 * IndexedDB-Sink für den Logger.
 *
 * Wird ausschließlich dynamisch aus `src/lib/logger.ts` geladen — SSR /
 * Cloudflare-Worker greifen nie hierauf zu. Rotation: max 1000 Einträge
 * oder älter als 7 Tage.
 *
 * Fehler beim Öffnen der DB werden verschluckt (Logging darf nie den
 * App-Fluss stören). Bei nicht-verfügbarer IndexedDB wird `null`
 * zurückgegeben — der Logger fällt dann auf reines In-Memory zurück.
 */
import type { LogEntry } from "./logger";

const DB_NAME = "dashboard-logs";
const STORE = "entries";
const VERSION = 1;
const MAX_ROWS = 1000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("ts", "ts");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let writes = 0;

async function rotate(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const cutoff = new Date(Date.now() - MAX_AGE_MS).toISOString();
    const idx = store.index("ts");
    const range = IDBKeyRange.upperBound(cutoff, true);
    const del = idx.openCursor(range);
    del.onsuccess = () => {
      const cur = del.result;
      if (cur) {
        cur.delete();
        cur.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export function createIndexedDbSink(): (entry: LogEntry) => void {
  const dbPromise = openDb().catch(() => null);

  return (entry: LogEntry): void => {
    void dbPromise.then(async (db) => {
      if (!db) return;
      try {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).add(entry);
        tx.oncomplete = () => {
          writes += 1;
          if (writes % MAX_ROWS === 0) void rotate(db);
        };
      } catch {
        /* niemals eskalieren */
      }
    });
  };
}
