/**
 * AzureHistoryStore — flüchtige, lokale Historie für den Azure-Bereich.
 *
 * Zweck: UI-nahe Anzeige der letzten Verbindungstests, Exporte und Importe,
 * ohne Backend-Abhängigkeit. Wird später durch serverseitige Historie
 * abgelöst (`/api/azure/history`).
 *
 * Sicherheit: Es werden ausschließlich secret-freie Metadaten gespeichert
 * (Kind, Ergebnis, Zeitstempel, Auslöser, generische Meldung). Persistenz
 * in `localStorage` unter einem app-eigenen Prefix; das Modul funktioniert
 * auch ohne `window` (SSR-sicher, No-Op im Server).
 */

import type { AzureActionKind, AzureHistoryEntry, AzureHistorySnapshot } from "./types";

const STORAGE_KEY = "azure:history:v1";
const MAX_PER_KIND = 50;

type Listener = () => void;
const listeners = new Set<Listener>();

function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readAll(): AzureHistorySnapshot {
  if (!hasStorage()) return emptySnapshot();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as Partial<AzureHistorySnapshot>;
    return {
      connectionTests: Array.isArray(parsed.connectionTests) ? parsed.connectionTests : [],
      exports: Array.isArray(parsed.exports) ? parsed.exports : [],
      imports: Array.isArray(parsed.imports) ? parsed.imports : [],
    };
  } catch {
    return emptySnapshot();
  }
}

function writeAll(snap: AzureHistorySnapshot): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch {
    // Quota o.ä. — bewusst schlucken.
  }
  for (const l of listeners) l();
}

function emptySnapshot(): AzureHistorySnapshot {
  return { connectionTests: [], exports: [], imports: [] };
}

function bucketOf(kind: AzureActionKind): keyof AzureHistorySnapshot | null {
  switch (kind) {
    case "connection-test":
      return "connectionTests";
    case "export":
      return "exports";
    case "import":
      return "imports";
    default:
      return null; // database-build wird in `connectionTests` mit-geloggt? Nein — separat halten.
  }
}

export const AzureHistoryStore = {
  snapshot(): AzureHistorySnapshot {
    return readAll();
  },

  add(entry: AzureHistoryEntry): void {
    const bucket = bucketOf(entry.kind);
    if (!bucket) return;
    const snap = readAll();
    const list = [entry, ...snap[bucket]].slice(0, MAX_PER_KIND);
    writeAll({ ...snap, [bucket]: list });
  },

  clear(): void {
    writeAll(emptySnapshot());
  },

  subscribe(cb: Listener): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};

export function newHistoryId(): string {
  return `azh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
