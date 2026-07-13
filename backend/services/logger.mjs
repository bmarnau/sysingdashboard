/**
 * Backend-Logger (ESM).
 *
 * Kleines Console-Only-Pendant zu `src/lib/logger.ts`. Läuft in Node
 * (backend/server.mjs) und in TanStack-Server-Routes; kennt keinen
 * IndexedDB-Sink und kein DevTools-Registrieren.
 *
 * v1.32.0: Reichert jeden Eintrag additiv um `correlationId`, `route`,
 * `method` und `durationMs` an, sofern ein Request-Kontext aktiv ist
 * (`getCurrentCorrelationContext()` aus `correlation-context.server.ts`).
 * Ist kein Kontext aktiv (z. B. Boot-Log), werden die Felder weggelassen —
 * keine zweite Logger-Implementierung.
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

/**
 * Correlation-Kontext lesen — die Server-Route setzt eine
 * `AsyncLocalStorage`-Instanz auf `globalThis.__dashboardCorrelationStore__`
 * (siehe `src/lib/correlation-context.server.ts`). Wir greifen ohne
 * TS-Import direkt darauf zu, damit dieses `.mjs`-Modul sowohl unter
 * Node (backend/server.mjs) als auch im TSS-Bundle funktioniert.
 * Ist kein Store aktiv, liefern wir `undefined` und der Logger
 * schreibt einfach ohne Correlation-Felder.
 */
function readContextSync() {
  const store = globalThis.__dashboardCorrelationStore__;
  if (!store || typeof store.getStore !== "function") return undefined;
  try {
    return store.getStore();
  } catch {
    return undefined;
  }
}

function emit(level, message, error, ctx) {
  const cor = readContextSync();
  const enriched = {
    ...(cor
      ? {
          correlationId: cor.correlationId,
          route: cor.route,
          method: cor.method,
          durationMs: Date.now() - cor.startedAt,
        }
      : {}),
    ...(ctx ?? {}),
  };
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    context: redact(Object.keys(enriched).length ? enriched : undefined),
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
