/**
 * Fassade um den generierten Supabase-Client.
 *
 * Der generierte Proxy in `client.ts` wirft synchron beim ersten Zugriff,
 * wenn ENV-Variablen fehlen. Diese Fassade fängt das ab und liefert einen
 * diskriminierten Union-Typ — damit stürzt keine Route mehr an einem
 * ungefangenen Modul-/Effect-Fehler ab.
 */

import { supabase } from "./client";
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
    // Der Proxy löst erst bei erstem Property-Zugriff auf; erzwinge das hier,
    // damit ein Fehler im catch landet statt in einer React-Boundary.
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
