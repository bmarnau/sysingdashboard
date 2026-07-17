import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

/**
 * Anmeldung / Registrierung / Passwort-Reset.
 *
 * - Kein Auto-Login nach Registrierung, damit Lovable-Cloud-E-Mail-Bestätigung
 *   (falls aktiviert) greift.
 * - `redirect`-Search-Param wird nach erfolgreichem Login angesteuert; wird
 *   gegen relative Same-Origin-Pfade validiert, um Open-Redirect zu vermeiden.
 * - Erste Registrierung wird per DB-Trigger automatisch `systemadministrator`.
 */
const SearchSchema = z.object({ redirect: z.string().optional() });

function safeRedirect(target: string | undefined): string {
  if (!target) return "/dashboard";
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) {
    return "/dashboard";
  }
  return target;
}

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

  // Wenn bereits eine Session existiert, direkt weiterleiten.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirectTo, replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: redirectTo, replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, redirectTo]);

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message || "Anmeldung fehlgeschlagen");
      return;
    }
    // onAuthStateChange übernimmt die Navigation
  }

  async function onSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const firstName = String(fd.get("firstName") ?? "").trim();
    const lastName = String(fd.get("lastName") ?? "").trim();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
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
    setBusy(false);
    if (error) {
      toast.error(error.message || "Registrierung fehlgeschlagen");
      return;
    }
    toast.success(
      "Registrierung erfolgreich. Bitte E-Mail bestätigen (falls angefordert) und anmelden.",
    );
  }

  async function onReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("E-Mail zum Zurücksetzen wurde gesendet.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>SysIng Dashboard</CardTitle>
          <CardDescription>Anmelden oder neuen Zugang anlegen</CardDescription>
        </CardHeader>
        <CardContent>
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
                <Button className="w-full" type="submit" disabled={busy}>
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
                <Button className="w-full" type="submit" disabled={busy}>
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
                <Button className="w-full" type="submit" disabled={busy}>
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
