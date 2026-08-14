/**
 * Aufgabenliste des AVKK-Arbeitsplatzes.
 * Karten unter `md`, Tabelle ab `md` — reine Darstellung.
 */
import type { AvkkRow } from "@/lib/avkk/workspace";
import { AvkkCompletenessBadge, AvkkRiskBadge } from "./AvkkRiskBadge";

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

export function AvkkTaskTable({
  rows,
  onOpen,
}: {
  rows: readonly AvkkRow[];
  onOpen: (row: AvkkRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
        Keine Aufgabe entspricht der aktuellen Auswahl.
      </p>
    );
  }

  return (
    <>
      {/* Mobil: Karten */}
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={row.key}>
            <button
              type="button"
              onClick={() => onOpen(row)}
              className="w-full rounded-xl border border-border bg-secondary/30 p-4 text-left hover:bg-secondary/50"
            >
              <p className="text-sm font-medium">{row.task.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {TYPE_LABEL[row.task.subjectType]} · {row.task.context || "—"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <AvkkRiskBadge row={row} />
                <AvkkCompletenessBadge row={row} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Verantwortung: {row.responsibleCount} · Konsequenzen: {row.consequenceCount}
                {row.task.due ? ` · Termin ${row.task.due} ${DUE_LABEL[row.dueState]}` : ""}
              </p>
            </button>
          </li>
        ))}
      </ul>

      {/* Ab Tablet: Tabelle */}
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">AVKK-Stand je Aufgabe</caption>
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2">
                Aufgabe
              </th>
              <th scope="col" className="px-3 py-2">
                Typ
              </th>
              <th scope="col" className="px-3 py-2">
                Bezug
              </th>
              <th scope="col" className="px-3 py-2">
                Termin
              </th>
              <th scope="col" className="px-3 py-2">
                Verantwortung
              </th>
              <th scope="col" className="px-3 py-2">
                Kompetenz
              </th>
              <th scope="col" className="px-3 py-2">
                Konsequenz
              </th>
              <th scope="col" className="px-3 py-2">
                Frühindikator
              </th>
              <th scope="col" className="px-3 py-2">
                <span className="sr-only">Aktion</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-border align-top">
                <th scope="row" className="max-w-[16rem] px-3 py-2 font-medium">
                  <span className="block truncate" title={row.task.title}>
                    {row.task.title}
                  </span>
                  <span
                    className="block truncate text-xs font-normal text-muted-foreground"
                    title={row.task.subjectId}
                  >
                    {row.task.subjectId}
                  </span>
                </th>
                <td className="px-3 py-2 text-xs">{TYPE_LABEL[row.task.subjectType]}</td>
                <td
                  className="max-w-[12rem] truncate px-3 py-2 text-xs"
                  title={row.task.context || undefined}
                >
                  {row.task.context || "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {row.task.due ?? "—"}
                  {DUE_LABEL[row.dueState] ? (
                    <span className="block text-muted-foreground">{DUE_LABEL[row.dueState]}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-xs">
                  {row.responsibleCount}
                  {row.ownResponsibility ? (
                    <span className="block text-muted-foreground">eigene</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-xs">
                  {row.ratedDimensions}/{row.totalDimensions}
                  {row.missing > 0 ? (
                    <span className="block text-destructive">{row.missing} fehlend</span>
                  ) : null}
                  {row.partial > 0 ? (
                    <span className="block text-warning">{row.partial} teilweise</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-xs">
                  {row.consequenceCount}
                  {row.maxSeverityLabel ? (
                    <span className="block text-muted-foreground">{row.maxSeverityLabel}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <AvkkRiskBadge row={row} />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onOpen(row)}
                    className="inline-flex min-h-9 items-center rounded-md border border-border bg-secondary/40 px-3 text-xs hover:bg-secondary"
                  >
                    Öffnen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
