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
import { Download, ExternalLink, Settings2 } from "lucide-react";
import type { PdfPreview } from "@/lib/pdf-export";
import { SaveTargetDialog } from "@/components/SaveTargetDialog";

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
  const [embedFailed, setEmbedFailed] = useState(false);

  useEffect(() => {
    if (!open) {
      setSaveOpen(false);
      setEmbedFailed(false);
    }
  }, [open]);

  // Manche Browser (insb. Chrome in eingebetteten Vorschau-Iframes) blockieren
  // das interne PDF-Plugin in verschachtelten iframes. In diesem Fall bieten wir
  // direkt einen „In neuem Tab öffnen"-Button an.
  const isEmbeddedPreview =
    typeof window !== "undefined" && window.top !== window.self;

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
            Prüfe den Leistungsnachweis vor dem Download. Die Datei wird lokal erzeugt und nicht
            versendet.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-6 py-2 text-xs">
          <span className="text-muted-foreground">
            Falls die Vorschau leer bleibt, kann sie in einem neuen Tab geöffnet werden.
          </span>
          <Button size="sm" variant="outline" onClick={openInNewTab} disabled={!preview}>
            <ExternalLink className="mr-2 size-4" />
            In neuem Tab öffnen
          </Button>
        </div>

        <div className="relative flex-1 overflow-hidden bg-secondary/40">
          {preview ? (
            embedFailed ? (
              <FallbackPanel onOpen={openInNewTab} />
            ) : (
              <object
                key={preview.url}
                data={`${preview.url}#view=FitH&toolbar=1`}
                type="application/pdf"
                aria-label={preview.fileName}
                className="size-full"
                onError={() => setEmbedFailed(true)}
              >
                <FallbackPanel onOpen={openInNewTab} />
              </object>
            )
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
            {isEmbeddedPreview && (
              <Button variant="secondary" onClick={openInNewTab} disabled={!preview}>
                <ExternalLink className="mr-2 size-4" />
                Im Tab öffnen
              </Button>
            )}
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

function FallbackPanel({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm text-muted-foreground">
        Die Inline-Vorschau wurde vom Browser blockiert (häufig in eingebetteten
        Vorschau-Fenstern). Öffne das PDF in einem neuen Tab.
      </p>
      <Button onClick={onOpen}>
        <ExternalLink className="mr-2 size-4" />
        PDF in neuem Tab öffnen
      </Button>
    </div>
  );
}
