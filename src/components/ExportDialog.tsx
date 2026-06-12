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
import { ChevronDown, ChevronUp, X } from "lucide-react";
import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";

export type ExportFormat = "pdf" | "json" | "csv" | "azure-table";

const FORMAT_OPTIONS: { value: ExportFormat; label: string; ext: string }[] = [
  { value: "pdf", label: "PDF", ext: "pdf" },
  { value: "json", label: "JSON", ext: "json" },
  { value: "csv", label: "CSV", ext: "csv" },
  { value: "azure-table", label: "Azure Table (NDJSON)", ext: "ndjson" },
];

export type GroupKey = "Kunde" | "Projekt" | "Arbeitspaket" | "Tätigkeit";
export type SortKey =
  | "Datum aufsteigend"
  | "Datum absteigend"
  | "Projekt"
  | "Arbeitspaket"
  | "Kunde"
  | "Dauer";

const ALL_GROUPS: GroupKey[] = ["Kunde", "Projekt", "Arbeitspaket", "Tätigkeit"];
const ALL_SORTS: SortKey[] = [
  "Datum aufsteigend",
  "Datum absteigend",
  "Projekt",
  "Arbeitspaket",
  "Kunde",
  "Dauer",
];

const DEFAULTS = {
  grouping: ["Kunde", "Projekt", "Arbeitspaket", "Tätigkeit"] as GroupKey[],
  sorting: ["Datum aufsteigend", "Projekt", "Arbeitspaket"] as SortKey[],
};

const PREFS_KEY = "engineer-dashboard:export-prefs";

interface StoredPrefs {
  format: ExportFormat;
  month: string;
  clientId: string | "";
  projectId: string | "";
  grouping: GroupKey[];
  sorting: SortKey[];
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  workPackages: WorkPackage[];
  activities: Activity[];
  /** Optionaler Sofort-Trigger für JSON-Backup (full state). */
  onJsonBackup?: () => void;
}

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

export function ExportDialog({
  open,
  onOpenChange,
  projects,
  workPackages,
  activities,
  onJsonBackup,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [month, setMonth] = useState<string>(currentMonth());
  const [clientId, setClientId] = useState<string>(""); // "" = alle
  const [projectId, setProjectId] = useState<string>(""); // "" = alle
  const [grouping, setGrouping] = useState<GroupKey[]>(DEFAULTS.grouping);
  const [sorting, setSorting] = useState<SortKey[]>(DEFAULTS.sorting);

  // Beim Öffnen: gespeicherte Präferenzen laden, ansonsten Defaults
  useEffect(() => {
    if (!open) return;
    const p = loadPrefs();
    setFormat(p.format ?? "pdf");
    setMonth(p.month ?? currentMonth());
    setClientId(p.clientId ?? "");
    setProjectId(p.projectId ?? "");
    setGrouping(p.grouping?.length ? p.grouping : DEFAULTS.grouping);
    setSorting(p.sorting?.length ? p.sorting : DEFAULTS.sorting);
  }, [open]);

  // Kundenliste aus Projekten + Tätigkeiten + Arbeitspaketen, unique
  const clients = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => p.client && set.add(p.client));
    workPackages.forEach((w) => w.client && set.add(w.client));
    activities.forEach((a) => a.client && set.add(a.client));
    return Array.from(set).sort();
  }, [projects, workPackages, activities]);

  // Projekte ggf. auf gewählten Kunden filtern
  const projectChoices = useMemo(
    () => (clientId ? projects.filter((p) => p.client === clientId) : projects),
    [projects, clientId],
  );

  // Wenn Kunde geändert wird und das gewählte Projekt nicht passt → zurücksetzen
  useEffect(() => {
    if (projectId && !projectChoices.some((p) => p.id === projectId)) {
      setProjectId("");
    }
  }, [projectId, projectChoices]);

  const clientName = clientId || undefined;
  const projectName = projectId ? projects.find((p) => p.id === projectId)?.name : undefined;

  const fileName = useMemo(
    () =>
      buildFileName({
        format,
        month,
        client: clientName,
        project: projectName,
      }),
    [format, month, clientName, projectName],
  );

  const moveItem = <T,>(arr: T[], idx: number, delta: number): T[] => {
    const next = [...arr];
    const j = idx + delta;
    if (j < 0 || j >= next.length) return arr;
    [next[idx], next[j]] = [next[j], next[idx]];
    return next;
  };

  const removeGroup = (k: GroupKey) => setGrouping((g) => g.filter((x) => x !== k));
  const addGroup = (k: GroupKey) =>
    setGrouping((g) => (g.includes(k) ? g : [...g, k]));
  const removeSort = (k: SortKey) => setSorting((s) => s.filter((x) => x !== k));
  const addSort = (k: SortKey) => setSorting((s) => (s.includes(k) ? s : [...s, k]));

  const handlePrepare = () => {
    const options = {
      format,
      month,
      fileName,
      filter: {
        clientId: clientId || null,
        clientName: clientName ?? null,
        projectId: projectId || null,
        projectName: projectName ?? null,
      },
      grouping,
      sorting,
    };
    savePrefs({ format, month, clientId, projectId, grouping, sorting });
    // eslint-disable-next-line no-console
    console.log("[Export] Vorbereitete Exportoptionen:", options);
    onOpenChange(false);
  };

  const availableGroups = ALL_GROUPS.filter((g) => !grouping.includes(g));
  const availableSorts = ALL_SORTS.filter((s) => !sorting.includes(s));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export erstellen</DialogTitle>
          <DialogDescription>
            Wähle Format, Zeitraum und optionale Filter. In dieser Iteration werden die
            Optionen in der Konsole protokolliert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
          </div>

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

          <div className="space-y-1.5">
            <span className="text-sm font-medium">Vorgeschlagener Dateiname</span>
            <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 font-mono text-xs break-all">
              {fileName}
            </div>
          </div>

          <OrderedList
            label="Gruppierung"
            items={grouping}
            available={availableGroups}
            onMove={(i, d) => setGrouping((g) => moveItem(g, i, d))}
            onRemove={(k) => removeGroup(k as GroupKey)}
            onAdd={(k) => addGroup(k as GroupKey)}
          />

          <OrderedList
            label="Sortierung"
            items={sorting}
            available={availableSorts}
            onMove={(i, d) => setSorting((s) => moveItem(s, i, d))}
            onRemove={(k) => removeSort(k as SortKey)}
            onAdd={(k) => addSort(k as SortKey)}
          />
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
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button onClick={handlePrepare}>Export vorbereiten</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface OrderedListProps {
  label: string;
  items: string[];
  available: string[];
  onMove: (idx: number, delta: number) => void;
  onRemove: (item: string) => void;
  onAdd: (item: string) => void;
}

function OrderedList({ label, items, available, onMove, onRemove, onAdd }: OrderedListProps) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <ul className="space-y-1">
        {items.length === 0 && (
          <li className="text-xs text-muted-foreground italic">Keine Auswahl</li>
        )}
        {items.map((it, i) => (
          <li
            key={it}
            className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-2 py-1 text-sm"
          >
            <span className="w-4 text-center font-mono text-xs text-muted-foreground">
              {i + 1}
            </span>
            <span className="flex-1">{it}</span>
            <button
              type="button"
              aria-label="Nach oben"
              disabled={i === 0}
              onClick={() => onMove(i, -1)}
              className="grid size-6 place-items-center rounded hover:bg-secondary disabled:opacity-30"
            >
              <ChevronUp className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Nach unten"
              disabled={i === items.length - 1}
              onClick={() => onMove(i, 1)}
              className="grid size-6 place-items-center rounded hover:bg-secondary disabled:opacity-30"
            >
              <ChevronDown className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Entfernen"
              onClick={() => onRemove(it)}
              className="grid size-6 place-items-center rounded hover:bg-destructive/20 hover:text-destructive"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      {available.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {available.map((it) => (
            <button
              key={it}
              type="button"
              onClick={() => onAdd(it)}
              className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground transition hover:border-primary hover:text-foreground"
            >
              + {it}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
