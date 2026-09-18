import type { ProjectControllingSummary as ProjectControllingSummaryContract } from "@/lib/project-controlling/project-controlling-contract";

function formatHours(value: number): string {
  return `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} h`;
}

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
  }).format(value)} %`;
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div data-kpi className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function ProjectControllingSummary({
  summary,
}: {
  summary: ProjectControllingSummaryContract;
}) {
  return (
    <section aria-label="Kennzahlen" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Gesamtstunden" value={formatHours(summary.totalHours)} />
      <KpiCard label="Abrechenbare Stunden" value={formatHours(summary.billableHours)} />
      <KpiCard label="Nicht abrechenbare Stunden" value={formatHours(summary.nonBillableHours)} />
      <KpiCard label="Billable-Quote" value={formatPercent(summary.billableQuotePercent)} />
      <KpiCard label="Tätigkeiten" value={summary.activities} />
      <KpiCard label="Kunden" value={summary.customers} />
      <KpiCard label="Projekte" value={summary.projects} />
      <KpiCard label="Arbeitspakete" value={summary.workPackages} />
    </section>
  );
}
