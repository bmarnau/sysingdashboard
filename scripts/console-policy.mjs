/**
 * Zentrale Konsolen-Richtlinie (Sprint 05B).
 *
 * Einzige Quelle für die Frage: "Darf an dieser Stelle `console.*` stehen?"
 * Wird von `scripts/check-no-console.mjs` (harter Gate) und vom Tech-Debt-
 * Detektor `scripts/tech-debt/detectors/console-usage.mjs` genutzt, damit
 * Gate und Bericht nie auseinanderlaufen.
 *
 * Regeln:
 *  - Logger-Interna dürfen `console.*` verwenden (sonst kein Sink möglich).
 *  - Tests, Build-/Wartungsskripte und lokale Werkzeuge sind kein Produktivcode.
 *  - Jede weitere Ausnahme braucht einen Eintrag in EXCEPTIONS mit Regel-ID,
 *    Begründung und Überprüfungsdatum. Keine pauschale Pfad-Whitelist.
 */

/** Logger-Implementierungen — hier ist `console.*` der Sink selbst. */
export const LOGGER_INTERNALS = [
  "src/lib/logger.ts",
  "src/lib/logger.indexeddb.ts",
  "src/lib/logger.indexeddb-reader.ts",
  "src/lib/error-capture.ts",
  "src/lib/error-page.ts",
  "backend/services/logger.mjs",
];

/** Kein Produktivcode: Tests, Skripte, E2E, Fixtures. */
export const NON_PRODUCTION_PATTERNS = [
  /^src\/__tests__\//,
  /^e2e\//,
  /^scripts\//,
  /^archive\//,
  /\.test\.(ts|tsx|mjs)$/,
  /\.spec\.(ts|tsx|mjs)$/,
];

/**
 * Begründete, dokumentierte Ausnahmen im Produktivcode.
 *
 * `generated: true` markiert von Lovable Cloud erzeugte Dateien, die nicht
 * bearbeitet werden dürfen — dort ist keine Umstellung möglich.
 */
export const EXCEPTIONS = [
  {
    id: "console-exc-worker-entry",
    files: ["src/server.ts", "src/start.ts"],
    generated: false,
    reason:
      "Worker-/SSR-Einstiegspunkt. Der Frontend-Logger schreibt in PROD nach IndexedDB; " +
      "im Cloudflare-Worker existiert kein IndexedDB, die Meldung ginge verloren. " +
      "Nur gekürzte Fehlermeldungen (<=256 Zeichen), keine Objekte, keine Secrets.",
    review: "2026-12-31",
    adr: "docs/LOGGING.md#ausnahmen",
  },
  {
    id: "console-exc-generated-supabase",
    files: [
      "src/integrations/supabase/client.ts",
      "src/integrations/supabase/client.server.ts",
      "src/integrations/supabase/auth-middleware.ts",
    ],
    generated: true,
    reason:
      "Auto-generierte Integrationsdateien (Lovable Cloud). Änderungen würden beim " +
      "nächsten Generierungslauf überschrieben. Ausgaben sind statische Konfig-Hinweise " +
      "ohne Werte.",
    review: "dauerhaft (solange generiert)",
    adr: "docs/LOGGING.md#ausnahmen",
  },
];

const norm = (p) => p.replace(/\\/g, "/").replace(/^\.\//, "");

export function isLoggerInternal(relPath) {
  return LOGGER_INTERNALS.includes(norm(relPath));
}

export function isNonProduction(relPath) {
  const p = norm(relPath);
  return NON_PRODUCTION_PATTERNS.some((re) => re.test(p));
}

/** Liefert die passende Ausnahme oder null. */
export function findException(relPath) {
  const p = norm(relPath);
  return EXCEPTIONS.find((e) => e.files.includes(p)) ?? null;
}

/**
 * Zentrale Entscheidung.
 * @returns {{allowed: boolean, kind: "logger-internal"|"non-production"|"exception"|"violation", exception?: object}}
 */
export function classify(relPath) {
  if (isLoggerInternal(relPath)) return { allowed: true, kind: "logger-internal" };
  if (isNonProduction(relPath)) return { allowed: true, kind: "non-production" };
  const exception = findException(relPath);
  if (exception) return { allowed: true, kind: "exception", exception };
  return { allowed: false, kind: "violation" };
}

/** Zeilen-Erkennung für echte Aufrufe (keine String-Literale). */
export const CONSOLE_LINE_RE = /^\s*(?:void\s+|await\s+)?console\.(log|debug|info|warn|error)\b/;
