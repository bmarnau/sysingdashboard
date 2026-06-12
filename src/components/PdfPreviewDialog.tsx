import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Settings2 } from "lucide-react";
import type { PdfPreview } from "@/lib/pdf-export";

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: PdfPreview | null;
  /** „Neu konfigurieren" — schließt diesen Dialog und öffnet ggf. den Konfigurations-Dialog wieder. */
  onReconfigure?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function PdfPreviewDialog({
  open,
  onOpenChange,
  preview,
  onReconfigure,
}: PdfPreviewDialogProps) {
  // Object-URL beim Schließen wieder freigeben
  useEffect(() => {
    if (!open && preview?.url) {
      // kleine Verzögerung, damit das iframe noch entladen kann
      const url = preview.url;
      const t = setTimeout(() => URL.revokeObjectURL(url), 0);
      return () => clearTimeout(t);
    }
  }, [open, preview?.url]);

  const handleDownload = () => {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview.url;
    a.download = preview.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] w-[95vw] max-w-[1200px] flex-col gap-0 overflow-hidden p-0 sm:rounded-lg">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>PDF Vorschau</DialogTitle>
          <DialogDescription>
            Prüfe den Leistungsnachweis vor dem Download. Die Datei wird lokal erzeugt und nicht
            versendet.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-secondary/40">
          {preview ? (
            <iframe
              key={preview.url}
              src={preview.url}
              title={preview.fileName}
              className="size-full border-0"
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              Keine Vorschau verfügbar.
            </div>
          )}
        </div>

        {preview && (
          <div className="grid grid-cols-1 gap-2 border-t border-border bg-background px-6 py-3 text-xs sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Seiten</p>
              <p className="font-semibold">{preview.pages}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Dateiname</p>
              <p className="truncate font-mono">{preview.fileName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Größe</p>
              <p className="font-semibold">{formatBytes(preview.sizeBytes)}</p>
            </div>
            <div className="sm:col-span-4">
              <p className="text-muted-foreground">Report-ID</p>
              <p className="font-mono">{preview.metadata.reportId}</p>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between gap-2 border-t border-border bg-background px-6 py-3 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
          <div className="flex gap-2">
            {onReconfigure && (
              <Button
                variant="ghost"
                onClick={() => {
                  onOpenChange(false);
                  onReconfigure();
                }}
              >
                <Settings2 className="mr-2 size-4" />
                Neu konfigurieren
              </Button>
            )}
            <Button onClick={handleDownload} disabled={!preview}>
              <Download className="mr-2 size-4" />
              Download PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
