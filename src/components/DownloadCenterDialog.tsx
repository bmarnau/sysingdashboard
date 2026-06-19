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
const TextPreviewDialog = lazy(() =>
  import("@/components/TextPreviewDialog").then((m) => ({ default: m.TextPreviewDialog })),
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

const TEXT_FORMATS = new Set(["csv", "json", "azure-table"]);

function formatBytes(bytes?: number): string {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatExpiry(item: ExportDownloadItem): string {
  if (item.status === "expired") return "abgelaufen";
  if (item.status === "failed") return "—";
  if (item.expiresInSeconds === null) return "—";
  const secs = item.expiresInSeconds;
  if (secs <= 0) return "läuft ab";
  const days = Math.floor(secs / 86400);
  if (days >= 2) return `noch ${days} Tage`;
  if (days === 1) return `noch 1 Tag`;
  const hours = Math.max(1, Math.floor(secs / 3600));
  return `noch ${hours} h`;
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
  const [textPreviewId, setTextPreviewId] = useState<string | null>(null);
  const [textPreviewName, setTextPreviewName] = useState<string | null>(null);
  const [retentionDays, setRetentionDays] = useState<number>(
    ExportDownloadService.getRetentionDays(),
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await ExportDownloadService.getDownloads());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setRetentionDays(ExportDownloadService.getRetentionDays());
      void refresh();
    }
  }, [open, refresh]);

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

  const handlePurgeExpired = async () => {
    const n = await ExportDownloadService.purgeExpiredNow();
    if (n > 0) void refresh();
    window.alert(n > 0 ? `${n} abgelaufene Einträge entfernt.` : "Keine abgelaufenen Einträge.");
  };

  const handleRetentionChange = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const v = ExportDownloadService.setRetentionDays(n);
    setRetentionDays(v);
  };

  const handlePreview = async (item: ExportDownloadItem) => {
    if (item.format === "pdf") {
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
      return;
    }
    if (TEXT_FORMATS.has(item.format)) {
      setTextPreviewId(item.id);
      setTextPreviewName(item.fileName);
      return;
    }
    window.alert("Für dieses Format ist keine Vorschau verfügbar.");
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

          {/* Retention-Steuerung */}
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs">
            <label htmlFor="retention-days" className="font-medium">
              Aufbewahrung:
            </label>
            <input
              id="retention-days"
              type="number"
              min={1}
              max={365}
              value={retentionDays}
              onChange={(e) => handleRetentionChange(e.target.value)}
              className="h-7 w-20 rounded border border-border bg-background px-2 text-xs"
            />
            <span className="text-muted-foreground">Tage je neuem Export</span>
            <span className="ml-auto text-muted-foreground">
              Abgelaufene Einträge werden nach 7 Tagen Karenz automatisch gelöscht.
            </span>
            <Button size="sm" variant="ghost" onClick={handlePurgeExpired}>
              Abgelaufene jetzt löschen
            </Button>
          </div>

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
                    <th className="px-3 py-2 text-left font-medium">Ablauf</th>
                    <th className="px-3 py-2 text-right font-medium">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading && items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                        <Loader2 className="mx-auto size-4 animate-spin" />
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                        Noch keine Exporte vorhanden. Erzeugen Sie über „Service → Export…" einen
                        Report.
                      </td>
                    </tr>
                  ) : (
                    items.map((it) => {
                      const status = it.status;
                      const canDownload = status === "ready" && (it.fileSize ?? 0) > 0;
                      const canPreview =
                        canDownload && (it.format === "pdf" || TEXT_FORMATS.has(it.format));
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
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                            {formatExpiry(it)}
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

      {textPreviewId && (
        <Suspense fallback={null}>
          <TextPreviewDialog
            open={!!textPreviewId}
            onOpenChange={(o) => {
              if (!o) {
                setTextPreviewId(null);
                setTextPreviewName(null);
              }
            }}
            downloadId={textPreviewId}
            fileName={textPreviewName}
          />
        </Suspense>
      )}
    </>
  );
}
