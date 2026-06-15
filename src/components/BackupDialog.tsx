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
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  HardDrive,
  Info,
  Loader2,
  PlayCircle,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  BackupService,
  triggerBackupDownload,
  type BackupLogEntry,
  type BackupRecordMeta,
} from "@/lib/backup-service";

interface BackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("de-DE");
  } catch {
    return iso;
  }
}

function StatusIcon({ status }: { status: BackupRecordMeta["status"] }) {
  if (status === "ok") return <CheckCircle2 className="size-4 text-success" />;
  if (status === "warning") return <AlertTriangle className="size-4 text-warning" />;
  return <XCircle className="size-4 text-destructive" />;
}

export function BackupDialog({ open, onOpenChange }: BackupDialogProps) {
  const [backups, setBackups] = useState<BackupRecordMeta[]>([]);
  const [log, setLog] = useState<BackupLogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);

  const refresh = useCallback(async () => {
    setBackups(await BackupService.list());
    setLog(BackupService.log());
  }, []);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const result = await BackupService.createBackup({ manual: true });
      if (!result.ok) {
        setError(result.log.errors.join(" ") || "Backup konnte nicht erstellt werden.");
      } else {
        setInfo(`Backup erstellt: ${result.record?.fileName}`);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async (id: string, fileName: string) => {
    try {
      const rec = await BackupService.get(id);
      if (!rec) {
        setError("Backup nicht gefunden — Download nicht verfügbar.");
        return;
      }
      triggerBackupDownload(rec.blob, fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download fehlgeschlagen.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Dieses Backup wirklich löschen?")) return;
    await BackupService.delete(id);
    await refresh();
  };

  const lastAuto = BackupService.lastAuto();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="size-5" /> Backup
          </DialogTitle>
          <DialogDescription>
            Tägliches automatisches Daten-Backup des Dashboards. Backups
            werden lokal im Browser abgelegt und können als ZIP heruntergeladen
            werden.
          </DialogDescription>
        </DialogHeader>

        {/* Hinweis Quellcode */}
        <div className="flex gap-3 rounded-lg border border-border bg-secondary/40 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">Hinweis zum Quellcode-Export</p>
            <p className="text-muted-foreground">
              Das ZIP enthält alle Dashboard-Daten (Engineure, Arbeitszeitmodelle,
              Benutzer, Einstellungen, Berichte). Der vollständige
              Projekt-Quellcode für Ihren eigenen Webserver lässt sich aus der
              Browser-App heraus nicht sichern — laden Sie ihn direkt über
              Lovable (Code-Editor → <em>Codebase herunterladen</em>) oder per
              GitHub-Integration herunter. Eine Anleitung dazu liegt in jedem
              ZIP unter <code className="rounded bg-muted px-1">INSTALL.md</code>.
            </p>
            <a
              href="https://docs.lovable.dev/integrations/github"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              GitHub-Integration & Code-Download <ExternalLink className="size-3" />
            </a>
          </div>
        </div>

        {/* Aktionsleiste */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {lastAuto ? (
              <>Letztes automatisches Backup: {formatDateTime(lastAuto)}</>
            ) : (
              <>Noch kein automatisches Backup vorhanden.</>
            )}
          </div>
          <Button onClick={handleCreate} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <PlayCircle className="mr-2 size-4" />
            )}
            Backup jetzt erstellen
          </Button>
        </div>

        {info && (
          <div
            role="status"
            className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-xs text-success"
          >
            {info}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {error}
          </div>
        )}

        {/* Download-Liste */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Downloadbereich ({backups.length})
          </p>
          <div className="max-h-[40vh] overflow-y-auto rounded-md border border-border">
            {backups.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                Noch keine Backups vorhanden.
              </div>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {backups.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 px-3 py-2">
                    <StatusIcon status={b.status} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs">{b.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(b.createdAt)} · {formatBytes(b.sizeBytes)} ·{" "}
                        {b.manual ? "manuell" : "automatisch"} ·{" "}
                        {b.status === "ok"
                          ? "geprüft"
                          : b.status === "warning"
                            ? "mit Warnungen"
                            : "fehlerhaft"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownload(b.id, b.fileName)}
                      title="Herunterladen"
                    >
                      <Download className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(b.id)}
                      title="Löschen"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Backup-Protokoll */}
        <div>
          <button
            type="button"
            onClick={() => setShowLog((v) => !v)}
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            Backup-Protokoll ({log.length}) {showLog ? "▲" : "▼"}
          </button>
          {showLog && (
            <div className="mt-2 max-h-[30vh] overflow-y-auto rounded-md border border-border">
              {log.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  Noch keine Protokolleinträge.
                </div>
              ) : (
                <ul className="divide-y divide-border text-xs">
                  {log.map((entry) => (
                    <li key={entry.id} className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <StatusIcon
                          status={
                            entry.errors.length > 0
                              ? "failed"
                              : entry.consistency.status === "warning" ||
                                  entry.zipValidation.status === "warning"
                                ? "warning"
                                : "ok"
                          }
                        />
                        <span className="font-mono">{entry.fileName}</span>
                        <span className="ml-auto text-muted-foreground">
                          {formatDateTime(entry.timestamp)} ·{" "}
                          {entry.manual ? "manuell" : "auto"}
                        </span>
                      </div>
                      {(entry.consistency.messages.length > 0 ||
                        entry.zipValidation.messages.length > 0 ||
                        entry.errors.length > 0) && (
                        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                          {entry.consistency.messages.map((m, i) => (
                            <li key={`c${i}`}>Prüfung: {m}</li>
                          ))}
                          {entry.zipValidation.messages.map((m, i) => (
                            <li key={`z${i}`}>ZIP: {m}</li>
                          ))}
                          {entry.errors.map((m, i) => (
                            <li key={`e${i}`} className="text-destructive">
                              Fehler: {m}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
