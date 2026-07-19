/**
 * Fassade um den generierten Supabase-Client.
 *
 * Der generierte Proxy in `client.ts` wirft synchron beim ersten Zugriff,
 * wenn ENV-Variablen fehlen. Diese Fassade fängt das ab und liefert einen
 * diskriminierten Union-Typ — damit stürzt keine Route mehr an einem
 * ungefangenen Modul-/Effect-Fehler ab.
 */

import { getAuthConfigurationStatus, type AuthConfiguration } from "./config";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export type TrySupabaseResult =
  | { ok: true; client: SupabaseClient<Database> }
  | { ok: false; config: AuthConfiguration };

let cached: TrySupabaseResult | undefined;

export function trySupabase(): TrySupabaseResult {
  if (cached) return cached;
  const config = getAuthConfigurationStatus();
  if (config.status !== "configured") {
    cached = { ok: false, config };
    return cached;
  }
  try {
    // Lazy require — falls der Proxy-Zugriff dennoch wirft (z. B. Runtime-
    // Sonderfall), landet er im catch statt in der React-Fehlerboundary.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { supabase } = require("./client") as {
      supabase: SupabaseClient<Database>;
    };
    // Trigger-Zugriff, damit der Proxy einmal auflöst:
    void supabase.auth;
    cached = { ok: true, client: supabase };
    return cached;
  } catch {
    cached = {
      ok: false,
      config: {
        status: "invalid",
        provider: "supabase",
        missingKeys: [],
        invalidReason: "Supabase client failed to initialize",
      },
    };
    return cached;
  }
}

/** Testhilfe: Cache zurücksetzen. */
export function __resetSupabaseCacheForTests(): void {
  cached = undefined;
}
