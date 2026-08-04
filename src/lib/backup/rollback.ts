/**
 * Pre-Snapshot und Rollback der vom Restore berührten localStorage-Keys.
 */

import { logger } from "../logger";
import { LAST_BACKUP_KEY, LOG_KEY, RESTORE_LOG_KEY, isAppKey } from "./constants";
import type { RestoreSnapshot } from "./types";

const snapshotRegistryRestore = new Map<string, RestoreSnapshot>();

export function takeSnapshotOf(keys: string[]): RestoreSnapshot {
  const id = `restore-snap-${crypto.randomUUID()}`;
  if (typeof window === "undefined") return { id, keys: [] };
  return {
    id,
    keys: keys.map((k) => ({ key: k, value: window.localStorage.getItem(k) })),
  };
}

export function rollbackSnapshot(snap: RestoreSnapshot): void {
  if (typeof window === "undefined") return;
  for (const { key, value } of snap.keys) {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  }
}

export function registerSnapshot(snap: RestoreSnapshot): void {
  snapshotRegistryRestore.set(snap.id, snap);
}

/** Vorheriges Restore rückgängig machen (nur solange dieselbe Session läuft). */
export function rollbackRestore(snapshotId: string): boolean {
  const snap = snapshotRegistryRestore.get(snapshotId);
  if (!snap) return false;
  rollbackSnapshot(snap);
  logger.info("Restore manually rolled back", {
    module: "BackupService",
    action: "restore-rollback",
    snapshotId,
  });
  return true;
}

/** Aktuell vorhandene App-Keys (ohne Protokoll-/Metadaten-Keys). */
export function listCurrentAppKeys(): string[] {
  if (typeof window === "undefined") return [];
  const out: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && isAppKey(k) && k !== LOG_KEY && k !== RESTORE_LOG_KEY && k !== LAST_BACKUP_KEY) {
      out.push(k);
    }
  }
  return out;
}
