/**
 * Ausschluss-Regeln für die API-Discovery.
 *
 * Verzeichnisse hier werden vollständig ignoriert. Wenn eine aktive
 * Produktionsdatei per Import auf einen dieser Pfade zeigt, erzeugt
 * das Discovery-Framework ein Finding (Kategorie
 * `active-to-archived-import`).
 */
export const EXCLUDED_DIRS = [
  "archive/",
  "node_modules/",
  ".git/",
  "test-report/",
  "coverage/",
  "playwright-report/",
];

export const EXCLUDED_FILE_PATTERNS = [
  /\.test\.tsx?$/,
  /\.spec\.tsx?$/,
  /\/__tests__\//,
  /\.d\.mts$/,
  /\.d\.ts$/,
];

/**
 * Filter-Hilfe für relative Pfade (POSIX-Slashes).
 */
export function isExcluded(relPath) {
  const p = relPath.replaceAll("\\", "/");
  if (EXCLUDED_DIRS.some((d) => p.startsWith(d) || p.includes(`/${d}`))) return true;
  return EXCLUDED_FILE_PATTERNS.some((re) => re.test(p));
}

/** Für den Report: welche Verzeichnisse wurden ausgelassen und warum. */
export const EXCLUSION_REASONS = [
  {
    path: "archive/legacy-standalone-backend/routes/",
    reason: "Archiviertes Standalone-Backend (v1.27.2). Nicht Teil des aktiven Builds.",
    status: "archived",
  },
  {
    path: "**/*.test.ts, **/__tests__/**",
    reason: "Testdateien sind keine produktiven Endpoints.",
    status: "test-only",
  },
];
