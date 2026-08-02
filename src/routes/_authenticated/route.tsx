import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { trySupabase } from "@/integrations/supabase/safe-client";
import { loadAuthConfig } from "@/integrations/supabase/runtime-config";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { IdleWarningDialog } from "@/components/session/IdleWarningDialog";


/**
 * Auth-Gate für alle Routen unter `_authenticated/`.
 *
 * `ssr: false`, weil die Session ausschließlich im Browser-Storage lebt.
 * Fehler in `getUser()` (Netzwerk, Konfiguration) leiten kontrolliert nach
 * `/auth?reason=unavailable` — kein Endlos-Loop, keine leere Seite.
 * Serverseitige Autorisierung übernimmt zusätzlich `requireSupabaseAuth`
 * in jedem geschützten API-Handler.
 */

/**
 * Baut einen sicheren internen Redirect-Pfad aus `location`.
 *
 * WICHTIG: TanStack Router liefert `location.search` als **Objekt**
 * (parsed search params), nicht als String. Ein Template-Literal wie
 * `` `${path}${search}` `` würde daher `TypeError: Cannot convert object
 * to primitive value` werfen und den Auth-Guard vor dem Redirect abbrechen.
 * Wir serialisieren `search` deterministisch über `URLSearchParams`.
 *
 * Open-Redirect-Härtung: nur same-origin Pfad-Teile weiterreichen,
 * niemals `location.href` (absolute URL) oder Protocol-relative
 * Doppel-Slash-Werte wie `//evil.example`.
 */
function buildSafeInternalTarget(location: {
  pathname?: string;
  search?: unknown;
}): string {
  const path = typeof location.pathname === "string" && location.pathname.length > 0
    ? location.pathname
    : "/";

  let searchString = "";
  const raw = location.search;
  if (typeof raw === "string") {
    searchString = raw.startsWith("?") || raw.length === 0 ? raw : `?${raw}`;
  } else if (raw && typeof raw === "object") {
    try {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (v === undefined || v === null) continue;
        params.append(k, typeof v === "string" ? v : JSON.stringify(v));
      }
      const qs = params.toString();
      searchString = qs.length > 0 ? `?${qs}` : "";
    } catch {
      searchString = "";
    }
  }

  const combined = `${path}${searchString}`;
  if (
    !combined.startsWith("/") ||
    combined.startsWith("//") ||
    combined.startsWith("/\\")
  ) {
    return "/dashboard";
  }
  return combined;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const safeInternalTarget = buildSafeInternalTarget(location);

    // Runtime-Fallback für Auth-Config sicherstellen (siehe runtime-config.ts).
    await loadAuthConfig();
    const result = trySupabase();
    if (!result.ok) {
      throw redirect({ to: "/auth", search: { redirect: safeInternalTarget } });
    }
    try {
      const { data, error } = await result.client.auth.getUser();
      if (error || !data.user) {
        throw redirect({ to: "/auth", search: { redirect: safeInternalTarget } });
      }
      // Statusprüfung: nur `active` darf ins Dashboard. Fehler beim RPC
      // (Netzwerk, temporäre RLS-Regression) dürfen den authentifizierten
      // Zugriff NICHT als "nicht eingeloggt" behandeln — sonst kippt eine
      // reine Statusprüfung eine gültige Session in eine Login-Schleife.
      try {
        const { data: active, error: activeErr } = await result.client.rpc(
          "is_account_active",
          { _user_id: data.user.id },
        );
        if (!activeErr && active === false) {
          await result.client.auth.signOut().catch(() => undefined);
          throw redirect({
            to: "/auth",
            search: { redirect: "/dashboard", reason: "account_inactive" },
          });
        }
      } catch (statusErr) {
        if (isRedirect(statusErr)) throw statusErr;
        // RPC-Ausfall: Session bleibt gültig, Statusprüfung wird verschoben.
      }
      return { userId: data.user.id };
    } catch (e) {
      if (isRedirect(e)) throw e;
      throw redirect({ to: "/auth", search: { redirect: safeInternalTarget } });
    }
  },
  component: AuthenticatedLayout,
});

/**
 * Layout des geschützten Bereichs. Nur hier läuft die Inaktivitätsüberwachung —
 * öffentliche Routen (`/`, `/auth`, `/reset-password`) bleiben unberührt.
 */
function AuthenticatedLayout() {
  const idle = useIdleLogout(true);
  return (
    <>
      <Outlet />
      <IdleWarningDialog
        open={idle.warning}
        secondsRemaining={idle.secondsRemaining}
        onStay={idle.staySignedIn}
        onLogout={idle.logoutNow}
      />
    </>
  );
}


/** Test-Export: interne Redirect-Ziel-Bildung. Nicht in Produktcode nutzen. */
export const __test = { buildSafeInternalTarget };
