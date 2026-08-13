/**
 * Zentrale Managementübersicht. Ab `md` Tabelle, darunter Karten.
 * Reine Darstellung — Sortierung und Filter kommen aus `@/lib/avkk/management`.
 */
import type { AvkkRow } from "@/lib/avkk/workspace";
import { AvkkCompletenessBadge, AvkkRiskBadge } from "../AvkkRiskBadge";

const TYPE_LABEL: Record<string, string> = {
  project: "Projekt",
  workpackage: "Arbeitspaket",
  activity: "Tätigkeit",
  measure: "Maßnahme",
};

const DUE_LABEL: Record<AvkkRow["dueState"], string> = {
  overdue: "überfällig",
  due: "heute fällig",
  upcoming: "steht an",
  none: "",
};

function competenceText(row: AvkkRow): string {
  if (!row.hasDossier) return "nicht erfasst";
  const parts: string[] = [];
  if (row.missing > 0) parts.push(`${row.missing} fehlend`);
  if (row.partial > 0) parts.push(`${row.partial} teilweise`);
  if (row.supportNeeded) parts.push("Unterstützung nötig");
  return parts.length > 0 ? parts.join(" · ") : `${row.ratedDimensions}/${row.totalDimensions} ok`;
}

function responsibilityText(row: AvkkRow): string {
  if (row.responsibleCount === 0) return "nicht zugeordnet";
  const types = [...new Set(row.responsibilities.flatMap((r) => r.typeLabels))];
  return `${row.responsibleCount} zugeordnet${types.length > 0 ? ` · ${types.join(", ")}` : ""}`;
}

export function ManagementTable({
  rows,
  onOpen,
}: {
  rows: readonly AvkkRow[];
  onOpen: (row: AvkkRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
        Keine Aufgabe entspricht der aktuellen Auswahl. Filter zurücksetzen, um alle Aufgaben zu
        sehen.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={row.key}>
            <button
              type="button"
              onClick={() => onOpen(row)}
              className="w-full rounded-xl border border-border bg-secondary/30 p-4 text-left hover:bg-secondary/50"
            >
              <p className="truncate text-sm font-medium">{row.task.title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {TYPE_LABEL[row.task.subjectType]} · {row.task.context || "—"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <AvkkRiskBadge row={row} />
                <AvkkCompletenessBadge row={row} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Verantwortung: {responsibilityText(row)} · Kompetenz: {competenceText(row)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Konsequenz: {row.maxSeverityLabel ?? "—"}
                {row.task.due ? ` · Termin ${row.task.due} ${DUE_LABEL[row.dueState]}` : ""}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full min-w-[64rem] text-sm">
          <caption className="sr-only">
            AVKK-Führungsübersicht: Aufgaben mit Verantwortung, Kompetenzstatus, Konsequenz und
            Gefährdung
          </caption>
          <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 text-left">
                Aufgabe
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                Projekt / Kontext
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                Verantwortung
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                Fälligkeit
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                Kompetenz
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                Konsequenz
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                Gefährdung
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                Gründe
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                Letzte Änderung
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-border hover:bg-secondary/30">
                <th scope="row" className="max-w-[16rem] px-3 py-2 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => onOpen(row)}
                    className="truncate text-left underline-offset-2 hover:underline"
                  >
                    {row.task.title}
                  </button>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {TYPE_LABEL[row.task.subjectType]}
                  </span>
                </th>
                <td className="max-w-[12rem] truncate px-3 py-2 text-muted-foreground">
                  {row.task.context || "—"}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {responsibilityText(row)}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {row.task.due ? `${row.task.due} ${DUE_LABEL[row.dueState]}` : "—"}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{competenceText(row)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {row.maxSeverityLabel ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <AvkkRiskBadge row={row} />
                </td>
                <td className="max-w-[16rem] px-3 py-2 text-xs text-muted-foreground">
                  {[...row.riskReasons, ...row.contextHints].join(" · ") || "—"}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString("de-DE") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
