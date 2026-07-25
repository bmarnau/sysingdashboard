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
  if (cached && cached.ok) return cached;
  const config = getAuthConfigurationStatus();
  if (config.status !== "configured") {
    // Fehlerpfad NICHT cachen — der Runtime-Fallback (siehe runtime-config.ts)
    // kann die Config noch nachliefern; ein späterer Aufruf muss erneut prüfen.
    return { ok: false, config };
  }
  try {
    // Der Proxy löst erst bei erstem Property-Zugriff auf; erzwinge das hier,
    // damit ein Fehler im catch landet statt in einer React-Boundary.
    void supabase.auth;
    cached = { ok: true, client: supabase };
    return cached;
  } catch {
    return {
      ok: false,
      config: {
        status: "invalid",
        provider: "supabase",
        missingKeys: [],
        invalidReason: "Supabase client failed to initialize",
      },
    };
  }
}

/** Testhilfe: Cache zurücksetzen. */
export function __resetSupabaseCacheForTests(): void {
  cached = undefined;
}
