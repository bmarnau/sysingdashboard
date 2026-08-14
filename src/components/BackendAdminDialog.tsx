/**
 * BackendAdminDialog — „Backend & Auth-Konten…"
 *
 * Zeigt Administratoren den Zustand der Backend-Anbindung und erlaubt die
 * Pflege der Anmeldekonten (bestätigen, Bestätigungsmail erneut senden,
 * löschen). Es werden bewusst keine Plattform-Zugangsdaten, Projektkennungen,
 * URLs oder Schlüssel angezeigt oder gespeichert.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RefreshCw, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getAuthConfigurationStatus } from "@/integrations/supabase/config";
import {
  listAuthAccounts,
  confirmAuthAccount,
  resendConfirmation,
  deleteAuthAccount,
  type AuthAccountSummary,
} from "@/lib/admin/auth-accounts.functions";

interface BackendAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

  async function run(id: string, action: () => Promise<unknown>, okMessage: string) {
    setBusyId(id);
    try {
      await action();
      toast.success(okMessage);
      await load();
    } catch {
      toast.error("Aktion fehlgeschlagen.");
    } finally {
      setBusyId(null);
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
    </Dialog>
  );
}
