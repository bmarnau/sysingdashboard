/**
 * SetPasswordDialog — „Administratives Passwort setzen".
 *
 * Bewusst ein eigener Dialog (kein natives `prompt`). Das Passwort wird nur
 * im lokalen Komponentenzustand gehalten, ausschließlich als Argument an die
 * Serverfunktion übergeben und beim Schließen verworfen. Es wird nie
 * gespeichert, geloggt, auditiert oder angezeigt.
 */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Mindestlänge gemäß bestehender Auth-Policy (Registrierung, Recovery). */
export const MIN_PASSWORD_LENGTH = 8;

interface SetPasswordDialogProps {
  open: boolean;
  email: string;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (password: string) => Promise<void> | void;
}

export function SetPasswordDialog({
  open,
  email,
  busy = false,
  onOpenChange,
  onSubmit,
}: SetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setConfirm("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`);
      return;
    }
    if (password !== confirm) {
      setError("Die beiden Eingaben stimmen nicht überein.");
      return;
    }
    setError(null);
    await onSubmit(password);
    setPassword("");
    setConfirm("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Administratives Passwort setzen</DialogTitle>
          <DialogDescription>
            Zielkonto: <strong>{email}</strong>. Bestehende Passwörter werden nicht angezeigt. Das
            Passwort sollte der Benutzer nach der nächsten Anmeldung selbst ändern.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <Label htmlFor="admin-pw">Neues Passwort (min. {MIN_PASSWORD_LENGTH} Zeichen)</Label>
            <Input
              id="admin-pw"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="admin-pw-confirm">Passwort bestätigen</Label>
            <Input
              id="admin-pw-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={busy}>
              Passwort setzen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
