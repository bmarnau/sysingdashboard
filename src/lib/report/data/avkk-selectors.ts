/**
 * Datenbereitstellung (ReportDataProvider) der AVKK-Berichte.
 *
 * Reine Auswahl- und Verdichtungsfunktionen über bereits geladene Zeilen.
 * Kein Supabase-Zugriff: Die Berichtsschicht bekommt Daten von der Anwendung
 * gereicht, damit RLS und Rechteprüfung genau einmal — im Datenzugriff der
 * Anwendung — stattfinden und Berichte vollständig testbar bleiben.
 */

import type { AvkkRow } from "@/lib/avkk/workspace";
import type { Project, WorkPackage } from "@/lib/dashboard-data";

export interface AvkkReportInput {
  rows: readonly AvkkRow[];
  projects: readonly Project[];
  workPackages: readonly WorkPackage[];
  /** Anzeigename des fachlichen Umfangs, z. B. „Eigene Aufgaben". */
  scopeLabel: string;
  /** Optionaler Projektbezug (Projektmanager-Bericht). */
  projectId?: string | null;
  /** Bezugsperson (persönlicher Bericht) — nur zur Auswahl, nie zur Bewertung. */
  personId?: string | null;
}

/** Aufgaben, für die die Person eine gültige Verantwortung trägt. */
export function selectPersonalRows(
  rows: readonly AvkkRow[],
  personId: string | null,
): readonly AvkkRow[] {
  if (!personId) return rows.filter((r) => r.ownResponsibility);
  return rows.filter(
    (r) => r.ownResponsibility || r.responsibilities.some((x) => x.personId === personId),
  );
}

/** Aufgaben eines Projekts inklusive der zugehörigen Arbeitspakete. */
export function selectProjectRows(
  rows: readonly AvkkRow[],
  projectId: string,
  workPackages: readonly WorkPackage[],
): readonly AvkkRow[] {
  const wpIds = new Set(workPackages.filter((w) => w.projectId === projectId).map((w) => w.id));
  return rows.filter((r) => {
    if (r.task.subjectType === "project") return r.task.subjectId === projectId;
    if (r.task.subjectType === "workpackage") return wpIds.has(r.task.subjectId);
    return false;
  });
}
