import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * Öffentliche Landing-Seite.
 *
 * - Nicht angemeldet: kurzer Hinweis + „Anmelden"-CTA nach `/auth`.
 * - Angemeldet:      Weiterleitung auf `/dashboard`.
 *
 * Der Session-Check läuft ausschließlich clientseitig — SSR bleibt anonym,
 * damit die Seite crawl- und teilbar ist (SEO-fähig).
 */
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SysIng Dashboard – Anmeldung" },
      {
        name: "description",
        content:
          "SysIng Dashboard: Verwaltung von Projekten, Arbeitspaketen und Aktivitäten für IT-Systemingenieure.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session?.user) {
        navigate({ to: "/dashboard", replace: true });
      } else {
        setChecked(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          SysIng Dashboard
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Zentrale Verwaltung von Projekten, Arbeitspaketen und Aktivitäten für
          IT-Systemingenieure.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild disabled={!checked}>
            <Link to="/auth">Anmelden</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
