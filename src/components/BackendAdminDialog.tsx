/**
 * BackendAdminDialog — „Backend & Auth-Konten…"
 *
 * Zeigt Administratoren den Zustand der Backend-Anbindung und erlaubt die
 * Pflege der Anmeldekonten (bestätigen, Bestätigungsmail erneut senden,
 * löschen). Es werden bewusst keine Plattform-Zugangsdaten, Projektkennungen,
 * URLs oder Schlüssel angezeigt oder gespeichert.
 */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { SetPasswordDialog } from "@/components/admin/SetPasswordDialog";
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
import {
  CheckCircle2,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getAuthConfigurationStatus } from "@/integrations/supabase/config";
import {
  listAuthAccounts,
  confirmAuthAccount,
  resendConfirmation,
  deleteAuthAccount,
  requestPasswordReset,
  setAccountPassword,
  createKioskAuthAccount,
  type AuthAccountSummary,
} from "@/lib/admin/auth-accounts.functions";

interface BackendAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CREATE_KIOSK_BUSY_ID = "create-kiosk";

function fmt(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("de-DE");
}

export function BackendAdminDialog({ open, onOpenChange }: BackendAdminDialogProps) {
  const [accounts, setAccounts] = useState<AuthAccountSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pwTarget, setPwTarget] = useState<AuthAccountSummary | null>(null);
  const [kioskFormOpen, setKioskFormOpen] = useState(false);
  const [kioskDisplayName, setKioskDisplayName] = useState("Info-Kiosk");
  const [kioskEmail, setKioskEmail] = useState("");
  const [kioskPassword, setKioskPassword] = useState("");
  const [kioskPasswordConfirmation, setKioskPasswordConfirmation] = useState("");
  const [kioskError, setKioskError] = useState<string | null>(null);

  const authConfig = getAuthConfigurationStatus();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listAuthAccounts();
      setAccounts(rows);
    } catch {
      setAccounts(null);
      setError("Konten konnten nicht geladen werden. Berechtigung oder Verbindung prüfen.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) {
      setKioskFormOpen(false);
      setKioskDisplayName("Info-Kiosk");
      setKioskEmail("");
      setKioskPassword("");
      setKioskPasswordConfirmation("");
      setKioskError(null);
    }
  }, [open]);

  async function run(id: string, action: () => Promise<unknown>, okMessage: string) {
    setBusyId(id);
    try {
      await action();
      toast.success(okMessage);
      await load();
    } catch (err) {
      // Anbieterfehler (z. B. Cooldown/Rate-Limit) sichtbar machen, statt sie zu
      // verschlucken. Es werden nur Klartextmeldungen, nie Tokens ausgegeben.
      const message = err instanceof Error && err.message ? err.message : "Aktion fehlgeschlagen.";
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  function resetKioskForm() {
    setKioskFormOpen(false);
    setKioskDisplayName("Info-Kiosk");
    setKioskEmail("");
    setKioskPassword("");
    setKioskPasswordConfirmation("");
    setKioskError(null);
  }

  async function handleCreateKioskAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (kioskPassword !== kioskPasswordConfirmation) {
      setKioskError("Passwörter stimmen nicht überein.");
      return;
    }

    setBusyId(CREATE_KIOSK_BUSY_ID);
    setKioskError(null);
    try {
      await createKioskAuthAccount({
        data: {
          email: kioskEmail,
          password: kioskPassword,
          displayName: kioskDisplayName,
        },
      });
      toast.success("Kiosk-Konto wurde angelegt.");
      resetKioskForm();
      await load();
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : "Kiosk-Konto konnte nicht angelegt werden.";
      setKioskError(message);
      toast.error(message);
    } finally {
      setBusyId(null);
      setKioskPassword("");
      setKioskPasswordConfirmation("");
    }
  }

  const connected = accounts !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" aria-hidden="true" /> Backend &amp; Auth-Konten
          </DialogTitle>
          <DialogDescription>
            Zustand der Backend-Anbindung und Verwaltung der Anmeldekonten. Es werden keine
            Zugangsdaten, Schlüssel oder Verbindungsadressen angezeigt.
          </DialogDescription>
        </DialogHeader>

        <section aria-label="Administrationsstatus" className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3 text-sm">
            <div className="text-muted-foreground">Backend verbunden</div>
            <div className="mt-1 flex items-center gap-2 font-medium">
              {connected ? (
                <>
                  <CheckCircle2 className="size-4 text-primary" aria-hidden="true" /> Ja
                </>
              ) : (
                <>
                  <XCircle className="size-4 text-destructive" aria-hidden="true" />{" "}
                  {loading ? "Prüfung läuft…" : "Nein"}
                </>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-border p-3 text-sm">
            <div className="text-muted-foreground">Auth-Konfiguration</div>
            <div className="mt-1 font-medium">
              {authConfig.status === "configured"
                ? "Vollständig konfiguriert"
                : authConfig.status === "missing"
                  ? "Unvollständig konfiguriert"
                  : "Fehlerhaft konfiguriert"}
            </div>
          </div>
        </section>

        <p className="rounded-md border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
          Die Betriebsplattform stellt keine externe Administrationsoberfläche für den Betreiber
          bereit. Kontopflege erfolgt deshalb ausschließlich hier (Befund F-15, siehe Handbuch
          „Backend- und Auth-Administration").
        </p>

        <section aria-label="Kiosk-Konto" className="rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-medium">Dediziertes Kiosk-Konto</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Legt ein eigenes Konto mit der exklusiven Rolle „kiosk“ an. Die serverseitige
                Berechtigungsprüfung bleibt maßgeblich; Passwörter werden nicht angezeigt oder
                gespeichert.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (kioskFormOpen) {
                  resetKioskForm();
                } else {
                  setKioskFormOpen(true);
                  setKioskError(null);
                }
              }}
              disabled={busyId === CREATE_KIOSK_BUSY_ID}
            >
              {kioskFormOpen ? "Abbrechen" : "Kiosk-Konto anlegen"}
            </Button>
          </div>

          {kioskFormOpen && (
            <form className="mt-4 grid gap-3" onSubmit={(event) => void handleCreateKioskAccount(event)}>
              <div>
                <Label htmlFor="kiosk-display-name">Anzeigename</Label>
                <Input
                  id="kiosk-display-name"
                  value={kioskDisplayName}
                  onChange={(event) => setKioskDisplayName(event.target.value)}
                  maxLength={120}
                  required
                />
              </div>
              <div>
                <Label htmlFor="kiosk-email">Kiosk-E-Mail</Label>
                <Input
                  id="kiosk-email"
                  type="email"
                  autoComplete="off"
                  value={kioskEmail}
                  onChange={(event) => setKioskEmail(event.target.value)}
                  maxLength={254}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="kiosk-password">Kiosk-Passwort</Label>
                  <Input
                    id="kiosk-password"
                    type="password"
                    autoComplete="new-password"
                    value={kioskPassword}
                    onChange={(event) => setKioskPassword(event.target.value)}
                    minLength={8}
                    maxLength={200}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="kiosk-password-confirmation">Passwort bestätigen</Label>
                  <Input
                    id="kiosk-password-confirmation"
                    type="password"
                    autoComplete="new-password"
                    value={kioskPasswordConfirmation}
                    onChange={(event) => setKioskPasswordConfirmation(event.target.value)}
                    minLength={8}
                    maxLength={200}
                    required
                  />
                </div>
              </div>
              {kioskError && (
                <p role="alert" className="text-sm text-destructive">
                  {kioskError}
                </p>
              )}
              <div className="flex justify-end">
                <Button type="submit" disabled={busyId === CREATE_KIOSK_BUSY_ID}>
                  Kiosk-Konto erstellen
                </Button>
              </div>
            </form>
          )}
        </section>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <section aria-label="Anmeldekonten" className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-2">E-Mail</th>
                <th className="py-2">Status</th>
                <th className="py-2">Rolle</th>
                <th className="py-2">Letzte Anmeldung</th>
                <th className="py-2 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {(accounts ?? []).map((a) => (
                <tr key={a.id} className="border-t border-border align-middle">
                  <td className="py-2 pr-2">{a.email}</td>
                  <td className="py-2 pr-2">{a.confirmed ? "Bestätigt" : "Unbestätigt"}</td>
                  <td className="py-2 pr-2">{a.role ?? "—"}</td>
                  <td className="py-2 pr-2">{fmt(a.lastSignInAt)}</td>
                  <td className="py-2">
                    <div className="flex justify-end gap-1">
                      {!a.confirmed && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busyId === a.id}
                            onClick={() =>
                              void run(
                                a.id,
                                () => confirmAuthAccount({ data: { userId: a.id } }),
                                "Konto bestätigt.",
                              )
                            }
                          >
                            Bestätigen
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busyId === a.id}
                            onClick={() =>
                              void run(
                                a.id,
                                () => resendConfirmation({ data: { email: a.email } }),
                                "Bestätigungsmail gesendet.",
                              )
                            }
                          >
                            Mail erneut
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Passwort-Reset-Mail an ${a.email} senden`}
                        title="Passwort-Reset-Mail senden"
                        disabled={busyId === a.id}
                        onClick={() => {
                          if (!window.confirm(`Passwort-Reset-Mail an ${a.email} senden?`)) return;
                          void run(
                            a.id,
                            () => requestPasswordReset({ data: { userId: a.id } }),
                            "Passwort-Reset-Mail wurde beim Anbieter angefordert. Zustellung prüfen (auch Spam-Ordner).",
                          );
                        }}
                      >
                        <KeyRound className="size-4" aria-hidden="true" />
                      </Button>

                      {!a.isSelf && (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Administratives Passwort für ${a.email} setzen`}
                          title="Administratives Passwort setzen"
                          disabled={busyId === a.id}
                          onClick={() => setPwTarget(a)}
                        >
                          <Lock className="size-4" aria-hidden="true" />
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Konto ${a.email} löschen`}
                        title="Konto löschen"
                        disabled={busyId === a.id}
                        onClick={() => {
                          if (!window.confirm(`Konto ${a.email} endgültig löschen?`)) return;
                          void run(
                            a.id,
                            () => deleteAuthAccount({ data: { userId: a.id } }),
                            "Konto gelöscht.",
                          );
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {accounts !== null && accounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-muted-foreground">
                    Keine Konten vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-2 size-4" aria-hidden="true" /> Aktualisieren
          </Button>
          <Button onClick={() => onOpenChange(false)}>Schließen</Button>
        </DialogFooter>
      </DialogContent>

      <SetPasswordDialog
        open={pwTarget !== null}
        email={pwTarget?.email ?? ""}
        busy={busyId !== null}
        onOpenChange={(next) => {
          if (!next) setPwTarget(null);
        }}
        onSubmit={async (password) => {
          const target = pwTarget;
          if (!target) return;
          setPwTarget(null);
          await run(
            target.id,
            () => setAccountPassword({ data: { userId: target.id, password } }),
            "Das Passwort wurde aktualisiert. Der Benutzer sollte es nach der nächsten Anmeldung selbst ändern.",
          );
        }}
      />
    </Dialog>
  );
}
