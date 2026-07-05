/**
 * Backend-Logger (ESM).
 *
 * Kleines Console-Only-Pendant zu `src/lib/logger.ts`. Läuft in Node
 * (backend/server.mjs) und in TanStack-Server-Routes; kennt keinen
 * IndexedDB-Sink und kein DevTools-Registrieren.
 *
 * Die einzige erlaubte Stelle im Backend, an der `console.*` direkt
 * verwendet wird — alle anderen `.mjs`-Services rufen `logger.*`.
 */

const SECRET_KEY_RE =
  /(token|secret|password|passwd|authorization|bearer|api[_-]?key|credential|private[_-]?key)/i;
const JWT_RE = /^eyJ[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+$/;

function redactValue(value) {
  if (typeof value === "string" && JWT_RE.test(value)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") return redact(value);
  return value;
}

export function redact(context) {
  if (!context) return context;
  const out = {};
  for (const [k, v] of Object.entries(context)) {
    out[k] = SECRET_KEY_RE.test(k) ? "[REDACTED]" : redactValue(v);
  }
  return out;
}

function normalizeError(err) {
  if (err == null) return undefined;
  if (err instanceof Error) {
    const base = { name: err.name, message: err.message, stack: err.stack };
    if (typeof err.code === "string") base.code = err.code;
    return base;
  }
  return { name: "NonError", message: String(err) };
}

function emit(level, message, error, ctx) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    context: redact(ctx),
    error: normalizeError(error),
  };
  // eslint-disable-next-line no-console
  const fn = (console[level] ?? console.log).bind(console);
  if (entry.error) fn(`[${level}] ${message}`, entry.context ?? {}, entry.error);
  else fn(`[${level}] ${message}`, entry.context ?? {});
}

export const logger = {
  debug: (m, c) => emit("debug", m, undefined, c),
  info: (m, c) => emit("info", m, undefined, c),
  warn: (m, c) => emit("warn", m, undefined, c),
  error: (m, err, c) => emit("error", m, err, c),
};
