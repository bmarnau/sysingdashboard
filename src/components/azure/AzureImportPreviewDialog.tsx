import { useEffect, useState } from "react";
import { AlertTriangle, HardDrive, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { azureService } from "@/lib/azure/azure-service";
import type { AzureImportPreview } from "@/lib/azure/types";
import { BackupService } from "@/lib/backup-service";

interface AzureImportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Wird gerufen, sobald Vorschau geprüft und Backup erstellt wurde.
   * Der eigentliche Import wird im übergeordneten Actions-Panel gestartet
   * (dort läuft die finale Textbestätigung).
   */
  onProceed: (backupId: string) => void;
}

/**
 * Zeigt eine Import-Vorschau und erzwingt vor dem Weiterschalten:
 *   1. Manuelles Ansehen der Vorschau
 *   2. Explizites Häkchen "Ich habe die Vorschau geprüft"
 *   3. Erstellen eines lokalen Backups (Pflicht, siehe Handbuch)
 *
 * Erst wenn alle drei Bedingungen erfüllt sind, wird `onProceed` aktiv.
 */
export function AzureImportPreviewDialog({
  open,
  onOpenChange,
  onProceed,
}: AzureImportPreviewDialogProps) {
  const [preview, setPreview] = useState<AzureImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [backupId, setBackupId] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setReviewed(false);
      setBackupId(null);
      setBackupError(null);
      return;
    }
    let alive = true;
    setLoading(true);
    azureService
      .fetchImportPreview()
      .then((p) => {
        if (alive) setPreview(p);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open]);

  async function createBackup() {
    setBackupBusy(true);
    setBackupError(null);
    try {
      const res = await BackupService.createBackup({ manual: true });
      setBackupId(res.record.id);
    } catch (err) {
      setBackupError((err as Error).message || "Backup fehlgeschlagen.");
    } finally {
      setBackupBusy(false);
    }
  }

  const canProceed = reviewed && !!backupId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-warning" />
            Import-Vorschau
          </DialogTitle>
          <DialogDescription className="text-warning">
            Ein Import kann lokale Daten überschreiben. Bitte Vorschau prüfen und vor dem Weiter
            ein Backup erstellen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <section className="rounded-lg border border-border bg-muted/30 p-3">
            <h4 className="mb-2 font-semibold">Vorschau</h4>
            {loading ? (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Vorschau wird geladen…
              </p>
            ) : preview ? (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <PreviewStat label="Neu" value={preview.counts.toCreate} />
                <PreviewStat label="Aktualisieren" value={preview.counts.toUpdate} />
                <PreviewStat label="Löschen" value={preview.counts.toDelete} />
                <PreviewStat label="Konflikte" value={preview.counts.conflicts} tone="warning" />
                <p className="col-span-full text-xs text-muted-foreground">
                  Bereich: {preview.scope} · erstellt {new Date(preview.generatedAt).toLocaleString("de-DE")}
                </p>
                {preview.conflictSamples.length > 0 ? (
                  <ul className="col-span-full list-disc pl-5 text-xs text-warning">
                    {preview.conflictSamples.slice(0, 5).map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground">Keine Vorschau verfügbar.</p>
            )}
          </section>

          <section className="rounded-lg border border-border p-3">
            <label className="flex items-start gap-2">
              <Checkbox checked={reviewed} onCheckedChange={(v) => setReviewed(v === true)} />
              <span>
                Ich habe die Vorschau geprüft und verstehe, dass ein Import lokale Daten
                überschreiben kann.
              </span>
            </label>
          </section>

          <section className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Pflicht-Backup</p>
                <p className="text-xs text-muted-foreground">
                  Vor jedem Import wird ein vollständiges lokales Backup erzeugt.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={createBackup}
                disabled={backupBusy || !!backupId}
              >
                {backupBusy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> läuft…
                  </>
                ) : backupId ? (
                  <>
                    <HardDrive className="size-4" /> Backup erstellt
                  </>
                ) : (
                  <>
                    <HardDrive className="size-4" /> Backup jetzt erstellen
                  </>
                )}
              </Button>
            </div>
            {backupId ? (
              <p className="mt-2 font-mono text-xs text-success">Backup-ID: {backupId}</p>
            ) : null}
            {backupError ? (
              <p className="mt-2 text-xs text-destructive">{backupError}</p>
            ) : null}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            disabled={!canProceed}
            onClick={() => {
              if (!backupId) return;
              onOpenChange(false);
              onProceed(backupId);
            }}
          >
            Weiter zur Bestätigung
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={`rounded-md border p-2 text-center ${
        tone === "warning"
          ? "border-warning/40 bg-warning/10 text-warning"
          : "border-border bg-background"
      }`}
    >
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
