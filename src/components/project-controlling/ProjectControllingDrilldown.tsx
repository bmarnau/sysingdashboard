import type {
  ProjectControllingCompleteness,
  ProjectControllingRow,
} from "@/lib/project-controlling/project-controlling-contract";

function categoryText(row: ProjectControllingRow): string {
  switch (row.categoryState) {
    case "unobserved":
      return "Kategorie nicht publiziert";
    case "none":
      return "Keine Kategorie";
    case "known":
      return row.categoryLabel ?? row.categoryKey ?? "Kategorie";
    case "inactive":
      return `${row.categoryLabel ?? row.categoryKey ?? "Kategorie"} (inaktiv)`;
    case "unknown":
      return `Unbekannte Kategorie (${row.categoryKey ?? "ohne Key"})`;
  }
}

function formatHours(value: number): string {
  return `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} h`;
}

export function ProjectControllingDrilldown({
  rows,
  completeness,
}: {
  rows: readonly ProjectControllingRow[];
  completeness: ProjectControllingCompleteness;
}) {
  return (
    <section aria-label="Drill-down" className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Leistungsdetails</h2>
        <p className="text-sm text-muted-foreground">
          Kunde → Projekt → Arbeitspaket → Tätigkeit. Fehlende Zuordnungen bleiben ausdrücklich sichtbar.
        </p>
      </div>

      {(completeness.categoryUnobservedRows > 0 ||
        completeness.categoryUnknownRows > 0 ||
        completeness.rowsWithoutProject > 0 ||
        completeness.rowsWithoutWorkPackage > 0) && (
        <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
          Der Datenbestand enthält unvollständige oder historische Zuordnungen. Diese werden nicht automatisch umgedeutet.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          Für die gewählten Filter liegen keine Tätigkeiten vor.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Kunde</th>
                <th className="px-3 py-2">Projekt</th>
                <th className="px-3 py-2">Arbeitspaket</th>
                <th className="px-3 py-2">Kategorie</th>
                <th className="px-3 py-2">Tätigkeit</th>
                <th className="px-3 py-2 text-right">Stunden</th>
                <th className="px-3 py-2">Abrechenbar</th>
                <th className="px-3 py-2">Billing-Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.activityId}>
                  <td className="px-3 py-2 whitespace-nowrap">{row.activityDate}</td>
                  <td className="px-3 py-2">{row.customerName}</td>
                  <td className="px-3 py-2">{row.projectName ?? "Ohne Projekt"}</td>
                  <td className="px-3 py-2">{row.workPackageTitle ?? "Ohne Arbeitspaket"}</td>
                  <td className="px-3 py-2">{categoryText(row)}</td>
                  <td className="px-3 py-2 font-medium">{row.activityTitle}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatHours(row.durationHours)}</td>
                  <td className="px-3 py-2">{row.billable ? "Ja" : "Nein"}</td>
                  <td className="px-3 py-2">{row.billingStatus ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
