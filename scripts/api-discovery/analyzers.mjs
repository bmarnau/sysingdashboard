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
 *  - `Authorization: Bearer ...` aus dem Request
 *  - `client.auth.getUser()` plus serverseitiger Permission-RPC
 */
export function analyzeAuthGuard(source) {
  const patterns = [
    /checkAuth\s*\(/,
    /requireSupabaseAuth/,
    /request\.headers\.get\(\s*["'`]authorization["'`]\s*\)/i,
    /\.auth\.getUser\s*\(/,
    /\.rpc\(\s*["'`]has_permission["'`]/,
  ];
  return patterns.some((re) => re.test(source));
}

/** Erkennt Referenzen auf Permission-Konstanten (`permission: "..."`). */
export function analyzePermission(source) {
  const meta = analyzeEndpointMeta(source);
  if (meta?.permission) return meta.permission;
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
 * Extrahiert einen optionalen `endpointMeta`-Export aus dem Route-Quelltext.
 * Bewusst tolerant, keine verschachtelten Objekte, kein AST.
 *
 * Erkannte Felder: `public`, `authRequired`, `permission`, `classification`,
 * `reason`. Alles andere wird ignoriert.
 *
 * Rückgabe: `null` wenn kein Export gefunden, sonst partial-Meta.
 */
export function analyzeEndpointMeta(source) {
  const block = source.match(
    /export\s+const\s+endpointMeta\s*=\s*\{([\s\S]*?)\}\s*(?:as\s+const)?\s*;?/,
  );
  if (!block) return null;
  const body = block[1];
  const bool = (name) => {
    const m = body.match(new RegExp(`\\b${name}\\s*:\\s*(true|false)\\b`));
    return m ? m[1] === "true" : null;
  };
  const str = (name) => {
    const m = body.match(new RegExp(`\\b${name}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`));
    return m ? m[1] : null;
  };
  return {
    public: bool("public"),
    authRequired: bool("authRequired"),
    permission: str("permission"),
    classification: str("classification"),
    reason: str("reason"),
  };
}

/**
 * Heuristische Klassifizierung.
 *
 * Vorrang-Reihenfolge:
 *   1. `meta.classification` (explizit gesetzt)
 *   2. `meta.public === true`
 *   3. `permission`  → privileged
 *   4. `authRequired` → authenticated
 *   5. `/api/public/*`-Prefix → public
 *   6. sonst → unclassified
 */
export function classify({ path, methods: _methods, authRequired, permission, meta }) {
  if (meta?.classification) return meta.classification;
  if (meta?.public === true) return "public";
  if (permission) return "privileged";
  if (authRequired) return "authenticated";
  if (path.startsWith("/api/public/")) return "public";
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
