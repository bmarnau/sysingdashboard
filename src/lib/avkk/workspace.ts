/**
 * Ableitungslogik des persönlichen AVKK-Arbeitsplatzes (Sprint 08).
 *
 * Bewusst **rein**: keine React-Abhängigkeit, kein Supabase, keine Uhrzeit aus
 * dem globalen Kontext. Damit ist die Arbeitsplatz-Logik ohne UI testbar.
 *
 * Fachliche Werte (Kompetenzdimensionen, Schweregrade) kommen als Parameter
 * aus dem Reference-Data-Dienst — in dieser Datei stehen bewusst keine
 * Katalogwerte.
 */

import type { AvkkDossier, AvkkSubjectType } from "./types";

export interface AvkkTask {
  subjectType: AvkkSubjectType;
  subjectId: string;
  title: string;
  /** Projekt- oder Arbeitspaketbezug als Klartext. */
  context: string;
  /** ISO-Datum (YYYY-MM-DD) oder null. */
  due: string | null;
}

export type AvkkDueState = "none" | "upcoming" | "due" | "overdue";

/** Verdichtete Verantwortungsangabe einer Zeile (keine Personenbewertung). */
export interface AvkkRowResponsibility {
  personId: string;
  roleKey: string;
  roleLabel: string;
  typeKeys: string[];
  typeLabels: string[];
}

export interface AvkkRowCompetence {
  dimensionKey: string;
  dimensionLabel: string;
  ratingKey: string;
  ratingLabel: string;
  supportNeeded: boolean;
}

export interface AvkkRowConsequence {
  areaKey: string;
  areaLabel: string;
  severityKey: string;
  severityLabel: string;
  severityRank: number;
  scheduleImpactKey: string;
  scheduleImpactLabel: string;
}

export interface AvkkRow {
  key: string;
  task: AvkkTask;
  hasDossier: boolean;
  responsibleCount: number;
  ownResponsibility: boolean;
  ratedDimensions: number;
  totalDimensions: number;
  missing: number;
  partial: number;
  supportNeeded: boolean;
  consequenceCount: number;
  maxSeverityLabel: string | null;
  maxSeverityRank: number;
  atRisk: boolean;
  riskReasons: string[];
  /** Erklärende Hinweise ohne eigene Persistenz (Konsequenz, Termin). */
  contextHints: string[];
  complete: boolean;
  dueState: AvkkDueState;
  updatedAt: string | null;
}

export const AVKK_FILTERS = [
  "alle",
  "gefaehrdet",
  "kritisch",
  "unvollstaendig",
  "vollstaendig",
  "faellig",
  "ueberfaellig",
  "eigene",
] as const;
export type AvkkFilter = (typeof AVKK_FILTERS)[number];

export const AVKK_FILTER_LABELS: Record<AvkkFilter, string> = {
  alle: "Alle",
  gefaehrdet: "Gefährdet",
  kritisch: "Kritische Konsequenz",
  unvollstaendig: "Unvollständig bewertet",
  vollstaendig: "Vollständig bewertet",
  faellig: "Fällig",
  ueberfaellig: "Überfällig",
  eigene: "Eigene Verantwortung",
};

export type AvkkSort = "risiko" | "termin" | "titel";

export function taskKey(subjectType: string, subjectId: string): string {
  return `${subjectType}:${subjectId}`;
}

export function dueState(due: string | null, today: string, warnDays = 7): AvkkDueState {
  if (!due) return "none";
  if (due < today) return "overdue";
  if (due === today) return "due";
  const limit = addDays(today, warnDays);
  return due <= limit ? "upcoming" : "none";
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface BuildRowsOptions {
  /** Alle aktiven Kompetenzdimensionen aus dem Katalog. */
  dimensionKeys: readonly string[];
  /** Aktueller Benutzer — für den Filter „eigene Verantwortung". */
  personId: string | null;
  /** Heutiges Datum als YYYY-MM-DD (injiziert, damit Tests deterministisch sind). */
  today: string;
  /** Rangfolge der Schweregrade aus `attributes.rank` des Katalogs. */
  severityRanks?: Readonly<Record<string, number>>;
  /** Ab welchem Rang ein Schweregrad als kritisch gilt. */
  criticalRank?: number;
}

export function buildRows(
  tasks: readonly AvkkTask[],
  dossiers: ReadonlyMap<string, AvkkDossier>,
  options: BuildRowsOptions,
): AvkkRow[] {
  const {
    dimensionKeys,
    personId,
    today,
    severityRanks = {},
    criticalRank = Number.POSITIVE_INFINITY,
  } = options;

  return tasks.map((task) => {
    const key = taskKey(task.subjectType, task.subjectId);
    const dossier = dossiers.get(key) ?? null;
    const state = dueState(task.due, today);

    if (!dossier) {
      return {
        key,
        task,
        hasDossier: false,
        responsibleCount: 0,
        ownResponsibility: false,
        ratedDimensions: 0,
        totalDimensions: dimensionKeys.length,
        missing: 0,
        partial: 0,
        supportNeeded: false,
        consequenceCount: 0,
        maxSeverityLabel: null,
        maxSeverityRank: 0,
        atRisk: false,
        riskReasons: [],
        contextHints: hintsFor(state, null, 0),
        complete: false,
        dueState: state,
        updatedAt: null,
      };
    }

    const responsibilities = dossier.responsibilities.filter((r) => r.validTo === null);
    const competences = dossier.competences.filter((c) => c.supersededAt === null);
    const rated = new Set(competences.map((c) => c.dimensionKey));
    const consequences = dossier.consequences.filter((c) => c.supersededAt === null);

    let maxSeverityRank = 0;
    let maxSeverityLabel: string | null = null;
    for (const c of consequences) {
      const rank = severityRanks[c.severityKey] ?? 0;
      if (rank >= maxSeverityRank) {
        maxSeverityRank = rank;
        maxSeverityLabel = c.severityLabel;
      }
    }

    const ratedDimensions = dimensionKeys.filter((k) => rated.has(k)).length;
    const complete =
      responsibilities.length > 0 &&
      dimensionKeys.length > 0 &&
      ratedDimensions === dimensionKeys.length &&
      consequences.length > 0;

    return {
      key,
      task,
      hasDossier: true,
      responsibleCount: responsibilities.length,
      ownResponsibility: personId !== null && responsibilities.some((r) => r.personId === personId),
      ratedDimensions,
      totalDimensions: dimensionKeys.length,
      missing: competences.filter((c) => c.ratingKey === "missing").length,
      partial: competences.filter((c) => c.ratingKey === "partial").length,
      supportNeeded: competences.some((c) => c.supportNeeded),
      consequenceCount: consequences.length,
      maxSeverityLabel,
      maxSeverityRank,
      atRisk: dossier.atRisk,
      riskReasons: dossier.riskReasons,
      contextHints: hintsFor(state, maxSeverityLabel, maxSeverityRank, criticalRank),
      complete,
      dueState: state,
      updatedAt: dossier.subject.updatedAt,
    };
  });
}

function hintsFor(
  state: AvkkDueState,
  severityLabel: string | null,
  severityRank: number,
  criticalRank = Number.POSITIVE_INFINITY,
): string[] {
  const hints: string[] = [];
  if (state === "overdue") hints.push("Termin überschritten");
  else if (state === "due") hints.push("Termin heute fällig");
  else if (state === "upcoming") hints.push("Termin steht kurz bevor");
  if (severityLabel && severityRank >= criticalRank) {
    hints.push(`Konsequenz mit Schweregrad „${severityLabel}" erfasst`);
  }
  return hints;
}

export interface FilterOptions {
  query?: string;
  filter?: AvkkFilter;
}

export function filterRows(rows: readonly AvkkRow[], options: FilterOptions = {}): AvkkRow[] {
  const { query = "", filter = "alle" } = options;
  const q = query.trim().toLowerCase();

  return rows.filter((row) => {
    if (q) {
      const haystack = [
        row.task.title,
        row.task.subjectId,
        row.task.context,
        row.maxSeverityLabel ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    switch (filter) {
      case "gefaehrdet":
        return row.atRisk;
      case "kritisch":
        return row.contextHints.some((h) => h.startsWith("Konsequenz mit Schweregrad"));
      case "unvollstaendig":
        return !row.complete;
      case "vollstaendig":
        return row.complete;
      case "faellig":
        return row.dueState === "due" || row.dueState === "upcoming";
      case "ueberfaellig":
        return row.dueState === "overdue";
      case "eigene":
        return row.ownResponsibility;
      default:
        return true;
    }
  });
}

const DUE_ORDER: Record<AvkkDueState, number> = { overdue: 0, due: 1, upcoming: 2, none: 3 };

export function sortRows(rows: readonly AvkkRow[], sort: AvkkSort = "risiko"): AvkkRow[] {
  const copy = rows.slice();
  if (sort === "titel") {
    return copy.sort((a, b) => a.task.title.localeCompare(b.task.title, "de"));
  }
  if (sort === "termin") {
    return copy.sort(
      (a, b) =>
        DUE_ORDER[a.dueState] - DUE_ORDER[b.dueState] ||
        (a.task.due ?? "9999").localeCompare(b.task.due ?? "9999") ||
        a.task.title.localeCompare(b.task.title, "de"),
    );
  }
  return copy.sort(
    (a, b) =>
      Number(b.atRisk) - Number(a.atRisk) ||
      b.missing - a.missing ||
      b.partial - a.partial ||
      DUE_ORDER[a.dueState] - DUE_ORDER[b.dueState] ||
      a.task.title.localeCompare(b.task.title, "de"),
  );
}

export interface AvkkSummary {
  total: number;
  withDossier: number;
  atRisk: number;
  complete: number;
  overdue: number;
  own: number;
}

export function summarize(rows: readonly AvkkRow[]): AvkkSummary {
  return {
    total: rows.length,
    withDossier: rows.filter((r) => r.hasDossier).length,
    atRisk: rows.filter((r) => r.atRisk).length,
    complete: rows.filter((r) => r.complete).length,
    overdue: rows.filter((r) => r.dueState === "overdue").length,
    own: rows.filter((r) => r.ownResponsibility).length,
  };
}

/** Aufgabenliste aus dem lokalen Bestand. Reine Abbildung, kein Zugriff. */
export function tasksFromLocalData(input: {
  projects: readonly { id: string; name: string; client?: string; deadline?: string }[];
  workPackages: readonly {
    id: string;
    title: string;
    projectId?: string | null;
    due?: string;
  }[];
  activities: readonly {
    id: string;
    title: string;
    workPackageId?: string | null;
    date: string;
  }[];
}): AvkkTask[] {
  const projectName = new Map(input.projects.map((p) => [p.id, p.name]));
  const wpTitle = new Map(input.workPackages.map((w) => [w.id, w.title]));

  return [
    ...input.projects.map((p) => ({
      subjectType: "project" as const,
      subjectId: p.id,
      title: p.name,
      context: p.client ?? "",
      due: p.deadline ?? null,
    })),
    ...input.workPackages.map((w) => ({
      subjectType: "workpackage" as const,
      subjectId: w.id,
      title: w.title,
      context: (w.projectId && projectName.get(w.projectId)) || "Ohne Projekt",
      due: w.due ?? null,
    })),
    ...input.activities.map((a) => ({
      subjectType: "activity" as const,
      subjectId: a.id,
      title: a.title,
      context: (a.workPackageId && wpTitle.get(a.workPackageId)) || "Ohne Arbeitspaket",
      due: a.date || null,
    })),
  ];
}
