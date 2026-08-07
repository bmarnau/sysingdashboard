/**
 * useExportDialog — Ablaufsteuerung des Export-Dialogs (Sprint 05B).
 *
 * Kapselt vollständig:
 *  - Initialisierung des Exportzustands (Präferenzen, Defaults)
 *  - Auswahl von Format, Zeitraum, Filter, Gruppierung, Sortierung
 *  - Validierung (Datenverfügbarkeit)
 *  - Dateinamensbildung inkl. manueller Übersteuerung
 *  - Start/Abschluss eines Exports (Text/CSV/JSON und PDF)
 *  - Downloadregistrierung im Downloadbereich
 *  - Fortschritts- und Fehlerzustand, Wiederholungslogik
 *  - Aufräumen temporärer Zustände
 *
 * `src/components/ExportDialog.tsx` bleibt damit reine Präsentation.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Activity, Engineer, Project, WorkPackage } from "@/lib/dashboard-data";
import {
  createExportDTO,
  type ExportConfiguration,
  type ExportFormat,
  type GroupingId,
  type SortKey,
} from "@/lib/export-data";
import type { PdfPreview } from "@/lib/pdf-export";
import { ExportDownloadService } from "@/lib/export-download-service";
import { buildTextExport, withReportIdInFileName } from "@/lib/text-export";
import { downloadBlob } from "@/lib/export-archive";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { DEFAULTS, SORT_OPTIONS } from "@/components/export/export-options";
import {
  buildFileName,
  currentMonth,
  formatMonthLabel,
  loadPrefs,
  savePrefs,
} from "@/components/export/export-naming";

export interface UseExportDialogArgs {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  workPackages: WorkPackage[];
  activities: Activity[];
  engineer: Engineer;
}

const NO_DATA_MESSAGE = "Für den gewählten Zeitraum wurden keine Daten gefunden.";

function notifyDownloadsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("export-downloads:changed"));
}

export function useExportDialog({
  open,
  onOpenChange,
  projects,
  workPackages,
  activities,
  engineer,
}: UseExportDialogArgs) {
  const [format, setFormat] = useState<ExportFormat>(DEFAULTS.format);
  const [month, setMonth] = useState<string>(currentMonth());
  const [clientId, setClientId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [grouping, setGrouping] = useState<GroupingId>(DEFAULTS.grouping);
  const [sorting, setSorting] = useState<SortKey[]>(DEFAULTS.sorting);

  // Manuell editierter Dateiname (null => automatisch generieren)
  const [fileNameOverride, setFileNameOverride] = useState<string | null>(null);

  // Ablaufzustand
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
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
    () => buildFileName({ format, month, client: clientName, project: projectName }),
    [format, month, clientName, projectName],
  );

  const fileName = fileNameOverride ?? autoFileName;

  const config: ExportConfiguration = useMemo(
    () => ({
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
    }),
    [format, month, fileName, grouping, sorting, clientId, clientName, projectId, projectName],
  );

  const exportData = useMemo(
    () => createExportDTO({ projects, workPackages, activities, engineer }, config),
    [projects, workPackages, activities, engineer, config],
  );

  const hasData = exportData.summary.activities > 0;

  const availableSorts = useMemo(
    () => SORT_OPTIONS.filter((o) => !sorting.includes(o.value)),
    [sorting],
  );

  const resetFileName = useCallback(() => setFileNameOverride(null), []);

  const toggleSort = useCallback(
    (k: SortKey) => setSorting((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k])),
    [],
  );

  const moveSort = useCallback(
    (idx: number, delta: number) =>
      setSorting((s) => {
        const j = idx + delta;
        if (j < 0 || j >= s.length) return s;
        const next = [...s];
        [next[idx], next[j]] = [next[j], next[idx]];
        return next;
      }),
    [],
  );

  /** Fehlgeschlagenen Export im Downloadbereich protokollieren (best effort). */
  const registerFailure = useCallback(
    async (name: string, periodLabel: string, fmt: ExportFormat, message: string) => {
      try {
        await ExportDownloadService.addDownload({
          fileName: name,
          format: fmt,
          period: periodLabel,
          createdBy: engineer.name,
          reportId: `FAIL-${Date.now()}`,
          blob: null,
          status: "failed",
          error: message,
        });
        notifyDownloadsChanged();
      } catch (registerErr) {
        logger.warn("Failed export could not be registered", {
          module: "useExportDialog",
          action: "registerFailure",
          reason: registerErr instanceof Error ? registerErr.message : String(registerErr),
        });
      }
    },
    [engineer.name],
  );

  const runTextExport = useCallback(
    async (periodLabel: string) => {
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
        notifyDownloadsChanged();
        toast.success(
          `${format.toUpperCase()}-Export wurde erstellt und steht im Downloadbereich bereit.`,
        );
        onOpenChange(false);
      } catch (err) {
        logger.error("Text export failed", err, {
          module: "useExportDialog",
          action: "textExport",
          format,
        });
        const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
        setError(`Export konnte nicht erzeugt werden: ${msg}`);
        await registerFailure(fileNameOverride?.trim() || autoFileName, periodLabel, format, msg);
        toast.error(`${format.toUpperCase()}-Export konnte nicht erstellt werden.`);
      }
    },
    [
      activities,
      autoFileName,
      engineer,
      exportData,
      fileNameOverride,
      format,
      onOpenChange,
      projects,
      registerFailure,
      workPackages,
    ],
  );

  const runPdfExport = useCallback(
    async (periodLabel: string) => {
      setLoading(true);
      try {
        // jsPDF wird dynamisch nachgeladen — der Dashboard-Bundle bleibt frei
        // von ~350 KB PDF-Code.
        const { PdfExportService } = await import("@/lib/pdf-export");
        const preview = await PdfExportService.createPreview({
          engineer,
          projects,
          workPackages,
          activities,
          exportData,
        });
        if (fileNameOverride && fileNameOverride.trim()) {
          const trimmed = fileNameOverride.trim();
          preview.fileName = trimmed.endsWith(".pdf") ? trimmed : `${trimmed}.pdf`;
        }
        setPdfPreview(preview);
        setPreviewOpen(true);
        onOpenChange(false);

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
          notifyDownloadsChanged();
          toast.success("PDF-Report wurde erstellt und steht im Downloadbereich bereit.");
        } catch (archiveErr) {
          logger.warn("Export archive entry could not be saved", {
            module: "useExportDialog",
            action: "registerDownload",
            reason: archiveErr instanceof Error ? archiveErr.message : String(archiveErr),
          });
        }
      } catch (err) {
        logger.error("PDF export failed", err, {
          module: "useExportDialog",
          action: "pdfExport",
        });
        setError("PDF konnte nicht erzeugt werden.");
        await registerFailure(
          buildFileName({
            format: "pdf",
            month,
            client: exportData.configuration.filter.clientName ?? undefined,
            project: exportData.configuration.filter.projectName ?? undefined,
          }),
          periodLabel,
          "pdf",
          err instanceof Error ? err.message : "Unbekannter Fehler",
        );
        toast.error("PDF-Report konnte nicht erstellt werden.");
      } finally {
        setLoading(false);
      }
    },
    [
      activities,
      engineer,
      exportData,
      fileNameOverride,
      month,
      onOpenChange,
      projects,
      registerFailure,
      workPackages,
    ],
  );

  /** Startet den Export für das aktuell gewählte Format. */
  const startExport = useCallback(async () => {
    savePrefs({ format, month, clientId, projectId, grouping, sorting });
    const periodLabel = formatMonthLabel(month);

    if (!hasData) {
      setError(NO_DATA_MESSAGE);
      return;
    }
    setError(null);

    if (format !== "pdf") {
      await runTextExport(periodLabel);
      return;
    }
    await runPdfExport(periodLabel);
  }, [clientId, format, grouping, hasData, month, projectId, runPdfExport, runTextExport, sorting]);

  /** Wiederholung nach Fehler — setzt den Fehlerzustand zurück. */
  const retryExport = useCallback(async () => {
    setError(null);
    await startExport();
  }, [startExport]);

  /** Temporäre Zustände nach Abschluss der Vorschau aufräumen. */
  const closePreview = useCallback((nextOpen: boolean) => {
    setPreviewOpen(nextOpen);
    if (!nextOpen) setPdfPreview(null);
  }, []);

  const reconfigure = useCallback(() => {
    setPdfPreview(null);
    setPreviewOpen(false);
    onOpenChange(true);
  }, [onOpenChange]);

  return {
    // Zustand
    format,
    month,
    clientId,
    projectId,
    grouping,
    sorting,
    fileName,
    autoFileName,
    fileNameOverride,
    loading,
    error,
    pdfPreview,
    previewOpen,
    // Ableitungen
    clients,
    projectChoices,
    clientName,
    projectName,
    exportData,
    hasData,
    availableSorts,
    // Aktionen
    setFormat,
    setMonth,
    setClientId,
    setProjectId,
    setGrouping,
    setFileNameOverride,
    resetFileName,
    toggleSort,
    moveSort,
    startExport,
    retryExport,
    closePreview,
    reconfigure,
  };
}

export type ExportDialogController = ReturnType<typeof useExportDialog>;
