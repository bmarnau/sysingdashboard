/**
 * Zentraler Logger für das Dashboard.
 *
 * Design-Entscheidungen:
 *  - **Level**: `debug | info | warn | error`. Kein `trace`, um DevTools
 *    nicht mit Rauschen zu fluten.
 *  - **Sinks**: In DEV (`import.meta.env.DEV`) wird direkt auf die
 *    Browser-Console geschrieben (echte `console.*`-Methoden — nur hier
 *    ausdrücklich erlaubt, siehe `scripts/check-no-console.mjs`). In
 *    PROD landen Einträge in einem In-Memory-Ringpuffer (500 Einträge)
 *    und werden asynchron nach IndexedDB gespiegelt.
 *  - **SSR-Safety**: Kein Zugriff auf `window` / `indexedDB` beim
 *    Modul-Load; der IndexedDB-Adapter wird lazy dynamisch geladen und
 *    im Worker-/SSR-Kontext einfach übersprungen.
 *  - **Secret-Redaction**: Vor jedem Sink-Write werden Kontext-Keys mit
 *    Namen wie `token`, `secret`, `password`, `authorization`, `bearer`,
 *    `apikey` maskiert. Zusätzlich werden String-Werte, die einem JWT
 *    ähneln, unkenntlich gemacht.
 *
 * Diese Datei ist die einzige Stelle im Frontend-Code, in der
 * `console.*` direkt aufgerufen werden darf.
 */

import type { DashboardError } from "@/lib/errors";
import { isDashboardError } from "@/lib/errors";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  ts: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: { name: string; message: string; stack?: string; code?: string };
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const RING_MAX = 500;

const SECRET_KEY_RE = /(token|secret|password|passwd|authorization|bearer|api[_-]?key|credential|private[_-]?key)/i;
const JWT_RE = /^eyJ[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+$/;

function isDev(): boolean {
  try {
    // Vite injiziert import.meta.env
    return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string" && JWT_RE.test(value)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") {
    return redact(value as Record<string, unknown>);
  }
  return value;
}

export function redact(context: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!context) return context;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(context)) {
    if (SECRET_KEY_RE.test(k)) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = redactValue(v);
    }
  }
  return out;
}

function normalizeError(err: unknown): LogEntry["error"] | undefined {
  if (err === undefined || err === null) return undefined;
  if (isDashboardError(err)) {
    const de = err as DashboardError;
    return { name: de.name, message: de.message, stack: de.stack, code: de.code };
  }
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { name: "NonError", message: String(err) };
}

/* ------------------------------ Ringpuffer ------------------------------ */

const buffer: LogEntry[] = [];

function pushBuffer(entry: LogEntry): void {
  buffer.push(entry);
  if (buffer.length > RING_MAX) buffer.splice(0, buffer.length - RING_MAX);
}

/* ------------------------------ IDB-Sink -------------------------------- */

let idbSinkPromise: Promise<((entry: LogEntry) => void) | null> | null = null;

function getIdbSink(): Promise<((entry: LogEntry) => void) | null> {
  if (idbSinkPromise) return idbSinkPromise;
  idbSinkPromise = (async () => {
    if (typeof indexedDB === "undefined") return null;
    try {
      const mod = await import("./logger.indexeddb");
      return mod.createIndexedDbSink();
    } catch {
      return null;
    }
  })();
  return idbSinkPromise;
}

/* ------------------------------ Kern-API -------------------------------- */

function emit(level: LogLevel, message: string, error: unknown, ctx?: Record<string, unknown>): void {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    message,
    context: redact(ctx),
    error: normalizeError(error),
  };

  pushBuffer(entry);

  if (isDev()) {
    // Einzige erlaubte Console-Nutzung im Frontend.
    // eslint-disable-next-line no-console
    const fn = (console[level] ?? console.log).bind(console);
    if (entry.error) fn(`[${level}] ${message}`, entry.context ?? {}, entry.error);
    else fn(`[${level}] ${message}`, entry.context ?? {});
  } else {
    void getIdbSink().then((sink) => sink?.(entry));
  }
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    emit("debug", message, undefined, context);
  },
  info(message: string, context?: Record<string, unknown>): void {
    emit("info", message, undefined, context);
  },
  warn(message: string, context?: Record<string, unknown>): void {
    emit("warn", message, undefined, context);
  },
  error(message: string, error: unknown, context?: Record<string, unknown>): void {
    emit("error", message, error, context);
  },
  /**
   * DevTools-API: liefert eine Kopie der letzten Einträge.
   */
  getRecent(minLevel: LogLevel = "debug"): LogEntry[] {
    const cutoff = LEVEL_ORDER[minLevel];
    return buffer.filter((e) => LEVEL_ORDER[e.level] >= cutoff).slice();
  },
  /**
   * Leert den In-Memory-Puffer. IndexedDB bleibt unverändert (dort
   * greift die Retention im IDB-Adapter).
   */
  clear(): void {
    buffer.length = 0;
  },
};

export type Logger = typeof logger;

// DevTools-Hook, nur in DEV.
if (typeof window !== "undefined" && isDev()) {
  (window as unknown as { __dashboardLogger?: Logger }).__dashboardLogger = logger;
}
