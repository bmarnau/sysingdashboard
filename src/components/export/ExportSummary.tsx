/**
 * Exportübersicht und Vorschau-Kennzahlen inkl. Gruppierungsbaum.
 * Reine Darstellung — Werte kommen ausschließlich aus Props.
 */
import type {
  ExportData,
  ExportFormat,
  ExportGroupNode,
  GroupingId,
  SortKey,
} from "@/lib/export-data";
import { FORMAT_OPTIONS, groupingLabel, sortLabel } from "./export-options";
import { formatMonthLabel } from "./export-naming";

const HOURS_FMT = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const CURRENCY_FMT = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function formatHours(h: number): string {
  return HOURS_FMT.format(h);
}

function formatCurrency(n: number): string {
  return CURRENCY_FMT.format(n);
}

function GroupNode({ node, depth }: { node: ExportGroupNode; depth: number }) {
  return (
    <li>
      <div className="flex items-baseline gap-2" style={{ paddingLeft: `${depth * 12}px` }}>
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

interface ExportSummaryPanelsProps {
  format: ExportFormat;
  month: string;
  clientName?: string;
  projectName?: string;
  fileName: string;
  grouping: GroupingId;
  sorting: SortKey[];
  exportData: ExportData;
}

export function ExportSummaryPanels({
  format,
  month,
  clientName,
  projectName,
  fileName,
  grouping,
  sorting,
  exportData,
}: ExportSummaryPanelsProps) {
  return (
    <>
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
            {sorting.length === 0 ? (
              <span className="italic text-muted-foreground">keine</span>
            ) : (
              sorting.map(sortLabel).join(" → ")
            )}
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
    </>
  );
}
