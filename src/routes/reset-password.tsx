import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

/**
 * Ziel-Route für Passwort-Reset-Links. Öffentlich; Supabase legt beim
 * Öffnen des Links automatisch eine Recovery-Session an, mit der wir
 * `updateUser({ password })` aufrufen dürfen.
 */
export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Passwort zurücksetzen – SysIng Dashboard" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Passwort gesetzt. Bitte neu anmelden.");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Neues Passwort setzen</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="new-pw">Neues Passwort</Label>
              <Input
                id="new-pw"
                name="password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>
            <Button className="w-full" type="submit" disabled={busy}>
              Speichern
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
