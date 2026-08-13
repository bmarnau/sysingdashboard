/**
 * Berichtsdialog (Sprint 09A).
 *
 * Reine Präsentationsschicht: Auswahl von Bericht, Umfang und Format,
 * Erzeugung über die Reporting-Fassade und Ablage im Downloadbereich.
 * Fachlogik und Layout liegen ausschließlich in `@/lib/report`.
 */
import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAvkkManagement } from "@/hooks/useAvkkManagement";
import { ranksOf, useReferenceData } from "@/hooks/useReferenceData";
import { CATALOG_KEYS } from "@/lib/reference-data";
import type { AvkkTask } from "@/lib/avkk/workspace";
import type { Project, WorkPackage } from "@/lib/dashboard-data";
import { ExportDownloadService } from "@/lib/export-download-service";
import { downloadBlob } from "@/lib/export-archive";
import { logger } from "@/lib/logger";
import {
  listAvailableReports,
  renderReport,
  REPORT_FORMAT_LABEL,
  type AvkkReportInput,
  type ReportFormat,
} from "@/lib/report";
import { inputCls } from "@/components/dashboard/constants";

const CATALOG_LIST = Object.values(CATALOG_KEYS);
const CRITICAL_SEVERITY_RANK = 3;

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: readonly AvkkTask[];
  projects: readonly Project[];
  workPackages: readonly WorkPackage[];
}

export function ReportDialog({
  open,
  onOpenChange,
  tasks,
  projects,
  workPackages,
}: ReportDialogProps) {
  const user = useCurrentUser();
  const catalogs = useReferenceData(CATALOG_LIST);

  const dimensionKeys = useMemo(
    () =>
      (catalogs.values[CATALOG_KEYS.competenceDimension] ?? [])
        .filter((v) => v.isActive)
        .map((v) => v.key),
    [catalogs.values],
  );
  const severityRanks = useMemo(
    () => ranksOf(catalogs.values[CATALOG_KEYS.consequenceSeverity]),
    [catalogs.values],
  );

  const avkk = useAvkkManagement({
    tasks,
    dimensionKeys,
    severityRanks,
    criticalRank: CRITICAL_SEVERITY_RANK,
    personId: user?.id ?? null,
    enabled: open && !catalogs.loading,
  });

  const reports = useMemo(() => listAvailableReports(user), [user]);
  const [reportId, setReportId] = useState("");
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (open && !reportId && reports.length) setReportId(reports[0].reportId);
  }, [open, reportId, reports]);

  const definition = reports.find((r) => r.reportId === reportId) ?? null;
  const needsProject = definition?.reportId === "avkk-project";

  useEffect(() => {
    if (definition && !definition.formats.includes(format)) setFormat(definition.formats[0]);
  }, [definition, format]);

  async function run(action: "download" | "print") {
    if (!definition) return;
    setBusy(true);
    setStatus(null);
    try {
      const effectiveFormat: ReportFormat = action === "print" ? "print" : format;
      const project = projects.find((p) => p.id === projectId) ?? null;
      const input: AvkkReportInput = {
        rows: avkk.rows,
        projects,
        workPackages,
        projectId: needsProject ? (projectId || null) : null,
        personId: user?.id ?? null,
        scopeLabel: needsProject
          ? (project?.name ?? "Alle Projekte")
          : definition.reportId === "avkk-personal"
            ? "Eigene Aufgaben"
            : "Gesamtes Portfolio",
      };

      const result = await renderReport({
        reportId: definition.reportId,
        format: effectiveFormat,
        input,
        context: {
          actor: {
            id: user?.id ?? null,
            displayName: user ? `${user.firstName} ${user.lastName}`.trim() : "Unbekannt",
            role: user?.role ?? "viewer",
          },
          generatedAt: new Date(),
          period: needsProject ? (project?.name ?? "") : "",
        },
      });

      if (action === "print" && result.html) {
        const win = window.open("", "_blank", "width=1024,height=768");
        if (!win) {
          setStatus("Das Druckfenster wurde vom Browser blockiert.");
          return;
        }
        win.document.write(result.html);
        win.document.close();
        win.focus();
        win.print();
        setStatus("Druckansicht geöffnet.");
        return;
      }

      await ExportDownloadService.addDownload({
        fileName: result.fileName,
        format: result.format,
        period: result.metadata.period || "aktueller Stand",
        createdBy: result.metadata.createdBy,
        reportId: result.metadata.reportId,
        blob: result.blob,
      });
      downloadBlob(result.blob, result.fileName);
      setStatus(`${result.fileName} erstellt und im Downloadbereich abgelegt.`);
    } catch (error) {
      logger.error("report.render.failed", {
        reportId,
        format,
        message: error instanceof Error ? error.message : String(error),
      });
      setStatus(error instanceof Error ? error.message : "Bericht konnte nicht erzeugt werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4" aria-hidden /> Berichte
          </DialogTitle>
          <DialogDescription>
            Berichte werden aus dem aktuellen AVKK-Stand erzeugt. Sie enthalten bewusst keine
            personenbezogenen Ranglisten oder Leistungsbewertungen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="report-select" className="text-xs text-muted-foreground">
              Bericht
            </label>
            <select
              id="report-select"
              className={inputCls}
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
            >
              {reports.map((r) => (
                <option key={r.reportId} value={r.reportId}>
                  {r.title}
                </option>
              ))}
            </select>
            {definition && (
              <p className="text-xs text-muted-foreground">{definition.description}</p>
            )}
          </div>

          {needsProject && (
            <div className="space-y-1.5">
              <label htmlFor="report-project" className="text-xs text-muted-foreground">
                Projekt
              </label>
              <select
                id="report-project"
                className={inputCls}
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">Alle Projekte</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="report-format" className="text-xs text-muted-foreground">
              Format
            </label>
            <select
              id="report-format"
              className={inputCls}
              value={format}
              onChange={(e) => setFormat(e.target.value as ReportFormat)}
            >
              {(definition?.formats ?? []).map((f) => (
                <option key={f} value={f}>
                  {REPORT_FORMAT_LABEL[f]}
                </option>
              ))}
            </select>
          </div>

          {avkk.error && <p className="text-xs text-destructive">{avkk.error}</p>}
          {status && <p className="text-xs text-muted-foreground">{status}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => run("print")} disabled={busy || avkk.loading}>
            <Printer className="mr-2 size-4" aria-hidden /> Drucken
          </Button>
          <Button onClick={() => run("download")} disabled={busy || avkk.loading || !definition}>
            {busy ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            ) : (
              <Download className="mr-2 size-4" aria-hidden />
            )}
            Bericht erzeugen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
