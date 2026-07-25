/**
 * Runtime-Bootstrap für die Supabase-Client-Konfiguration.
 *
 * Kontext: Im Publish-Build kann es passieren, dass die drei
 * `VITE_SUPABASE_*`-Variablen im Build-Runner NICHT gesetzt waren.
 * Vite ersetzt `import.meta.env.VITE_*` dann zur Build-Zeit mit
 * `undefined` — der Client wäre chronisch "nicht konfiguriert",
 * selbst wenn Lovable Cloud verbunden ist.
 *
 * Dieses Modul liefert einen Runtime-Fallback:
 *   1. Bevorzugt die zur Build-Zeit inlined VITE_-Werte.
 *   2. Fällt sonst auf `GET /api/public/auth-config` zurück (der
 *      serverseitig aus `process.env.SUPABASE_URL` /
 *      `SUPABASE_PUBLISHABLE_KEY` speist — die auf Lovable Cloud
 *      immer injiziert sind).
 *
 * Kein Werf-Verhalten, keine Logs mit Werten, keine Secrets.
 */

export interface LoadedAuthConfig {
  url: string;
  publishableKey: string;
  /** "vite" = zur Build-Zeit inlined, "runtime" = per Endpoint nachgeladen. */
  source: "vite" | "runtime";
}

// Statischer Zugriff — Vite ersetzt diese Ausdrücke bei jedem Build.
const VITE_URL: string | undefined =
  typeof import.meta.env.VITE_SUPABASE_URL === "string" &&
  import.meta.env.VITE_SUPABASE_URL.length > 0
    ? import.meta.env.VITE_SUPABASE_URL
    : undefined;

const VITE_KEY: string | undefined =
  typeof import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY === "string" &&
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY.length > 0
    ? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    : undefined;

let cached: LoadedAuthConfig | null = null;
let inflight: Promise<LoadedAuthConfig | null> | null = null;

function readProcessEnv(name: string): string | undefined {
  try {
    if (typeof process === "undefined" || !process.env) return undefined;
    const v = process.env[name];
    return typeof v === "string" && v.length > 0 ? v : undefined;
  } catch {
    return undefined;
  }
}

function trySync(): LoadedAuthConfig | null {
  if (cached) return cached;
  const url = VITE_URL ?? readProcessEnv("SUPABASE_URL");
  const key = VITE_KEY ?? readProcessEnv("SUPABASE_PUBLISHABLE_KEY");
  if (url && key && !key.startsWith("sb_secret_")) {
    cached = { url, publishableKey: key, source: "vite" };
    exposeToWindow(cached);
    return cached;
  }
  return null;
}

function exposeToWindow(config: LoadedAuthConfig): void {
  if (typeof window === "undefined") return;
  try {
    (window as unknown as { __sysing_auth_config?: LoadedAuthConfig }).__sysing_auth_config =
      config;
  } catch {
    // Fensterzugriff optional; Fehler ignorieren.
  }
}

function fromWindow(): LoadedAuthConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const w = window as unknown as { __sysing_auth_config?: LoadedAuthConfig };
    return w.__sysing_auth_config ?? null;
  } catch {
    return null;
  }
}

/** Synchroner Snapshot der bereits geladenen Config (oder null). */
export function getLoadedAuthConfig(): LoadedAuthConfig | null {
  if (cached) return cached;
  const sync = trySync();
  if (sync) return sync;
  const w = fromWindow();
  if (w) {
    cached = w;
    return cached;
  }
  return null;
}

/**
 * Lädt die Auth-Config asynchron. Idempotent: mehrfache Aufrufe
 * teilen sich denselben In-Flight-Fetch. Wirft nie.
 */
export async function loadAuthConfig(): Promise<LoadedAuthConfig | null> {
  const sync = trySync();
  if (sync) return sync;

  if (inflight) return inflight;

  inflight = (async () => {
    if (typeof fetch === "undefined") return null;
    try {
      const res = await fetch("/api/public/auth-config", {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
      if (!res.ok) return null;
      const body = (await res.json()) as {
        status?: string;
        url?: string;
        publishableKey?: string;
      };
      if (
        body.status !== "configured" ||
        typeof body.url !== "string" ||
        typeof body.publishableKey !== "string" ||
        body.publishableKey.startsWith("sb_secret_")
      ) {
        return null;
      }
      cached = {
        url: body.url,
        publishableKey: body.publishableKey,
        source: "runtime",
      };
      exposeToWindow(cached);
      return cached;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** Testhilfe: Cache zurücksetzen. */
export function __resetRuntimeConfigForTests(): void {
  cached = null;
  inflight = null;
  if (typeof window !== "undefined") {
    try {
      delete (window as unknown as { __sysing_auth_config?: LoadedAuthConfig })
        .__sysing_auth_config;
    } catch {
      // ignore
    }
  }
}
