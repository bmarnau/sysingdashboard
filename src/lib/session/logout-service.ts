/**
 * Zentraler Logout — einziger Abmeldepfad der Anwendung.
 *
 * Wird sowohl von der manuellen Abmeldung (Servicemenü) als auch von der
 * automatischen Abmeldung bei Inaktivität genutzt. Der Supabase-Bezug ist
 * hier gekapselt (Adapter); Inaktivitätslogik und UI kennen ihn nicht.
 *
 * Reihenfolge (bewusst): Mehrfachaufruf-Guard → lokale Bereinigung →
 * `signOut()` → Auth-Storage-Reste entfernen → Navigation nach `/auth`.
 * Ein Fehler beim serverseitigen `signOut()` verhindert die lokale
 * Bereinigung und den Redirect NICHT.
 */

import { logger } from "@/lib/logger";
import { trySupabase } from "@/integrations/supabase/safe-client";
import { clearLastActivity } from "@/lib/session/idle-channel";

export type LogoutReason = "manual" | "idle_timeout" | "account_inactive";

export interface LogoutOptions {
  reason: LogoutReason;
  /** Router-Navigation; fällt ohne Angabe auf `window.location` zurück. */
  navigate?: (target: string) => void;
}

let logoutInFlight = false;

/** Testhilfe: Guard zurücksetzen. */
export function __resetLogoutGuardForTests(): void {
  logoutInFlight = false;
}

function clearLocalSessionState(): void {
  clearLastActivity();
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      // Supabase-Auth-Reste (`sb-<project>-auth-token`) entfernen.
      if (key.startsWith("sb-") && key.includes("auth-token")) keys.push(key);
    }
    for (const key of keys) window.localStorage.removeItem(key);
    window.sessionStorage.clear();
  } catch {
    /* Storage deaktiviert */
  }
}

/**
 * Meldet den Benutzer vollständig ab. Idempotent innerhalb eines Laufs.
 * @returns true, wenn dieser Aufruf die Abmeldung ausgeführt hat.
 */
export async function performLogout(options: LogoutOptions): Promise<boolean> {
  if (logoutInFlight) return false;
  logoutInFlight = true;

  const target =
    options.reason === "manual" ? "/auth" : `/auth?reason=${encodeURIComponent(options.reason)}`;

  try {
    clearLocalSessionState();

    try {
      const result = trySupabase();
      if (result.ok) await result.client.auth.signOut();
    } catch (err) {
      // Netzwerk-/Backendfehler dürfen die lokale Abmeldung nicht blockieren.
      logger.error("Abmeldung am Backend fehlgeschlagen — lokal dennoch abgemeldet", err, {
        operation: "auth.logout",
        reason: options.reason,
      });
    }

    // Nach signOut erneut bereinigen (der Client schreibt beim Abmelden).
    clearLocalSessionState();

    logger.info("Benutzer abgemeldet", { operation: "auth.logout", reason: options.reason });

    if (options.navigate) {
      options.navigate(target);
    } else if (typeof window !== "undefined") {
      window.location.replace(target);
    }
    return true;
  } finally {
    // Guard erst nach kurzer Zeit lösen — verhindert Doppel-Logout aus
    // parallelen Tabs/Events, blockiert aber keine spätere Sitzung.
    setTimeout(() => {
      logoutInFlight = false;
    }, 2000);
  }
}
