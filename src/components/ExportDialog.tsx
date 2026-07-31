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
import { Loader2, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import type { Activity, Engineer, Project, WorkPackage } from "@/lib/dashboard-data";
import type {
  ExportConfiguration,
  ExportFormat,
  GroupingId,
  SortKey,
} from "@/lib/export-data";
import { useExportDialog } from "@/hooks/useExportDialog";
import {
  FORMAT_OPTIONS,
  GROUPING_OPTIONS,
} from "@/components/export/export-options";
import { currentMonth } from "@/components/export/export-naming";
import { ExportSummaryPanels } from "@/components/export/ExportSummary";
import { ExportSortControls } from "@/components/export/ExportSortControls";

// jsPDF/autotable (~350 KB gz) und der Preview-Dialog werden erst on-demand geladen,
// damit das Dashboard nicht durch den PDF-Stack ausgebremst wird.
const PdfPreviewDialog = lazy(() =>
  import("@/components/PdfPreviewDialog").then((m) => ({ default: m.PdfPreviewDialog })),
);

export type { ExportConfiguration, ExportFormat, GroupingId, SortKey };

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

/**
 * Präsentationsschicht des Export-Dialogs.
 *
 * Die komplette Ablaufsteuerung (Zustand, Validierung, Datei- und
 * Downloaderzeugung, Fehler-/Wiederholungslogik) liegt in
 * `useExportDialog` (Sprint 05B).
 */
export function ExportDialog({
  open,
  onOpenChange,
  projects,
  workPackages,
  activities,
  engineer,
  onJsonBackup,
}: ExportDialogProps) {
  const ctrl = useExportDialog({
    open,
    onOpenChange,
    projects,
    workPackages,
    activities,
    engineer,
  });

  // Reine Präsentationszustände bleiben in der Komponente.
  const [isMaximized, setIsMaximized] = useState(false);
  useEffect(() => {
    if (open) setIsMaximized(false);
  }, [open]);

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
              Wähle Format, Zeitraum, Gruppierung und Sortierung. Der fertige Export steht
              anschließend im Downloadbereich bereit.
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
                  value={ctrl.format}
                  onChange={(e) => ctrl.setFormat(e.target.value as ExportFormat)}
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
                  value={ctrl.month}
                  onChange={(e) => ctrl.setMonth(e.target.value || currentMonth())}
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
                  value={ctrl.clientId}
                  onChange={(e) => ctrl.setClientId(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">— Alle Kunden —</option>
                  {ctrl.clients.map((c) => (
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
                  value={ctrl.projectId}
                  onChange={(e) => ctrl.setProjectId(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">— Alle Projekte —</option>
                  {ctrl.projectChoices.map((p) => (
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
                  onClick={ctrl.resetFileName}
                  disabled={ctrl.fileNameOverride === null}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                >
                  <RotateCcw className="size-3" /> Zurücksetzen
                </button>
              </div>
              <input
                id="export-filename"
                type="text"
                value={ctrl.fileName}
                onChange={(e) => ctrl.setFileNameOverride(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-xs"
              />
              {ctrl.fileNameOverride !== null && (
                <p className="text-xs text-muted-foreground">
                  Manuell überschrieben — automatischer Vorschlag:{" "}
                  <span className="font-mono">{ctrl.autoFileName}</span>
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
                value={ctrl.grouping}
                onChange={(e) => ctrl.setGrouping(e.target.value as GroupingId)}
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
            <ExportSortControls
              sorting={ctrl.sorting}
              availableSorts={ctrl.availableSorts}
              onToggle={ctrl.toggleSort}
              onMove={ctrl.moveSort}
            />

            {/* Exportübersicht */}
            <ExportSummaryPanels
              format={ctrl.format}
              month={ctrl.month}
              clientName={ctrl.clientName}
              projectName={ctrl.projectName}
              fileName={ctrl.fileName}
              grouping={ctrl.grouping}
              sorting={ctrl.sorting}
              exportData={ctrl.exportData}
            />
          </div>

          {ctrl.error && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <span>{ctrl.error}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void ctrl.retryExport()}
                disabled={ctrl.loading}
              >
                Erneut versuchen
              </Button>
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
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={ctrl.loading}>
                Abbrechen
              </Button>
              <Button onClick={() => void ctrl.startExport()} disabled={ctrl.loading}>
                {ctrl.loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {ctrl.format === "pdf" ? "PDF erzeugen" : "Export vorbereiten"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ctrl.previewOpen && (
        <Suspense fallback={null}>
          <PdfPreviewDialog
            open={ctrl.previewOpen}
            onOpenChange={ctrl.closePreview}
            preview={ctrl.pdfPreview}
            onReconfigure={ctrl.reconfigure}
          />
        </Suspense>
      )}
    </>
  );
}
