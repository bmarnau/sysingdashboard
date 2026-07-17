import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Auth-Gate für alle Routen unter `_authenticated/`.
 *
 * `ssr: false`, weil die Session ausschließlich im Browser-Storage lebt —
 * SSR hätte keinen Zugriff und würde Endlos-Redirects erzeugen.
 * Der Client-Guard prüft die Session via `getUser()` (revalidiert gegen
 * den Auth-Server) und leitet unangemeldete Nutzer nach `/auth` um.
 * Serverseitige Autorisierung übernimmt zusätzlich `requireSupabaseAuth`
 * in jedem geschützten API-Handler — dieser Client-Guard ist reines UX.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { userId: data.user.id };
  },
  component: () => <Outlet />,
});
