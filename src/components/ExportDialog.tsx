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
import { PdfExportService, type PdfPreview } from "@/lib/pdf-export";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";

export type { ExportConfiguration, ExportFormat, GroupingId, SortKey };




/* ----------------------------- Konstanten ------------------------------ */

const FORMAT_OPTIONS: { value: ExportFormat; label: string; ext: string }[] = [
  { value: "pdf", label: "PDF", ext: "pdf" },
  { value: "json", label: "JSON", ext: "json" },
  { value: "csv", label: "CSV", ext: "csv" },
  { value: "azure-table", label: "Azure Table (NDJSON)", ext: "ndjson" },
];

const GROUPING_OPTIONS: { value: GroupingId; label: string }[] = [
  { value: "customer-project-workpackage-task", label: "Kunde → Projekt → Arbeitspaket → Tätigkeit" },
  { value: "project-workpackage-task", label: "Projekt → Arbeitspaket → Tätigkeit" },
  { value: "employee-project-task", label: "Mitarbeiter → Projekt → Tätigkeit" },
  { value: "customer-month-project", label: "Kunde → Monat → Projekt" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date", label: "Datum aufsteigend" },
  { value: "date-desc", label: "Datum absteigend" },
  { value: "project", label: "Projektname" },
  { value: "customer", label: "Kunde" },
  { value: "employee", label: "Mitarbeiter" },
  { value: "duration", label: "Dauer" },
];

const sortLabel = (k: SortKey) => SORT_OPTIONS.find((o) => o.value === k)?.label ?? k;
const groupingLabel = (g: GroupingId) =>
  GROUPING_OPTIONS.find((o) => o.value === g)?.label ?? g;

const DEFAULTS = {
  format: "pdf" as ExportFormat,
  grouping: "customer-project-workpackage-task" as GroupingId,
  sorting: ["date"] as SortKey[],
};

const PREFS_KEY = "engineer-dashboard:export-prefs";

const MONTH_NAMES_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

/* ------------------------------ Helpers -------------------------------- */

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

function formatMonthLabel(m: string): string {
  const [y, mm] = m.split("-").map(Number);
  if (!y || !mm) return m;
  return `${MONTH_NAMES_DE[mm - 1]} ${y}`;
}

function buildFileName(opts: {
  format: ExportFormat;
  month: string;
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
      : client
        ? `${client}_${opts.month}_${opts.format}_${ts}`
        : project
          ? `${project}_${opts.month}_${opts.format}_${ts}`
          : `export_${opts.month}_${opts.format}_${ts}`;
  return `${base}.${fmt.ext}`;
}

interface StoredPrefs {
  format: ExportFormat;
  month: string;
  clientId: string;
  projectId: string;
  grouping: GroupingId;
  sorting: SortKey[];
}

function loadPrefs(): Partial<StoredPrefs> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as Partial<StoredPrefs>) : {};
  } catch {
    return {};
  }
}

function savePrefs(p: StoredPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

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
    () =>
      createExportDTO(
        { projects, workPackages, activities, engineer },
        config,
      ),
    [projects, workPackages, activities, engineer, config],
  );

  const hasData = exportData.summary.activities > 0;

  const handlePrepare = async () => {
    savePrefs({ format, month, clientId, projectId, grouping, sorting });

    if (format !== "pdf") {
      // CSV / JSON / Azure folgen in späteren Schritten
      // eslint-disable-next-line no-console
      console.log("[Export] Format noch nicht implementiert:", format, exportData);
      onOpenChange(false);
      return;
    }

    if (!hasData) {
      setPdfError("Für den gewählten Zeitraum wurden keine Daten gefunden.");
      return;
    }

    setPdfError(null);
    setLoading(true);
    try {
      // Async, damit UI nicht blockiert (yield)
      await new Promise((r) => setTimeout(r, 0));
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
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[Export] PDF-Erzeugung fehlgeschlagen:", err);
      setPdfError("PDF konnte nicht erzeugt werden.");
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
              <label className="text-sm font-medium" htmlFor="export-format">Format</label>
              <select
                id="export-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as ExportFormat)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="export-month">Monat</label>
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
              <label className="text-sm font-medium" htmlFor="export-client">Kunde (optional)</label>
              <select
                id="export-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">— Alle Kunden —</option>
                {clients.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="export-project">Projekt (optional)</label>
              <select
                id="export-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">— Alle Projekte —</option>
                {projectChoices.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dateiname (editierbar + Reset) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor="export-filename">Dateiname</label>
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
            <label className="text-sm font-medium" htmlFor="export-grouping">Gruppierung</label>
            <select
              id="export-grouping"
              value={grouping}
              onChange={(e) => setGrouping(e.target.value as GroupingId)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              {GROUPING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                  <span className="w-4 text-center font-mono text-xs text-muted-foreground">{i + 1}</span>
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
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="mb-2 text-sm font-semibold">Exportübersicht</p>
            <dl className="grid grid-cols-[7rem_1fr] gap-y-1 text-xs">
              <dt className="text-muted-foreground">Format</dt>
              <dd>{FORMAT_OPTIONS.find((f) => f.value === format)?.label}</dd>
              <dt className="text-muted-foreground">Monat</dt>
              <dd>{formatMonthLabel(month)}</dd>
              <dt className="text-muted-foreground">Kunde</dt>
              <dd>{clientName ?? <span className="text-muted-foreground italic">alle</span>}</dd>
              <dt className="text-muted-foreground">Projekt</dt>
              <dd>{projectName ?? <span className="text-muted-foreground italic">alle</span>}</dd>
              <dt className="text-muted-foreground">Dateiname</dt>
              <dd className="font-mono break-all">{fileName}</dd>
              <dt className="text-muted-foreground">Gruppierung</dt>
              <dd>{groupingLabel(grouping)}</dd>
              <dt className="text-muted-foreground">Sortierung</dt>
              <dd>
                {sorting.length === 0
                  ? <span className="italic text-muted-foreground">keine</span>
                  : sorting.map(sortLabel).join(" → ")}
              </dd>
            </dl>
          </div>

          {/* Export Vorschau */}
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
            <p className="mb-2 text-sm font-semibold">Export Vorschau</p>
            <dl className="grid grid-cols-[10rem_1fr] gap-y-1 text-xs">
              <dt className="text-muted-foreground">Kunden</dt>
              <dd>{exportData.summary.customers}</dd>
              <dt className="text-muted-foreground">Projekte</dt>
              <dd>{exportData.summary.projects}</dd>
              <dt className="text-muted-foreground">Arbeitspakete</dt>
              <dd>{exportData.summary.workPackages}</dd>
              <dt className="text-muted-foreground">Tätigkeiten</dt>
              <dd>{exportData.summary.activities}</dd>
              <dt className="text-muted-foreground">Zeitbuchungen</dt>
              <dd>{exportData.summary.timeEntries}</dd>
              <dt className="text-muted-foreground">Gesamtstunden</dt>
              <dd>{formatHours(exportData.summary.totalHours)} h</dd>
              <dt className="text-muted-foreground">Abrechnungsfähig</dt>
              <dd>{formatHours(exportData.summary.billableHours)} h</dd>
              <dt className="text-muted-foreground">Nicht abrechnungsfähig</dt>
              <dd>{formatHours(exportData.summary.nonBillableHours)} h</dd>
              <dt className="text-muted-foreground">Gesamtbetrag</dt>
              <dd className="font-semibold">{formatCurrency(exportData.summary.totalAmount)}</dd>
            </dl>
            {exportData.groups.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                  Gruppierungs-Baum anzeigen ({exportData.groups.length} Knoten auf Top-Ebene)
                </summary>
                <ul className="mt-2 space-y-0.5 text-xs">
                  {exportData.groups.map((g) => (
                    <GroupNode key={g.key} node={g} depth={0} />
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>

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
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button onClick={handlePrepare}>Export vorbereiten</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------ Formatter & Subkomponente ----------------------- */

const HOURS_FMT = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const CURRENCY_FMT = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

function formatHours(h: number): string {
  return HOURS_FMT.format(h);
}

function formatCurrency(n: number): string {
  return CURRENCY_FMT.format(n);
}



function GroupNode({ node, depth }: { node: ExportGroupNode; depth: number }) {
  return (
    <li>
      <div
        className="flex items-baseline gap-2"
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        <span className="truncate font-medium">{node.label}</span>
        <span className="ml-auto whitespace-nowrap text-muted-foreground">
          {formatHours(node.hours)} h · {formatCurrency(node.amount)}
        </span>
      </div>
      {node.children.length > 0 && (
        <ul className="space-y-0.5">
          {node.children.map((c) => (
            <GroupNode key={c.key} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
