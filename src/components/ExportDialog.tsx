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
import { ChevronDown, ChevronUp, Loader2, Maximize2, Minimize2, RotateCcw, X } from "lucide-react";
import type { Activity, Engineer, Project, WorkPackage } from "@/lib/dashboard-data";
import {
  createExportDTO,
  type ExportConfiguration,
  type ExportFormat,
  type ExportGroupNode,
  type GroupingId,
  type SortKey,
} from "@/lib/export-data";
import type { PdfPreview } from "@/lib/pdf-export";
import { lazy, Suspense } from "react";
import { ExportDownloadService } from "@/lib/export-download-service";
import { buildTextExport, withReportIdInFileName } from "@/lib/text-export";
import { downloadBlob } from "@/lib/export-archive";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

// jsPDF/autotable (~350 KB gz) und der Preview-Dialog werden erst on-demand geladen,
// damit das Dashboard nicht durch den PDF-Stack ausgebremst wird.
const PdfPreviewDialog = lazy(() =>
  import("@/components/PdfPreviewDialog").then((m) => ({ default: m.PdfPreviewDialog })),
);

export type { ExportConfiguration, ExportFormat, GroupingId, SortKey };

// Konstanten, Dateinamens-Logik und Vorschau-Panels liegen seit Sprint 05 in
// src/components/export/ — dieser Dialog bleibt reine Komposition + Ablaufsteuerung.
import {
  DEFAULTS,
  FORMAT_OPTIONS,
  GROUPING_OPTIONS,
  SORT_OPTIONS,
  sortLabel,
} from "@/components/export/export-options";
import {
  buildFileName,
  currentMonth,
  formatMonthLabel,
  loadPrefs,
  savePrefs,
} from "@/components/export/export-naming";
import { ExportSummaryPanels } from "@/components/export/ExportSummary";

/* ----------------------------- Komponente ------------------------------ */

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  workPackages: WorkPackage[];
  activities: Activity[];
  engineer: Engineer;
  onJsonBackup?: () => void;
}

export function ExportDialog({
  open,
  onOpenChange,
  projects,
  workPackages,
  activities,
  engineer,
  onJsonBackup,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>(DEFAULTS.format);
  const [month, setMonth] = useState<string>(currentMonth());
  const [clientId, setClientId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [grouping, setGrouping] = useState<GroupingId>(DEFAULTS.grouping);
  const [sorting, setSorting] = useState<SortKey[]>(DEFAULTS.sorting);

  // Manuell editierter Dateiname (null => automatisch generieren)
  const [fileNameOverride, setFileNameOverride] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  // PDF-Erzeugung
  const [loading, setLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<PdfPreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Beim Öffnen: gespeicherte Präferenzen laden, ansonsten Defaults
  useEffect(() => {
    if (!open) return;
    const p = loadPrefs();
    setFormat(p.format ?? DEFAULTS.format);
    setMonth(p.month ?? currentMonth());
    setClientId(p.clientId ?? "");
    setProjectId(p.projectId ?? "");
    setGrouping(p.grouping ?? DEFAULTS.grouping);
    setSorting(p.sorting?.length ? p.sorting : DEFAULTS.sorting);
    setFileNameOverride(null);
    setIsMaximized(false);
    setPdfError(null);
    setLoading(false);
  }, [open]);

  const clients = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => p.client && set.add(p.client));
    workPackages.forEach((w) => w.client && set.add(w.client));
    activities.forEach((a) => a.client && set.add(a.client));
    return Array.from(set).sort();
  }, [projects, workPackages, activities]);

  const projectChoices = useMemo(
    () => (clientId ? projects.filter((p) => p.client === clientId) : projects),
    [projects, clientId],
  );

  useEffect(() => {
    if (projectId && !projectChoices.some((p) => p.id === projectId)) {
      setProjectId("");
    }
  }, [projectId, projectChoices]);

  const clientName = clientId || undefined;
  const projectName = projectId ? projects.find((p) => p.id === projectId)?.name : undefined;

  const autoFileName = useMemo(
    () =>
      buildFileName({
        format,
        month,
        client: clientName,
        project: projectName,
      }),
    [format, month, clientName, projectName],
  );

  const fileName = fileNameOverride ?? autoFileName;

  const resetFileName = () => setFileNameOverride(null);

  const toggleSort = (k: SortKey) =>
    setSorting((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const moveSort = (idx: number, delta: number) =>
    setSorting((s) => {
      const j = idx + delta;
      if (j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

  const config: ExportConfiguration = {
    format,
    month,
    fileName,
    grouping,
    sorting,
    filter: {
      clientId: clientId || null,
      clientName: clientName ?? null,
      projectId: projectId || null,
      projectName: projectName ?? null,
    },
  };

  const exportData = useMemo(
    () => createExportDTO({ projects, workPackages, activities, engineer }, config),
    [projects, workPackages, activities, engineer, config],
  );

  const hasData = exportData.summary.activities > 0;

  const handlePrepare = async () => {
    savePrefs({ format, month, clientId, projectId, grouping, sorting });
    const periodLabel = formatMonthLabel(month);

    if (format !== "pdf") {
      if (!hasData) {
        setPdfError("Für den gewählten Zeitraum wurden keine Daten gefunden.");
        return;
      }
      try {
        const result = buildTextExport(format, {
          engineer,
          projects,
          workPackages,
          activities,
          exportData,
        });
        const baseName = fileNameOverride?.trim() || autoFileName;
        const finalName = withReportIdInFileName(baseName, result.reportId);
        // Download direkt anstoßen + im Downloadbereich registrieren
        downloadBlob(result.blob, finalName);
        await ExportDownloadService.addDownload({
          fileName: finalName,
          format,
          period: periodLabel,
          createdBy: engineer.name,
          reportId: result.reportId,
          blob: result.blob,
          status: "ready",
        });
        window.dispatchEvent(new CustomEvent("export-downloads:changed"));
        toast.success(
          `${format.toUpperCase()}-Export wurde erstellt und steht im Downloadbereich bereit.`,
        );
        onOpenChange(false);
      } catch (err) {
        logger.error("Text export failed", err, {
          module: "ExportDialog",
          action: "textExport",
          format,
        });
        const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
        setPdfError(`Export konnte nicht erzeugt werden: ${msg}`);
        try {
          await ExportDownloadService.addDownload({
            fileName: fileNameOverride?.trim() || autoFileName,
            format,
            period: periodLabel,
            createdBy: engineer.name,
            reportId: `FAIL-${Date.now()}`,
            blob: null,
            status: "failed",
            error: msg,
          });
          window.dispatchEvent(new CustomEvent("export-downloads:changed"));
        } catch {
          /* ignore */
        }
        toast.error(`${format.toUpperCase()}-Export konnte nicht erstellt werden.`);
      }
      return;
    }

    if (!hasData) {
      setPdfError("Für den gewählten Zeitraum wurden keine Daten gefunden.");
      return;
    }

    setPdfError(null);
    setLoading(true);
    try {
      // jsPDF wird hier dynamisch nachgeladen — der initiale Dashboard-Bundle
      // bleibt damit frei von ~350 KB PDF-Code.
      const { PdfExportService } = await import("@/lib/pdf-export");
      const preview = await PdfExportService.createPreview({
        engineer,
        projects,
        workPackages,
        activities,
        exportData,
      });
      // ggf. überschriebenen Dateinamen übernehmen
      if (fileNameOverride && fileNameOverride.trim()) {
        preview.fileName = fileNameOverride.trim().endsWith(".pdf")
          ? fileNameOverride.trim()
          : `${fileNameOverride.trim()}.pdf`;
      }
      setPdfPreview(preview);
      setPreviewOpen(true);
      onOpenChange(false);

      // Im Downloadbereich registrieren
      try {
        await ExportDownloadService.addDownload({
          fileName: preview.fileName,
          format: "pdf",
          period: periodLabel,
          createdBy: engineer.name,
          reportId: preview.metadata.reportId,
          blob: preview.blob,
          status: "ready",
        });
        window.dispatchEvent(new CustomEvent("export-downloads:changed"));
        toast.success("PDF-Report wurde erstellt und steht im Downloadbereich bereit.");
      } catch (archiveErr) {
        logger.warn("Export archive entry could not be saved", {
          module: "ExportDialog",
          action: "registerDownload",
          error: archiveErr instanceof Error ? archiveErr.message : String(archiveErr),
        });
      }
    } catch (err) {
      logger.error("PDF export failed", err, {
        module: "ExportDialog",
        action: "pdfExport",
      });
      setPdfError("PDF konnte nicht erzeugt werden.");
      try {
        await ExportDownloadService.addDownload({
          fileName: buildFileName({
            format: "pdf",
            month,
            client: exportData.configuration.filter.clientName ?? undefined,
            project: exportData.configuration.filter.projectName ?? undefined,
          }),
          format: "pdf",
          period: periodLabel,
          createdBy: engineer.name,
          reportId: `FAIL-${Date.now()}`,
          blob: null,
          status: "failed",
          error: err instanceof Error ? err.message : "Unbekannter Fehler",
        });
        window.dispatchEvent(new CustomEvent("export-downloads:changed"));
      } catch {
        /* ignore */
      }
      toast.error("PDF-Report konnte nicht erstellt werden.");
    } finally {
      setLoading(false);
    }
  };

  const availableSorts = SORT_OPTIONS.filter((o) => !sorting.includes(o.value));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={
            isMaximized
              ? "w-[95vw] max-w-[95vw] max-h-[95vh] overflow-y-auto"
              : "max-w-lg max-h-[90vh] overflow-y-auto"
          }
        >
          <button
            type="button"
            onClick={() => setIsMaximized((m) => !m)}
            className="absolute right-10 top-4 grid size-7 place-items-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label={isMaximized ? "Verkleinern" : "Vergrößern"}
            title={isMaximized ? "Verkleinern" : "Vergrößern"}
          >
            {isMaximized ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
          <DialogHeader>
            <DialogTitle>Export erstellen</DialogTitle>
            <DialogDescription>
              Wähle Format, Zeitraum, Gruppierung und Sortierung. Der Export wird in dieser
              Iteration ausschließlich in der Konsole protokolliert.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Format + Monat */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="export-format">
                  Format
                </label>
                <select
                  id="export-format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  {FORMAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="export-month">
                  Monat
                </label>
                <input
                  id="export-month"
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value || currentMonth())}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
              </div>
            </div>

            {/* Filter */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="export-client">
                  Kunde (optional)
                </label>
                <select
                  id="export-client"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">— Alle Kunden —</option>
                  {clients.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="export-project">
                  Projekt (optional)
                </label>
                <select
                  id="export-project"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">— Alle Projekte —</option>
                  {projectChoices.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dateiname (editierbar + Reset) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" htmlFor="export-filename">
                  Dateiname
                </label>
                <button
                  type="button"
                  onClick={resetFileName}
                  disabled={fileNameOverride === null}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                >
                  <RotateCcw className="size-3" /> Zurücksetzen
                </button>
              </div>
              <input
                id="export-filename"
                type="text"
                value={fileName}
                onChange={(e) => setFileNameOverride(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-xs"
              />
              {fileNameOverride !== null && (
                <p className="text-xs text-muted-foreground">
                  Manuell überschrieben — automatischer Vorschlag:{" "}
                  <span className="font-mono">{autoFileName}</span>
                </p>
              )}
            </div>

            {/* Gruppierung */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="export-grouping">
                Gruppierung
              </label>
              <select
                id="export-grouping"
                value={grouping}
                onChange={(e) => setGrouping(e.target.value as GroupingId)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {GROUPING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sortierung — Mehrfach, geordnet */}
            <div className="space-y-1.5">
              <span className="text-sm font-medium">Sortierung</span>
              <ul className="space-y-1">
                {sorting.length === 0 && (
                  <li className="text-xs italic text-muted-foreground">Keine Sortierung gewählt</li>
                )}
                {sorting.map((k, i) => (
                  <li
                    key={k}
                    className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-2 py-1 text-sm"
                  >
                    <span className="w-4 text-center font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="flex-1">{sortLabel(k)}</span>
                    <button
                      type="button"
                      aria-label="Nach oben"
                      disabled={i === 0}
                      onClick={() => moveSort(i, -1)}
                      className="grid size-6 place-items-center rounded hover:bg-secondary disabled:opacity-30"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Nach unten"
                      disabled={i === sorting.length - 1}
                      onClick={() => moveSort(i, 1)}
                      className="grid size-6 place-items-center rounded hover:bg-secondary disabled:opacity-30"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Entfernen"
                      onClick={() => toggleSort(k)}
                      className="grid size-6 place-items-center rounded hover:bg-destructive/20 hover:text-destructive"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              {availableSorts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {availableSorts.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleSort(opt.value)}
                      className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground transition hover:border-primary hover:text-foreground"
                    >
                      + {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Exportübersicht */}
            <ExportSummaryPanels
              format={format}
              month={month}
              clientName={clientName}
              projectName={projectName}
              fileName={fileName}
              grouping={grouping}
              sorting={sorting}
              exportData={exportData}
            />
          </div>

          {pdfError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {pdfError}
            </div>
          )}

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {onJsonBackup ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onJsonBackup();
                  onOpenChange(false);
                }}
              >
                Vollständiges JSON-Backup
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Abbrechen
              </Button>
              <Button onClick={handlePrepare} disabled={loading}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {format === "pdf" ? "PDF erzeugen" : "Export vorbereiten"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {previewOpen && (
        <Suspense fallback={null}>
          <PdfPreviewDialog
            open={previewOpen}
            onOpenChange={(o) => {
              setPreviewOpen(o);
              if (!o) setPdfPreview(null);
            }}
            preview={pdfPreview}
            onReconfigure={() => {
              setPdfPreview(null);
              onOpenChange(true);
            }}
          />
        </Suspense>
      )}
    </>
  );
}
