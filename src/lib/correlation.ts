/**
 * Correlation-ID — zentrale Utilities (Prompt 2A.4B).
 *
 * Format: UUID v4 (klein geschrieben). Alternativ akzeptiert die
 * Validierung 8–64 Zeichen aus `[A-Za-z0-9._-]` — damit dürfen
 * vertrauenswürdige Upstream-Systeme (z. B. spätere Azure-Kette)
 * eigene Trace-IDs mitgeben, ohne dass wir sie umschreiben. Alles was
 * dem Muster nicht entspricht, wird verworfen und durch eine frische ID
 * ersetzt.
 *
 * Bewusst NICHT enthalten:
 *  - Benutzer- oder Tenant-IDs
 *  - Zeitstempel mit fachlicher Bedeutung
 *  - Secrets, Tokens, Session-Bezüge
 */

export const CORRELATION_HEADER = "X-Correlation-Id";
export const CORRELATION_MAX_LEN = 64;
export const CORRELATION_MIN_LEN = 8;

// UUID v4: hex-x-hex-4xxx-[89ab]xxx-hex
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
// Erweitertes Format für Upstream-IDs — nur "harmlose" URL-safe Zeichen.
const RELAXED_RE = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * Erzeugt eine neue Correlation-ID. Nutzt `crypto.randomUUID()`, das in
 * Node ≥ 20, Cloudflare Workers und modernen Browsern verfügbar ist.
 * Fallback (nur für alte Test-Runner) erzeugt eine gleichwertig starke
 * UUID v4 aus `crypto.getRandomValues`.
 */
export function generateCorrelationId(): string {
  const c: Crypto | undefined =
    typeof globalThis !== "undefined"
      ? (globalThis as { crypto?: Crypto }).crypto
      : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * True, wenn `value` das UUID-v4-Format ODER das erweiterte Upstream-
 * Format erfüllt und keine offensichtlich unsicheren Zeichen enthält.
 */
export function isValidCorrelationId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value.length < CORRELATION_MIN_LEN || value.length > CORRELATION_MAX_LEN) return false;
  return UUID_V4_RE.test(value) || RELAXED_RE.test(value);
}

/**
 * Nimmt einen möglichen eingehenden Header-Wert, validiert und
 * normalisiert. Fallback: neue ID. Nie den Client-Wert ungeprüft
 * übernehmen.
 */
export function acceptOrGenerateCorrelationId(headerValue: string | null | undefined): string {
  if (isValidCorrelationId(headerValue)) return headerValue;
  return generateCorrelationId();
}
