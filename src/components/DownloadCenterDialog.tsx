import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye, Loader2, RefreshCw, Trash2 } from "lucide-react";
import {
  ExportDownloadService,
  type ExportDownloadItem,
  type ExportDownloadStatus,
} from "@/lib/export-download-service";
import type { PdfPreview } from "@/lib/pdf-export";

const PdfPreviewDialog = lazy(() =>
  import("@/components/PdfPreviewDialog").then((m) => ({ default: m.PdfPreviewDialog })),
);

interface DownloadCenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_LABEL: Record<ExportDownloadStatus, string> = {
  creating: "In Erstellung",
  ready: "Fertig",
  failed: "Fehlgeschlagen",
  expired: "Abgelaufen",
};

const STATUS_CLASS: Record<ExportDownloadStatus, string> = {
  creating: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  ready: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
  expired: "border-border bg-secondary/40 text-muted-foreground",
};

function formatBytes(bytes?: number): string {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const DATETIME_FMT = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function DownloadCenterDialog({ open, onOpenChange }: DownloadCenterDialogProps) {
  const [items, setItems] = useState<ExportDownloadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PdfPreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await ExportDownloadService.getDownloads());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  // Live-Update wenn neue Exporte hinzukommen
  useEffect(() => {
    if (!open) return;
    const handler = () => void refresh();
    window.addEventListener("export-downloads:changed", handler);
    return () => window.removeEventListener("export-downloads:changed", handler);
  }, [open, refresh]);

  const handleDownload = async (id: string) => {
    await ExportDownloadService.triggerDownload(id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Diesen Export wirklich löschen?")) return;
    await ExportDownloadService.deleteDownload(id);
    void refresh();
  };

  const handlePreview = async (item: ExportDownloadItem) => {
    if (item.format !== "pdf") {
      window.alert("Vorschau ist nur für PDF-Reports verfügbar.");
      return;
    }
    const blob = await ExportDownloadService.getBlob(item.id);
    if (!blob) {
      window.alert("Datei nicht mehr verfügbar.");
      return;
    }
    const typed =
      blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
    const url = URL.createObjectURL(typed);
    setPreview({
      blob: typed,
      url,
      fileName: item.fileName,
      pages: 0,
      sizeBytes: typed.size,
      metadata: {
        reportId: item.reportId ?? item.id,
        createdAt: item.createdAt,
        createdBy: item.createdBy,
        exportFormat: item.format,
        dashboardVersion: "",
        grouping: "",
        sorting: [],
      },
    });
    setPreviewOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Downloads</DialogTitle>
            <DialogDescription>
              Alle erzeugten Export-Dateien (PDF, CSV, JSON, Azure Table). Die Ablage liegt lokal
              im Browser und verlässt Ihr Gerät nicht.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-hidden rounded-md border border-border">
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Dateiname</th>
                    <th className="px-3 py-2 text-left font-medium">Format</th>
                    <th className="px-3 py-2 text-left font-medium">Zeitraum</th>
                    <th className="px-3 py-2 text-left font-medium">Erstellt am</th>
                    <th className="px-3 py-2 text-left font-medium">Erstellt von</th>
                    <th className="px-3 py-2 text-right font-medium">Größe</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading && items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                        <Loader2 className="mx-auto size-4 animate-spin" />
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                        Noch keine Exporte vorhanden. Erzeugen Sie über „Service → Export…" einen
                        Report.
                      </td>
                    </tr>
                  ) : (
                    items.map((it) => {
                      const status = it.status;
                      const canDownload = status === "ready" && (it.fileSize ?? 0) > 0;
                      const canPreview = canDownload && it.format === "pdf";
                      return (
                        <tr key={it.id} className="hover:bg-secondary/30">
                          <td className="max-w-[260px] truncate px-3 py-2 font-mono text-xs">
                            {it.fileName}
                            {it.error && (
                              <span className="block text-[11px] text-destructive">
                                {it.error}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 uppercase">{it.format}</td>
                          <td className="px-3 py-2">{it.period}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {DATETIME_FMT.format(new Date(it.createdAt))}
                          </td>
                          <td className="px-3 py-2">{it.createdBy}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            {formatBytes(it.fileSize)}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${STATUS_CLASS[status]}`}
                            >
                              {STATUS_LABEL[status]}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <div className="inline-flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Herunterladen"
                                disabled={!canDownload}
                                onClick={() => handleDownload(it.id)}
                              >
                                <Download className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Vorschau öffnen"
                                disabled={!canPreview}
                                onClick={() => handlePreview(it)}
                              >
                                <Eye className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Löschen"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(it.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
              Aktualisieren
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {previewOpen && (
        <Suspense fallback={null}>
          <PdfPreviewDialog
            open={previewOpen}
            onOpenChange={(o) => {
              setPreviewOpen(o);
              if (!o) {
                if (preview?.url) URL.revokeObjectURL(preview.url);
                setPreview(null);
              }
            }}
            preview={preview}
          />
        </Suspense>
      )}
    </>
  );
}
