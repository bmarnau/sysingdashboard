import { AlertTriangle } from "lucide-react";
import type { ResponsibilityPersonViewRow } from "@/lib/avkk/responsibility-management.types";

export function PersonResponsibilityTable({
  rows,
  canMutate,
  onTransfer,
  onAddDeputy,
  onEnd,
}: {
  rows: readonly ResponsibilityPersonViewRow[];
  canMutate: boolean;
  onTransfer: (row: ResponsibilityPersonViewRow) => void;
  onAddDeputy: (row: ResponsibilityPersonViewRow) => void;
  onEnd: (row: ResponsibilityPersonViewRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Keine aktiven Verantwortungen vorhanden.</p>
    );
  }

  const actions = (row: ResponsibilityPersonViewRow) =>
    canMutate ? (
      <div className="flex flex-wrap gap-2">
        {row.role === "owner" ? (
          <>
            <button
              type="button"
              className="rounded-md border px-2 py-1 text-xs"
              onClick={() => onTransfer(row)}
            >
              Verantwortung übertragen
            </button>
            <button
              type="button"
              className="rounded-md border px-2 py-1 text-xs"
              onClick={() => onAddDeputy(row)}
            >
              Stellvertretung hinzufügen
            </button>
          </>
        ) : (
          <button
            type="button"
            className="rounded-md border px-2 py-1 text-xs"
            onClick={() => onEnd(row)}
          >
            Stellvertretung beenden
          </button>
        )}
      </div>
    ) : null;

  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs text-muted-foreground">
            <tr>
              <th className="p-2">Typ</th>
              <th className="p-2">Titel</th>
              <th className="p-2">Kunde</th>
              <th className="p-2">Rolle</th>
              <th className="p-2">Status</th>
              <th className="p-2">Fällig</th>
              <th className="p-2">Risiko</th>
              <th className="p-2">
                <span className="sr-only">Aktionen</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.responsibilityId} className="border-b align-top">
                <td className="p-2">
                  {row.subjectType === "project" ? "Projekt" : "Arbeitspaket"}
                </td>
                <td className="p-2 font-medium">{row.title}</td>
                <td className="p-2">{row.customerName}</td>
                <td className="p-2">{row.role === "owner" ? "Owner" : "Deputy"}</td>
                <td className="p-2">{row.status}</td>
                <td className="p-2">{row.due ?? "—"}</td>
                <td className="p-2">
                  {row.atRisk ? (
                    <span className="inline-flex items-center gap-1">
                      <AlertTriangle className="size-4" aria-hidden="true" /> Risiko:{" "}
                      {row.riskReasons.join(", ")}
                    </span>
                  ) : (
                    "Kein Risiko"
                  )}
                </td>
                <td className="p-2">{actions(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 lg:hidden">
        {rows.map((row) => (
          <article key={row.responsibilityId} className="space-y-2 border p-3">
            <div>
              <span className="text-xs text-muted-foreground">
                {row.subjectType === "project" ? "Projekt" : "Arbeitspaket"}
              </span>
              <h3 className="font-medium">{row.title}</h3>
              <p className="text-sm text-muted-foreground">{row.customerName}</p>
            </div>
            <p className="text-sm">
              {row.role === "owner" ? "Owner" : "Deputy"} · {row.status} · Fällig: {row.due ?? "—"}
            </p>
            <p className="text-sm">
              {row.atRisk ? `Risiko: ${row.riskReasons.join(", ")}` : "Kein Risiko"}
            </p>
            {actions(row)}
          </article>
        ))}
      </div>
    </>
  );
}
