import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download as DownloadIcon } from "lucide-react";
import { ExportDownloadService } from "@/lib/export-download-service";
import { downloadBlob } from "@/lib/export-archive";

interface TextPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** ID eines Downloads, dessen Blob aus IndexedDB gelesen wird. */
  downloadId?: string | null;
  /** Direkt-Inhalt (überschreibt downloadId). */
  text?: string | null;
  fileName?: string | null;
  mimeType?: string;
}

const MAX_PREVIEW_BYTES = 256 * 1024;

export function TextPreviewDialog({
  open,
  onOpenChange,
  downloadId,
  text: directText,
  fileName,
  mimeType = "text/plain",
}: TextPreviewDialogProps) {
  const [text, setText] = useState<string | null>(directText ?? null);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolvedName, setResolvedName] = useState<string | null>(fileName ?? null);

  useEffect(() => {
    if (!open) return;
    if (directText !== undefined && directText !== null) {
      const trunc = directText.length > MAX_PREVIEW_BYTES;
      setText(trunc ? directText.slice(0, MAX_PREVIEW_BYTES) : directText);
      setTruncated(trunc);
      setResolvedName(fileName ?? null);
      return;
    }
    if (!downloadId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const blob = await ExportDownloadService.getBlob(downloadId);
        if (!blob) {
          if (!cancelled) setText("(Datei nicht mehr verfügbar)");
          return;
        }
        const slice = blob.size > MAX_PREVIEW_BYTES ? blob.slice(0, MAX_PREVIEW_BYTES) : blob;
        const t = await slice.text();
        if (cancelled) return;
        setText(t);
        setTruncated(blob.size > MAX_PREVIEW_BYTES);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, downloadId, directText, fileName]);

  const handleCopy = async () => {
    if (text) await navigator.clipboard.writeText(text);
  };

  const handleDownload = async () => {
    if (downloadId) {
      await ExportDownloadService.triggerDownload(downloadId);
      return;
    }
    if (text && resolvedName) {
      downloadBlob(new Blob([text], { type: mimeType }), resolvedName);
    }
  };

  const lineCount = useMemo(() => (text ? text.split("\n").length : 0), [text]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">{resolvedName ?? "Vorschau"}</DialogTitle>
          <DialogDescription>
            Text-Vorschau {truncated && `(gekürzt auf ${Math.round(MAX_PREVIEW_BYTES / 1024)} KB)`}
            {text && ` · ${lineCount} Zeilen`}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-md border border-border bg-secondary/30">
          <pre className="max-h-[60vh] overflow-auto p-3 font-mono text-xs leading-relaxed whitespace-pre">
            {loading ? "Lade …" : (text ?? "")}
          </pre>
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleCopy} disabled={!text}>
              <Copy className="mr-2 size-4" /> Kopieren
            </Button>
            <Button variant="ghost" onClick={handleDownload} disabled={!text && !downloadId}>
              <DownloadIcon className="mr-2 size-4" /> Herunterladen
            </Button>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
