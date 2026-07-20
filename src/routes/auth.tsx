import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { trySupabase } from "@/integrations/supabase/safe-client";
import type { AuthConfiguration } from "@/integrations/supabase/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

/**
 * Anmeldung / Registrierung / Passwort-Reset.
 *
 * Alle Auth-Aufrufe sind gegen Reject-, Netzwerk- und Konfigurationsfehler
 * abgesichert. Bei fehlender/ungültiger Konfiguration werden die Formulare
 * gesperrt und ein nicht-technischer Hinweis angezeigt.
 */
const SearchSchema = z.object({
  redirect: z.string().optional(),
  reason: z
    .enum(["unavailable", "account_inactive", "account_locked", "account_archived"])
    .optional(),
});

function safeRedirect(target: string | undefined): string {
  if (!target) return "/dashboard";
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) {
    return "/dashboard";
  }
  return target;
}

const REASON_MESSAGES: Record<string, string> = {
  account_inactive: "Dieses Konto ist derzeit nicht aktiv. Bitte einen Administrator kontaktieren.",
  account_locked: "Konto ist gesperrt. Bitte einen Administrator kontaktieren.",
  account_archived: "Konto wurde archiviert. Zugriff ist nicht möglich.",
  unavailable: "Anmeldedienst war kurzzeitig nicht erreichbar. Bitte erneut versuchen.",
};

export const Route = createFileRoute("/auth")({
  validateSearch: SearchSchema,
  head: () => ({ meta: [{ title: "Anmelden – SysIng Dashboard" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const redirectTo = safeRedirect(search.redirect);
  const [busy, setBusy] = useState(false);
  const [configError, setConfigError] = useState<AuthConfiguration | null>(null);

  useEffect(() => {
    const result = trySupabase();
    if (!result.ok) {
      setConfigError(result.config);
      return;
    }
    const supabase = result.client;
    let unsub: (() => void) | undefined;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) navigate({ to: redirectTo, replace: true }).catch(() => undefined);
      })
      .catch(() => {
        toast.error("Sitzungsprüfung fehlgeschlagen. Bitte erneut versuchen.");
      });
    try {
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session)
          navigate({ to: redirectTo, replace: true }).catch(() => undefined);
      });
      unsub = () => sub.subscription.unsubscribe();
    } catch {
      // onAuthStateChange darf niemals die Seite blockieren.
    }
    return () => unsub?.();
  }, [navigate, redirectTo]);

  function assertReady() {
    const result = trySupabase();
    if (!result.ok) {
      setConfigError(result.config);
      return null;
    }
    return result.client;
  }

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = assertReady();
    if (!supabase) return;
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message || "Anmeldung fehlgeschlagen");
    } catch {
      toast.error("Anmeldung fehlgeschlagen. Bitte später erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }

  async function onSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = assertReady();
    if (!supabase) return;
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const firstName = String(fd.get("firstName") ?? "").trim();
    const lastName = String(fd.get("lastName") ?? "").trim();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            first_name: firstName,
            last_name: lastName,
            display_name: `${firstName} ${lastName}`.trim(),
          },
        },
      });
      if (error) {
        toast.error(error.message || "Registrierung fehlgeschlagen");
      } else if (data.user && (data.user.identities?.length ?? 0) === 0) {
        toast.info("Ein Konto mit dieser E-Mail existiert bereits. Bitte anmelden oder Passwort zurücksetzen.");
      } else if (data.session) {
        toast.success("Registrierung erfolgreich. Du bist angemeldet.");
      } else {
        toast.success("Registrierung erfolgreich. Bitte E-Mail-Bestätigungslink öffnen, dann anmelden.");
      }
    } catch {
      toast.error("Registrierung fehlgeschlagen. Bitte später erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }

  async function onReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = assertReady();
    if (!supabase) return;
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) toast.error(error.message);
      else toast.success("E-Mail zum Zurücksetzen wurde gesendet.");
    } catch {
      toast.error("Zurücksetzen fehlgeschlagen. Bitte später erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }

  const formsDisabled = busy || configError !== null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>SysIng Dashboard</CardTitle>
          <CardDescription>Anmelden oder neuen Zugang anlegen</CardDescription>
        </CardHeader>
        <CardContent>
          {configError && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
            >
              <p className="font-medium">Die Anmeldung ist noch nicht konfiguriert.</p>
              <p className="mt-1 text-xs opacity-80">
                Bitte den Administrator kontaktieren.
              </p>
              {import.meta.env.DEV && (
                <p className="mt-2 text-xs opacity-70">
                  Detail (nur DEV): {configError.status}
                  {configError.missingKeys.length > 0
                    ? ` – fehlt: ${configError.missingKeys.join(", ")}`
                    : ""}
                  {configError.invalidReason ? ` – ${configError.invalidReason}` : ""}
                </p>
              )}
            </div>
          )}
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Anmelden</TabsTrigger>
              <TabsTrigger value="signup">Registrieren</TabsTrigger>
              <TabsTrigger value="reset">Reset</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form className="space-y-3" onSubmit={onLogin}>
                <div>
                  <Label htmlFor="li-email">E-Mail</Label>
                  <Input id="li-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="li-pw">Passwort</Label>
                  <Input
                    id="li-pw"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button className="w-full" type="submit" disabled={formsDisabled}>
                  Anmelden
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form className="space-y-3" onSubmit={onSignup}>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="su-fn">Vorname</Label>
                    <Input id="su-fn" name="firstName" required />
                  </div>
                  <div>
                    <Label htmlFor="su-ln">Nachname</Label>
                    <Input id="su-ln" name="lastName" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="su-email">E-Mail</Label>
                  <Input id="su-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="su-pw">Passwort (min. 8 Zeichen)</Label>
                  <Input
                    id="su-pw"
                    name="password"
                    type="password"
                    minLength={8}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Erste Registrierung wird automatisch System-Administrator; alle weiteren starten
                  als Viewer und müssen hochgestuft werden.
                </p>
                <Button className="w-full" type="submit" disabled={formsDisabled}>
                  Registrieren
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="reset">
              <form className="space-y-3" onSubmit={onReset}>
                <div>
                  <Label htmlFor="rs-email">E-Mail</Label>
                  <Input id="rs-email" name="email" type="email" required />
                </div>
                <Button className="w-full" type="submit" disabled={formsDisabled}>
                  Passwort zurücksetzen
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          <div className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/">Zurück zur Startseite</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
