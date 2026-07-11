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
import { Archive, Download, FolderOpen, HardDrive, Loader2, Trash2 } from "lucide-react";
import {
  ExportArchive,
  downloadBlob,
  isFsAccessSupported,
  loadPreferredTarget,
  saveBlobViaPicker,
  savePreferredTarget,
  type ArchivedExport,
  type SaveTarget,
} from "@/lib/export-archive";
import { logger } from "@/lib/logger";

interface SaveTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blob: Blob | null;
  fileName: string;
  format: string;
  reportId: string;
  onSaved?: (info: { target: SaveTarget; storedAs?: string }) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const TARGETS: Array<{
  value: SaveTarget;
  title: string;
  description: string;
  icon: typeof FolderOpen;
}> = [
  {
    value: "picker",
    title: "Datei speichern unter…",
    description:
      "Ordner und Dateinamen über den Datei-Dialog des Browsers wählen. Empfohlen für Chrome/Edge.",
    icon: FolderOpen,
  },
  {
    value: "download",
    title: "Standard-Download",
    description: "Datei wird in den Standard-Downloads-Ordner abgelegt.",
    icon: Download,
  },
  {
    value: "archive",
    title: "Lokale Ablage",
    description:
      "Datei bleibt im Browser (IndexedDB) und kann später aus der Ablage erneut heruntergeladen werden.",
    icon: HardDrive,
  },
];

export function SaveTargetDialog({
  open,
  onOpenChange,
  blob,
  fileName,
  format,
  reportId,
  onSaved,
}: SaveTargetDialogProps) {
  const [target, setTarget] = useState<SaveTarget>("picker");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const preferred = loadPreferredTarget();
    setTarget(preferred ?? (isFsAccessSupported() ? "picker" : "download"));
    setError(null);
    setBusy(false);
  }, [open]);

  const handleSave = async () => {
    if (!blob) return;
    setBusy(true);
    setError(null);
    try {
      if (target === "picker") {
        const stored = await saveBlobViaPicker(blob, fileName);
        if (stored === null) {
          // User-Abbruch — Dialog offen lassen
          setBusy(false);
          return;
        }
        savePreferredTarget("picker");
        onSaved?.({ target, storedAs: stored });
      } else if (target === "download") {
        downloadBlob(blob, fileName);
        savePreferredTarget("download");
        onSaved?.({ target, storedAs: fileName });
      } else {
        const entry = await ExportArchive.save({
          fileName,
          format,
          reportId,
          sizeBytes: blob.size,
          blob,
        });
        savePreferredTarget("archive");
        onSaved?.({ target, storedAs: entry.fileName });
      }
      onOpenChange(false);
    } catch (err) {
      logger.error("Save target failed", err, {
        module: "SaveTargetDialog",
        action: "save",
        format,
      });
      setError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
      setBusy(false);
    }
  };

  const fsSupported = isFsAccessSupported();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Speicherort wählen</DialogTitle>
            <DialogDescription>
              Wohin soll <span className="font-mono text-xs">{fileName}</span> abgelegt werden?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {TARGETS.map((opt) => {
              const Icon = opt.icon;
              const disabled = opt.value === "picker" && !fsSupported;
              const selected = target === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => !disabled && setTarget(opt.value)}
                  disabled={disabled}
                  className={[
                    "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-secondary/40",
                    disabled ? "opacity-50" : "",
                  ].join(" ")}
                >
                  <Icon
                    className={`mt-0.5 size-5 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{opt.title}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                    {disabled && (
                      <p className="mt-1 text-xs text-warning">
                        Dieser Browser unterstützt keinen Datei-Dialog (Safari/Firefox). Bitte
                        Standard-Download verwenden.
                      </p>
                    )}
                  </div>
                  <span
                    className={`mt-1 size-3 shrink-0 rounded-full border ${selected ? "border-primary bg-primary" : "border-border"}`}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>

          {blob && (
            <div className="rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-mono">{fileName}</span> · {formatBytes(blob.size)} ·{" "}
              <span className="font-mono">{reportId}</span>
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

          <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setArchiveOpen(true)}
              className="text-xs"
            >
              <Archive className="mr-2 size-4" /> Ablage öffnen
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={busy || !blob}>
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                Speichern
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LocalArchiveDialog open={archiveOpen} onOpenChange={setArchiveOpen} />
    </>
  );
}

/* ------------------------- LocalArchiveDialog ------------------------- */

interface LocalArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocalArchiveDialog({ open, onOpenChange }: LocalArchiveDialogProps) {
  const [items, setItems] = useState<ArchivedExport[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      setItems(await ExportArchive.list());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void refresh();
  }, [open]);

  const handleDownload = async (id: string, fileName: string) => {
    const rec = await ExportArchive.get(id);
    if (!rec || !rec.blob) return;
    downloadBlob(rec.blob, fileName);
  };

  const handleDelete = async (id: string) => {
    await ExportArchive.delete(id);
    void refresh();
  };

  const handleClear = async () => {
    if (!window.confirm("Alle lokal abgelegten Exporte löschen?")) return;
    await ExportArchive.clear();
    void refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lokale Ablage</DialogTitle>
          <DialogDescription>
            Exporte, die im Browser gespeichert wurden. Die Daten verlassen Ihr Gerät nicht.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto rounded-md border border-border">
          {loading ? (
            <div className="grid place-items-center py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Keine Exporte in der lokalen Ablage.
            </div>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs">{it.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.reportId} · {it.format.toUpperCase()} ·{" "}
                      {new Date(it.createdAt).toLocaleString("de-DE")} ·{" "}
                      {(it.sizeBytes / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(it.id, it.fileName)}
                    title="Herunterladen"
                  >
                    <Download className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(it.id)}
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

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleClear}
            disabled={items.length === 0}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-2 size-4" /> Alle löschen
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
