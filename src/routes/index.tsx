import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { trySupabase } from "@/integrations/supabase/safe-client";
import type { AuthConfiguration } from "@/integrations/supabase/config";
import { Button } from "@/components/ui/button";

/**
 * Öffentliche Landing-Seite.
 *
 * Robuste Zustandsmaschine, damit ein Auth-Konfigurations- oder
 * Verbindungsfehler NIE einen leeren Bildschirm hinterlässt und der
 * Anmelde-Button nicht dauerhaft deaktiviert bleibt.
 */
type LandingState =
  | { kind: "checking" }
  | { kind: "authenticated" }
  | { kind: "anonymous" }
  | { kind: "config-error"; config: AuthConfiguration }
  | { kind: "connection-error" };

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
  const [state, setState] = useState<LandingState>({ kind: "checking" });

  const check = useCallback(() => {
    setState({ kind: "checking" });
    const result = trySupabase();
    if (!result.ok) {
      setState({ kind: "config-error", config: result.config });
      return;
    }
    result.client.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          setState({ kind: "connection-error" });
          return;
        }
        if (data.session?.user) {
          setState({ kind: "authenticated" });
          navigate({ to: "/dashboard", replace: true }).catch(() => {
            // Navigation-Fehler dürfen den Zustand nicht kippen.
          });
        } else {
          setState({ kind: "anonymous" });
        }
      })
      .catch(() => {
        setState({ kind: "connection-error" });
      });
  }, [navigate]);

  useEffect(() => {
    check();
  }, [check]);

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

        {state.kind === "config-error" && (
          <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            <p className="font-medium">Die Anmeldung ist noch nicht konfiguriert.</p>
            <p className="mt-1 text-xs opacity-80">
              Bitte den Administrator kontaktieren. Ohne gültige Auth-Konfiguration ist keine
              Anmeldung möglich.
            </p>
            {import.meta.env.DEV && (
              <p className="mt-2 text-xs opacity-70">
                Detail (nur DEV): {state.config.status}
                {state.config.missingKeys.length > 0
                  ? ` – fehlt: ${state.config.missingKeys.join(", ")}`
                  : ""}
                {state.config.invalidReason ? ` – ${state.config.invalidReason}` : ""}
              </p>
            )}
          </div>
        )}

        {state.kind === "connection-error" && (
          <div className="mt-6 rounded-md border border-warning/40 bg-warning/5 p-4 text-sm">
            <p className="font-medium">Anmeldedienst ist gerade nicht erreichbar.</p>
            <p className="mt-1 text-xs opacity-80">
              Du kannst es erneut versuchen oder direkt zur Anmeldeseite wechseln.
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={check}>
                Erneut versuchen
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Button asChild disabled={state.kind === "config-error"}>
            <Link to="/auth">
              {state.kind === "checking" ? "Anmelden…" : "Anmelden"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
