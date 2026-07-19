import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { trySupabase } from "@/integrations/supabase/safe-client";

/**
 * Auth-Gate für alle Routen unter `_authenticated/`.
 *
 * `ssr: false`, weil die Session ausschließlich im Browser-Storage lebt.
 * Fehler in `getUser()` (Netzwerk, Konfiguration) leiten kontrolliert nach
 * `/auth?reason=unavailable` — kein Endlos-Loop, keine leere Seite.
 * Serverseitige Autorisierung übernimmt zusätzlich `requireSupabaseAuth`
 * in jedem geschützten API-Handler.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const result = trySupabase();
    if (!result.ok) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    try {
      const { data, error } = await result.client.auth.getUser();
      if (error || !data.user) {
        throw redirect({ to: "/auth", search: { redirect: location.href } });
      }
      return { userId: data.user.id };
    } catch (e) {
      // isRedirect-Muster: TanStack-Router wirft Redirect-Objekte; nicht schlucken.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (e && typeof e === "object" && (e as any).isRedirect) throw e;
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
  },
  component: () => <Outlet />,
});
