/**
 * Administrative Einstellung: automatische Abmeldung bei Inaktivität.
 *
 * Anzeige für alle Angemeldeten (wirksamer Wert + Herkunft), Änderung nur mit
 * Berechtigung `users.manage`. Serverseitig zusätzlich durch RLS erzwungen —
 * das UI-Gate ist reiner Komfort.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { PermissionGate } from "@/components/PermissionGate";
import {
  loadIdleTimeoutConfig,
  saveIdleTimeoutSetting,
  MIN_IDLE_TIMEOUT_MINUTES,
  MAX_IDLE_TIMEOUT_MINUTES,
  DEFAULT_IDLE_TIMEOUT_MINUTES,
  warningSecondsFor,
  type IdleTimeoutConfig,
} from "@/lib/session/idle-config";

const SOURCE_LABEL: Record<IdleTimeoutConfig["source"], string> = {
  setting: "Systemeinstellung (Datenbank)",
  env: "Umgebungsvariable VITE_IDLE_TIMEOUT_MINUTES",
  default: `Standardwert (${DEFAULT_IDLE_TIMEOUT_MINUTES} Minuten)`,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SessionSettingsDialog({ open, onOpenChange }: Props) {
  const [config, setConfig] = useState<IdleTimeoutConfig | null>(null);
  const [value, setValue] = useState(String(DEFAULT_IDLE_TIMEOUT_MINUTES));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void loadIdleTimeoutConfig().then((c) => {
      if (cancelled) return;
      setConfig(c);
      setValue(String(c.minutes));
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function onSave() {
    setSaving(true);
    try {
      await saveIdleTimeoutSetting(Number(value));
      const fresh = await loadIdleTimeoutConfig();
      setConfig(fresh);
      setValue(String(fresh.minutes));
      toast.success("Zeit bis zur automatischen Abmeldung gespeichert.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speichern nicht möglich.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Automatische Abmeldung bei Inaktivität</DialogTitle>
          <DialogDescription>
            Nach Ablauf der eingestellten Zeit ohne Maus-, Tastatur- oder Scroll-Aktivität wird die
            Sitzung beendet. Kurz vor Ablauf erscheint ein Hinweis mit Countdown.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-border bg-secondary/30 p-3 text-sm">
            <p>
              Wirksamer Wert:{" "}
              <span className="font-semibold">{config ? `${config.minutes} Minuten` : "…"}</span>
            </p>
            <p className="mt-1 text-muted-foreground">
              Herkunft: {config ? SOURCE_LABEL[config.source] : "…"}
            </p>
            {config && (
              <p className="mt-1 text-muted-foreground">
                Vorwarnung: {warningSecondsFor(config.minutes)} Sekunden vor Ablauf
              </p>
            )}
            {config?.invalidReason && (
              <p className="mt-1 text-warning">
                Hinweis: {config.invalidReason} – es gilt der Ersatzwert.
              </p>
            )}
          </div>

          <PermissionGate
            permission="users.manage"
            fallback={
              <p className="text-sm text-muted-foreground">
                Änderungen sind der Benutzerverwaltung vorbehalten.
              </p>
            }
          >
            <div className="space-y-2">
              <Label htmlFor="idle-timeout-minutes">Zeit bis zur Abmeldung (Minuten)</Label>
              <Input
                id="idle-timeout-minutes"
                type="number"
                inputMode="numeric"
                min={MIN_IDLE_TIMEOUT_MINUTES}
                max={MAX_IDLE_TIMEOUT_MINUTES}
                step={1}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                aria-describedby="idle-timeout-hint"
              />
              <p id="idle-timeout-hint" className="text-xs text-muted-foreground">
                Erlaubt sind ganze Zahlen von {MIN_IDLE_TIMEOUT_MINUTES} bis{" "}
                {MAX_IDLE_TIMEOUT_MINUTES}. Die Änderung gilt systemweit für alle Benutzer und wird
                in anderen Sitzungen beim nächsten Laden wirksam.
              </p>
            </div>
          </PermissionGate>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
          <PermissionGate permission="users.manage">
            <Button onClick={() => void onSave()} disabled={saving}>
              {saving ? "Speichern…" : "Speichern"}
            </Button>
          </PermissionGate>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
