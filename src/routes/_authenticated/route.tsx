import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { trySupabase } from "@/integrations/supabase/safe-client";
import { loadAuthConfig } from "@/integrations/supabase/runtime-config";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { IdleWarningDialog } from "@/components/session/IdleWarningDialog";
import { resolveKioskSessionPolicy } from "@/lib/kiosk/kiosk-session-policy";

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
function buildSafeInternalTarget(location: { pathname?: string; search?: unknown }): string {
  const path =
    typeof location.pathname === "string" && location.pathname.length > 0 ? location.pathname : "/";

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
  if (!combined.startsWith("/") || combined.startsWith("//") || combined.startsWith("/\\")) {
    return "/dashboard";
  }
  return combined;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const safeInternalTarget = buildSafeInternalTarget(location);

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

      try {
        const { data: active, error: activeErr } = await result.client.rpc("is_account_active", {
          _user_id: data.user.id,
        });
        if (!activeErr && active === false) {
          await result.client.auth.signOut().catch(() => undefined);
          throw redirect({
            to: "/auth",
            search: { redirect: "/dashboard", reason: "account_inactive" },
          });
        }
      } catch (statusErr) {
        if (isRedirect(statusErr)) throw statusErr;
      }

      const { data: hasKioskView, error: kioskPermissionError } = await result.client.rpc(
        "has_permission",
        {
          _user_id: data.user.id,
          _perm: "kiosk.view",
        },
      );
      if (kioskPermissionError) {
        throw redirect({
          to: "/auth",
          search: { redirect: safeInternalTarget, reason: "unavailable" },
        });
      }

      const kioskSessionPolicy = resolveKioskSessionPolicy({
        pathname: location.pathname,
        hasKioskView: hasKioskView === true,
      });
      if (kioskSessionPolicy.redirectTo) {
        throw redirect({ href: kioskSessionPolicy.redirectTo });
      }

      return { userId: data.user.id, kioskSessionPolicy };
    } catch (e) {
      if (isRedirect(e)) throw e;
      throw redirect({ to: "/auth", search: { redirect: safeInternalTarget } });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { kioskSessionPolicy } = Route.useRouteContext();
  const idle = useIdleLogout(kioskSessionPolicy.idleLogoutEnabled);
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

export const __test = { buildSafeInternalTarget };
