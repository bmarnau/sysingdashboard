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
import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";

export type ExportFormat = "pdf" | "json" | "csv" | "azure-table";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  workPackages: WorkPackage[];
  activities: Activity[];
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; ext: string }[] = [
  { value: "pdf", label: "PDF", ext: "pdf" },
  { value: "json", label: "JSON", ext: "json" },
  { value: "csv", label: "CSV", ext: "csv" },
  { value: "azure-table", label: "Azure Table", ext: "json" },
];

const DEFAULT_GROUPING = ["Kunde", "Projekt", "Arbeitspaket", "Tätigkeit"];
const DEFAULT_SORTING = ["Datum aufsteigend", "Projekt", "Arbeitspaket"];

function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function buildFileName(opts: {
  format: ExportFormat;
  month: string; // YYYY-MM
  client?: string;
  project?: string;
}): string {
  const fmt = FORMAT_OPTIONS.find((f) => f.value === opts.format)!;
  const ts = timestamp();
  const client = slugify(opts.client ?? "");
  const project = slugify(opts.project ?? "");
  const base =
    client && project
      ? `${client}_${project}_${opts.month}_${opts.format}_${ts}`
      : `export_${opts.month}_${opts.format}_${ts}`;
  return `${base}.${fmt.ext}`;
}

export function ExportDialog({
  open,
  onOpenChange,
  projects,
  workPackages,
  activities,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [month, setMonth] = useState<string>(currentMonth());

  // Beim Öffnen Standardwerte zurücksetzen
  useEffect(() => {
    if (open) {
      setFormat("pdf");
      setMonth(currentMonth());
    }
  }, [open]);

  // Kunde/Projekt aus den Tätigkeiten des Monats ableiten — nur eindeutig setzen
  const { suggestedClient, suggestedProject } = useMemo(() => {
    const inMonth = activities.filter((a) => a.date?.startsWith(month));
    const clients = new Set(inMonth.map((a) => a.client).filter(Boolean) as string[]);
    const projectIds = new Set(
      inMonth
        .map((a) => workPackages.find((w) => w.id === a.workPackageId)?.projectId)
        .filter(Boolean) as string[],
    );
    const client = clients.size === 1 ? Array.from(clients)[0] : undefined;
    const projectName =
      projectIds.size === 1
        ? projects.find((p) => p.id === Array.from(projectIds)[0])?.name
        : undefined;
    return { suggestedClient: client, suggestedProject: projectName };
  }, [activities, workPackages, projects, month]);

  const fileName = useMemo(
    () =>
      buildFileName({
        format,
        month,
        client: suggestedClient,
        project: suggestedProject,
      }),
    [format, month, suggestedClient, suggestedProject],
  );

  const handlePrepare = () => {
    const options = {
      format,
      month,
      fileName,
      grouping: DEFAULT_GROUPING,
      sorting: DEFAULT_SORTING,
      suggestedClient: suggestedClient ?? null,
      suggestedProject: suggestedProject ?? null,
    };
    // eslint-disable-next-line no-console
    console.log("[Export] Vorbereitete Exportoptionen:", options);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export erstellen</DialogTitle>
          <DialogDescription>
            Wähle Format und Zeitraum. Der Export wird in dieser Version nur in der Konsole protokolliert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="export-format">
              Exportformat
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

          <div className="space-y-1.5">
            <span className="text-sm font-medium">Vorgeschlagener Dateiname</span>
            <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 font-mono text-xs break-all">
              {fileName}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="text-sm font-medium">Gruppierung</span>
              <p className="text-xs text-muted-foreground">
                {DEFAULT_GROUPING.join(" → ")}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium">Sortierung</span>
              <p className="text-xs text-muted-foreground">
                {DEFAULT_SORTING.join(", ")}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handlePrepare}>Export vorbereiten</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
