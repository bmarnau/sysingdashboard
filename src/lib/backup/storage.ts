/**
 * IndexedDB-Zugriff für abgelegte Backup-Archive.
 */

import { BACKUP_DB, BACKUP_DB_VERSION, BACKUP_STORE } from "./constants";

export function openBackupDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BACKUP_DB, BACKUP_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BACKUP_STORE)) {
        const store = db.createObjectStore(BACKUP_STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function dbTx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openBackupDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(BACKUP_STORE, mode);
        const req = fn(t.objectStore(BACKUP_STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
        t.onerror = () => reject(t.error);
      }),
  );
}
