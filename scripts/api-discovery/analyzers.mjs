/**
 * Leichtgewichtige statische Analyse einer TanStack-Server-Route.
 *
 * Bewusst regex-basiert — kein voller AST. Die Angriffsfläche
 * (`src/routes/api/**`) ist klein und die Regeln sind deterministisch.
 * Wenn eine Route ein Muster verwendet, das hier nicht erkannt wird,
 * meldet die Discovery `null`/`false` — dann muss der Autor entweder
 * das Muster angleichen oder die Registry (`src/__tests__/api/registry/
 * endpoints.ts`) explizit anreichern.
 */

const METHOD_KEYS = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];

/** Extrahiert den Route-Pfad aus `createFileRoute("/api/xyz")`. */
export function analyzePath(source) {
  const m = source.match(/createFileRoute\(\s*["'`]([^"'`]+)["'`]\s*\)/);
  return m ? m[1] : null;
}

/** Erkennt registrierte HTTP-Methoden im `handlers`-Block. */
export function analyzeMethods(source) {
  const methods = new Set();
  // Erst den handlers-Block isolieren, damit wir keine Klassen-Konstanten
  // erwischen, die zufällig „GET" heißen.
  const handlersMatch = source.match(/handlers\s*:\s*\{([\s\S]*?)\n\s{4,}\}/);
  const scope = handlersMatch ? handlersMatch[1] : source;
  for (const key of METHOD_KEYS) {
    const re = new RegExp(`(^|[\\s,{])${key}\\s*:`, "m");
    if (re.test(scope)) methods.add(key);
  }
  return [...methods];
}

/** Erkennt `z.object(...)`, `z.array(...)` etc. als Request-Validierung. */
export function analyzeValidation(source) {
  return /z\.(object|array|union|record|discriminatedUnion)\s*\(/.test(source);
}

/** Erkennt Correlation-ID-Wrapper. */
export function analyzeCorrelation(source) {
  return /withCorrelation\s*\(/.test(source);
}

/**
 * Erkennt Auth-Guards. Aktuell akzeptierte Muster:
 *  - `checkAuth(`             — projektinterne Konvention
 *  - `requireSupabaseAuth`    — Middleware-Referenz
 *  - `X-Sync-Token` / `x-sync-token` als Header-Prüfung
 *  - `isProd()` + Header-Read (defensiver Fallback)
 */
export function analyzeAuthGuard(source) {
  const patterns = [
    /checkAuth\s*\(/,
    /requireSupabaseAuth/,
    /x-sync-token|X-Sync-Token|SYNC_TRIGGER_TOKEN/,
    /request\.headers\.get\(\s*["'`]authorization["'`]\s*\)/i,
  ];
  return patterns.some((re) => re.test(source));
}

/** Erkennt Referenzen auf Permission-Konstanten (`permission: "..."`). */
export function analyzePermission(source) {
  const m = source.match(/permission\s*:\s*["'`]([^"'`]+)["'`]/);
  return m ? m[1] : null;
}

/** Erkennt Nutzung des zentralen Loggers. */
export function analyzeLogging(source) {
  return /from\s+["'`][^"'`]*backend\/services\/logger\.mjs["'`]/.test(source);
}

/** Erkennt Imports, die auf `archive/**` zeigen — kritisches Finding. */
export function analyzeArchivedImports(source) {
  const imports = [...source.matchAll(/from\s+["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
  return imports.filter((p) => p.includes("/archive/") || p.startsWith("archive/"));
}

/**
 * Heuristische Klassifizierung. Kann später durch expliziten
 * `endpointMeta`-Export ersetzt werden.
 */
export function classify({ path, methods, authRequired, permission }) {
  if (permission) return "privileged";
  if (authRequired) return "authenticated";
  // /api/public/* ist per Konvention öffentlich (Webhooks/Cron).
  if (path.startsWith("/api/public/")) return "public";
  // Alles andere unter /api/ ohne Auth: gilt als „unclassified" — muss
  // vom Betreiber explizit klassifiziert werden.
  return "unclassified";
}

/** Destruktive Wirkung anhand Methode + Namenskonvention. */
export function analyzeDestructiveImpact(path, methods) {
  if (methods.includes("DELETE")) return "delete";
  if (/\/(migrate|migration|reset|drop)/i.test(path)) return "migration";
  if (methods.some((m) => ["POST", "PUT", "PATCH"].includes(m))) return "write";
  if (methods.includes("GET")) return "read";
  return "none";
}
