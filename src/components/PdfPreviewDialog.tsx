import { lazy, Suspense, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Loader2, Settings2 } from "lucide-react";
import type { PdfPreview } from "@/lib/pdf-export";
import { SaveTargetDialog } from "@/components/SaveTargetDialog";

const PdfCanvasViewer = lazy(() =>
  import("@/components/PdfCanvasViewer").then((m) => ({ default: m.PdfCanvasViewer })),
);

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
      const url = preview.url;
      const t = setTimeout(() => URL.revokeObjectURL(url), 0);
      return () => clearTimeout(t);
    }
  }, [open, preview?.url]);

  const [saveOpen, setSaveOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setSaveOpen(false);
    }
  }, [open]);

  const openInNewTab = () => {
    if (!preview) return;
    window.open(preview.url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] w-[95vw] max-w-[1200px] flex-col gap-0 overflow-hidden p-0 sm:rounded-lg">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>PDF Vorschau</DialogTitle>
          <DialogDescription>
            Vorschau über die integrierte Rendering-Engine (pdf.js). Funktioniert unabhängig vom
            Browser-PDF-Plugin.
          </DialogDescription>
        </DialogHeader>

        <div className="relative flex-1 overflow-hidden bg-secondary/40">
          {preview ? (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Rendering-Engine wird geladen…
                </div>
              }
            >
              <PdfCanvasViewer blob={preview.blob} fileName={preview.fileName} />
            </Suspense>
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
            <Button variant="secondary" onClick={openInNewTab} disabled={!preview}>
              <ExternalLink className="mr-2 size-4" />
              Im Tab öffnen
            </Button>
            <Button onClick={() => setSaveOpen(true)} disabled={!preview}>
              <Download className="mr-2 size-4" />
              Speichern…
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <SaveTargetDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        blob={preview?.blob ?? null}
        fileName={preview?.fileName ?? ""}
        format="pdf"
        reportId={preview?.metadata.reportId ?? ""}
      />
    </Dialog>
  );
}

