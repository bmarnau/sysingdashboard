/**
 * Tab-übergreifende Synchronisierung der Inaktivität.
 *
 * Überträgt ausschließlich Zeitstempel und ein Logout-Signal — niemals
 * Tokens, Benutzerdaten oder Session-Inhalte.
 *
 * Primär `BroadcastChannel`; Fallback über `localStorage` + `storage`-Event
 * für Browser/Kontexte ohne BroadcastChannel.
 */

import { logger } from "@/lib/logger";

export const IDLE_CHANNEL_NAME = "sysing-idle";
export const IDLE_ACTIVITY_STORAGE_KEY = "sysing:idle:last-activity";
const FALLBACK_KEY = "sysing:idle:signal";

export type IdleMessage =
  | { type: "activity"; timestamp: number }
  | { type: "logout"; timestamp: number };

export interface IdleChannelHandle {
  post: (message: IdleMessage) => void;
  close: () => void;
}

function isIdleMessage(value: unknown): value is IdleMessage {
  if (!value || typeof value !== "object") return false;
  const m = value as Record<string, unknown>;
  return (
    (m.type === "activity" || m.type === "logout") &&
    typeof m.timestamp === "number" &&
    Number.isFinite(m.timestamp)
  );
}

/** Persistiert den letzten Aktivitätszeitpunkt für Reload/neue Tabs. */
export function persistLastActivity(timestamp: number): void {
  try {
    window.localStorage.setItem(IDLE_ACTIVITY_STORAGE_KEY, String(timestamp));
  } catch {
    /* Storage deaktiviert — Monitor arbeitet dann nur im Speicher. */
  }
}

/**
 * Liest den persistierten Zeitstempel mit Plausibilitätsprüfung.
 * Zukunftswerte oder Werte älter als `timeoutMs * 2` gelten als unbrauchbar.
 */
export function readLastActivity(timeoutMs: number, now = Date.now()): number | null {
  try {
    const raw = window.localStorage.getItem(IDLE_ACTIVITY_STORAGE_KEY);
    if (!raw) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return null;
    if (value > now + 60_000) return null;
    if (now - value > timeoutMs * 2) return null;
    return value;
  } catch {
    return null;
  }
}

export function clearLastActivity(): void {
  try {
    window.localStorage.removeItem(IDLE_ACTIVITY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function openIdleChannel(onMessage: (message: IdleMessage) => void): IdleChannelHandle {
  if (typeof window === "undefined") {
    return { post: () => undefined, close: () => undefined };
  }

  if (typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel(IDLE_CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent) => {
        if (isIdleMessage(event.data)) onMessage(event.data);
      };
      return {
        post: (message) => {
          try {
            channel.postMessage(message);
          } catch {
            /* Kanal geschlossen */
          }
        },
        close: () => {
          try {
            channel.close();
          } catch {
            /* ignore */
          }
        },
      };
    } catch {
      logger.warn("BroadcastChannel nicht verfügbar — Storage-Fallback aktiv", {
        operation: "idle.channel",
      });
    }
  }

  const handler = (event: StorageEvent) => {
    if (event.key !== FALLBACK_KEY || !event.newValue) return;
    try {
      const parsed: unknown = JSON.parse(event.newValue);
      if (isIdleMessage(parsed)) onMessage(parsed);
    } catch {
      /* fremder Wert */
    }
  };
  window.addEventListener("storage", handler);
  return {
    post: (message) => {
      try {
        window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(message));
      } catch {
        /* ignore */
      }
    },
    close: () => window.removeEventListener("storage", handler),
  };
}
