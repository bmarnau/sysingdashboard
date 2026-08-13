/**
 * Aggregationsschicht der AVKK-Führungssicht (Sprint 09).
 *
 * Bewusst **rein**: keine React-Abhängigkeit, kein Supabase, keine Uhrzeit aus
 * dem globalen Kontext. Sie baut ausschließlich auf den Zeilen aus
 * `./workspace` auf — es existiert damit **keine zweite Fachlogik** für
 * Gefährdung, Vollständigkeit oder Termine.
 *
 * Architekturregel (verbindlich): Diese Datei erzeugt **keine** personen-
 * bezogenen Ranglisten, Scores oder Leistungsbewertungen. Verantwortung wird
 * ausschließlich als Zuordnungsstatus aggregiert.
 *
 * Fachwerte (Kompetenzdimensionen, Konsequenzbereiche, Schweregrade) stammen
 * aus dem Reference-Data-Dienst und werden hier nur durchgereicht.
 */

import type { AvkkRow } from "./workspace";

/** Katalogschlüssel, deren Semantik die Führungssicht auswertet. */
export const MANAGEMENT_KEYS = {
  ratingMissing: "missing",
  ratingPartial: "partial",
  areaCustomer: "customer",
  areaProject: "project",
} as const;

/** Ab diesem Schweregrad-Rang (Katalog `attributes.rank`) gilt „hoch". */
export const HIGH_SEVERITY_RANK = 3;
/** Ab diesem Rang gilt „kritisch". */
export const CRITICAL_SEVERITY_RANK = 4;

export interface ManagementOptions {
  /** Schwelle „hohe Konsequenz". */
  highRank?: number;
  /** Schwelle „kritische Konsequenz". */
  criticalRank?: number;
}

function ranks(options: ManagementOptions = {}) {
  return {
    high: options.highRank ?? HIGH_SEVERITY_RANK,
    critical: options.criticalRank ?? CRITICAL_SEVERITY_RANK,
  };
}

// ---------------------------------------------------------------- Kennzahlen

export interface ManagementSummary {
  /** Aufgaben insgesamt in der aktuellen Auswahl. */
  total: number;
  /** Aufgaben mit AVKK-Stand (Dossier vorhanden). */
  withDossier: number;
  /** Offen = noch nicht vollständig bewertet oder gefährdet. */
  open: number;
  atRisk: number;
  critical: number;
  overdue: number;
  competenceGap: number;
  highConsequence: number;
  incomplete: number;
  withoutResponsibility: number;
  supportNeeded: number;
}

export function buildManagementSummary(
  rows: readonly AvkkRow[],
  options: ManagementOptions = {},
): ManagementSummary {
  const { high, critical } = ranks(options);
  return {
    total: rows.length,
    withDossier: rows.filter((r) => r.hasDossier).length,
    open: rows.filter((r) => !r.complete || r.atRisk).length,
    atRisk: rows.filter((r) => r.atRisk).length,
    critical: rows.filter((r) => r.maxSeverityRank >= critical).length,
    overdue: rows.filter((r) => r.dueState === "overdue").length,
    competenceGap: rows.filter((r) => r.missing > 0 || r.partial > 0).length,
    highConsequence: rows.filter((r) => r.maxSeverityRank >= high).length,
    incomplete: rows.filter((r) => !r.complete).length,
    withoutResponsibility: rows.filter((r) => r.responsibleCount === 0).length,
    supportNeeded: rows.filter((r) => r.supportNeeded).length,
  };
}

// ------------------------------------------------------------ Handlungsbedarf

export const ACTION_CATEGORIES = [
  "kritisch",
  "gefaehrdet",
  "unterstuetzung",
  "terminrisiko",
  "voraussetzung-fehlt",
  "konsequenz-kunde",
  "konsequenz-projekt",
  "verantwortung-fehlt",
] as const;
export type ActionCategory = (typeof ACTION_CATEGORIES)[number];

export const ACTION_LABELS: Record<ActionCategory, string> = {
  kritisch: "Kritisch",
  gefaehrdet: "Gefährdet",
  unterstuetzung: "Unterstützung erforderlich",
  terminrisiko: "Terminrisiko",
  "voraussetzung-fehlt": "Fehlende Voraussetzung",
  "konsequenz-kunde": "Hohe Kundenkonsequenz",
  "konsequenz-projekt": "Hohe Projektkonsequenz",
  "verantwortung-fehlt": "Verantwortung fehlt",
};

/** Deterministische, dokumentierte Regel je Kategorie. */
export const ACTION_RULES: Record<ActionCategory, string> = {
  kritisch: "Konsequenz mit kritischem Schweregrad und gleichzeitig gefährdet oder überfällig.",
  gefaehrdet: "Frühindikator des AVKK-Dienstes meldet Gefährdung.",
  unterstuetzung: "Für mindestens eine Kompetenzdimension wurde Unterstützungsbedarf gemeldet.",
  terminrisiko: "Termin steht bevor oder ist heute fällig und die Aufgabe ist gefährdet.",
  "voraussetzung-fehlt": "Mindestens eine Kompetenzdimension ist als nicht vorhanden bewertet.",
  "konsequenz-kunde": "Konsequenz im Bereich Kunde mit mindestens hohem Schweregrad.",
  "konsequenz-projekt": "Konsequenz im Bereich Projekt mit mindestens hohem Schweregrad.",
  "verantwortung-fehlt":
    "Keine gültige Verantwortungszuordnung, obwohl ein AVKK-Stand vorliegt oder ein Termin gesetzt ist.",
};

export interface ActionGroup {
  category: ActionCategory;
  label: string;
  rule: string;
  count: number;
  /** Schlüssel der betroffenen Zeilen — Basis für den Drill-down. */
  keys: string[];
}

function matchesArea(row: AvkkRow, areaKey: string, minRank: number): boolean {
  return row.consequences.some((c) => c.areaKey === areaKey && c.severityRank >= minRank);
}

export function matchesAction(
  row: AvkkRow,
  category: ActionCategory,
  options: ManagementOptions = {},
): boolean {
  const { high, critical } = ranks(options);
  switch (category) {
    case "kritisch":
      return row.maxSeverityRank >= critical && (row.atRisk || row.dueState === "overdue");
    case "gefaehrdet":
      return row.atRisk;
    case "unterstuetzung":
      return row.supportNeeded;
    case "terminrisiko":
      return (row.dueState === "upcoming" || row.dueState === "due") && row.atRisk;
    case "voraussetzung-fehlt":
      return row.missing > 0;
    case "konsequenz-kunde":
      return matchesArea(row, MANAGEMENT_KEYS.areaCustomer, high);
    case "konsequenz-projekt":
      return matchesArea(row, MANAGEMENT_KEYS.areaProject, high);
    case "verantwortung-fehlt":
      return row.responsibleCount === 0 && (row.hasDossier || row.task.due !== null);
    default:
      return false;
  }
}

export function buildActionGroups(
  rows: readonly AvkkRow[],
  options: ManagementOptions = {},
): ActionGroup[] {
  return ACTION_CATEGORIES.map((category) => {
    const hits = rows.filter((r) => matchesAction(r, category, options));
    return {
      category,
      label: ACTION_LABELS[category],
      rule: ACTION_RULES[category],
      count: hits.length,
      keys: hits.map((r) => r.key),
    };
  });
}

// --------------------------------------------------------------- Kompetenz

export interface CompetenceGap {
  dimensionKey: string;
  dimensionLabel: string;
  missing: number;
  partial: number;
  supportNeeded: number;
  /** Betroffene Aufgaben (Drill-down). */
  keys: string[];
}

/**
 * Aggregation **pro Kompetenzdimension**, nie pro Person: „Zeit fehlt bei 6
 * Aufgaben" statt einer Personenbewertung.
 */
export function aggregateCompetenceGaps(rows: readonly AvkkRow[]): CompetenceGap[] {
  const map = new Map<string, CompetenceGap>();
  for (const row of rows) {
    for (const c of row.competences) {
      const isGap =
        c.ratingKey === MANAGEMENT_KEYS.ratingMissing ||
        c.ratingKey === MANAGEMENT_KEYS.ratingPartial ||
        c.supportNeeded;
      if (!isGap) continue;
      const entry = map.get(c.dimensionKey) ?? {
        dimensionKey: c.dimensionKey,
        dimensionLabel: c.dimensionLabel,
        missing: 0,
        partial: 0,
        supportNeeded: 0,
        keys: [],
      };
      if (c.ratingKey === MANAGEMENT_KEYS.ratingMissing) entry.missing += 1;
      if (c.ratingKey === MANAGEMENT_KEYS.ratingPartial) entry.partial += 1;
      if (c.supportNeeded) entry.supportNeeded += 1;
      if (!entry.keys.includes(row.key)) entry.keys.push(row.key);
      map.set(c.dimensionKey, entry);
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      b.missing - a.missing ||
      b.partial - a.partial ||
      a.dimensionLabel.localeCompare(b.dimensionLabel, "de"),
  );
}

// -------------------------------------------------------------- Konsequenz

export interface ConsequenceGroup {
  areaKey: string;
  areaLabel: string;
  high: number;
  critical: number;
  total: number;
  /** Höchste erfasste Terminwirkung im Klartext. */
  scheduleImpacts: string[];
  keys: string[];
}

export function aggregateConsequences(
  rows: readonly AvkkRow[],
  options: ManagementOptions = {},
): ConsequenceGroup[] {
  const { high, critical } = ranks(options);
  const map = new Map<string, ConsequenceGroup>();
  for (const row of rows) {
    for (const c of row.consequences) {
      const entry = map.get(c.areaKey) ?? {
        areaKey: c.areaKey,
        areaLabel: c.areaLabel,
        high: 0,
        critical: 0,
        total: 0,
        scheduleImpacts: [],
        keys: [],
      };
      entry.total += 1;
      if (c.severityRank >= critical) entry.critical += 1;
      else if (c.severityRank >= high) entry.high += 1;
      if (c.scheduleImpactLabel && !entry.scheduleImpacts.includes(c.scheduleImpactLabel)) {
        entry.scheduleImpacts.push(c.scheduleImpactLabel);
      }
      if (!entry.keys.includes(row.key)) entry.keys.push(row.key);
      map.set(c.areaKey, entry);
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      b.critical - a.critical ||
      b.high - a.high ||
      b.total - a.total ||
      a.areaLabel.localeCompare(b.areaLabel, "de"),
  );
}

/** Verteilung nach Schweregrad — Datenbasis der Diagramme. */
export function severityDistribution(rows: readonly AvkkRow[]): {
  label: string;
  count: number;
}[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    for (const c of row.consequences) {
      map.set(c.severityLabel, (map.get(c.severityLabel) ?? 0) + 1);
    }
  }
  return [...map.entries()].map(([label, count]) => ({ label, count }));
}

/** Verteilung nach Gefährdungsstatus — Datenbasis der Diagramme. */
export function riskDistribution(rows: readonly AvkkRow[]): { label: string; count: number }[] {
  const atRisk = rows.filter((r) => r.atRisk).length;
  const incomplete = rows.filter((r) => !r.atRisk && !r.complete).length;
  return [
    { label: "Gefährdet", count: atRisk },
    { label: "Unvollständig bewertet", count: incomplete },
    { label: "Unauffällig", count: rows.length - atRisk - incomplete },
  ];
}

// ------------------------------------------------------------ Verantwortung

export interface ResponsibilityOverview {
  assigned: number;
  unassigned: number;
  overdueWithResponsibility: number;
  criticalWithoutFullResponsibility: number;
  /** Verteilung der Verantwortungsarten (keine Personen). */
  types: { key: string; label: string; count: number }[];
}

export function aggregateResponsibility(
  rows: readonly AvkkRow[],
  options: ManagementOptions = {},
): ResponsibilityOverview {
  const { critical } = ranks(options);
  const types = new Map<string, { key: string; label: string; count: number }>();
  for (const row of rows) {
    for (const r of row.responsibilities) {
      r.typeKeys.forEach((key, i) => {
        const label = r.typeLabels[i] ?? key;
        const entry = types.get(key) ?? { key, label, count: 0 };
        entry.count += 1;
        types.set(key, entry);
      });
    }
  }
  return {
    assigned: rows.filter((r) => r.responsibleCount > 0).length,
    unassigned: rows.filter((r) => r.responsibleCount === 0).length,
    overdueWithResponsibility: rows.filter(
      (r) => r.dueState === "overdue" && r.responsibleCount > 0,
    ).length,
    criticalWithoutFullResponsibility: rows.filter(
      (r) => r.maxSeverityRank >= critical && r.responsibleCount === 0,
    ).length,
    types: [...types.values()].sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label, "de"),
    ),
  };
}

// ------------------------------------------------------------------- Filter

export interface ManagementFilter {
  query?: string;
  /** ISO-Datum, Untergrenze der Fälligkeit. */
  from?: string | null;
  /** ISO-Datum, Obergrenze der Fälligkeit. */
  to?: string | null;
  /** Projekt-/Kontextbezeichnung (exakt). */
  context?: string | null;
  subjectType?: string | null;
  responsibilityType?: string | null;
  personId?: string | null;
  competenceStatus?: "alle" | "missing" | "partial" | "ok";
  minSeverityRank?: number | null;
  risk?: "alle" | "gefaehrdet" | "unauffaellig";
  due?: "alle" | "faellig" | "ueberfaellig" | "ohne";
  completeness?: "alle" | "vollstaendig" | "unvollstaendig";
  /** Drill-down: nur diese Zeilenschlüssel. */
  keys?: readonly string[] | null;
}

export function filterManagementRows(
  rows: readonly AvkkRow[],
  filter: ManagementFilter = {},
): AvkkRow[] {
  const q = (filter.query ?? "").trim().toLowerCase();
  const keySet = filter.keys && filter.keys.length > 0 ? new Set(filter.keys) : null;

  return rows.filter((row) => {
    if (keySet && !keySet.has(row.key)) return false;
    if (q) {
      const haystack = [row.task.title, row.task.subjectId, row.task.context]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filter.from && (!row.task.due || row.task.due < filter.from)) return false;
    if (filter.to && (!row.task.due || row.task.due > filter.to)) return false;
    if (filter.context && row.task.context !== filter.context) return false;
    if (filter.subjectType && row.task.subjectType !== filter.subjectType) return false;
    if (
      filter.responsibilityType &&
      !row.responsibilities.some((r) => r.typeKeys.includes(filter.responsibilityType as string))
    ) {
      return false;
    }
    if (filter.personId && !row.responsibilities.some((r) => r.personId === filter.personId)) {
      return false;
    }
    switch (filter.competenceStatus) {
      case "missing":
        if (row.missing === 0) return false;
        break;
      case "partial":
        if (row.partial === 0) return false;
        break;
      case "ok":
        if (row.missing > 0 || row.partial > 0) return false;
        break;
      default:
        break;
    }
    if (
      typeof filter.minSeverityRank === "number" &&
      row.maxSeverityRank < filter.minSeverityRank
    ) {
      return false;
    }
    if (filter.risk === "gefaehrdet" && !row.atRisk) return false;
    if (filter.risk === "unauffaellig" && row.atRisk) return false;
    if (filter.due === "faellig" && !(row.dueState === "due" || row.dueState === "upcoming")) {
      return false;
    }
    if (filter.due === "ueberfaellig" && row.dueState !== "overdue") return false;
    if (filter.due === "ohne" && row.task.due !== null) return false;
    if (filter.completeness === "vollstaendig" && !row.complete) return false;
    if (filter.completeness === "unvollstaendig" && row.complete) return false;
    return true;
  });
}

// ------------------------------------------------------------ Priorisierung

/**
 * Dokumentierte Reihenfolge (keine verborgene Punktzahl):
 * 1. kritische Konsequenz  2. gefährdet  3. hohe Konsequenz
 * 4. überfällig  5. bald fällig  6. Titel.
 */
export const PRIORITY_RULE =
  "Sortierung: kritische Konsequenz → gefährdet → hohe Konsequenz → überfällig → bald fällig → Titel.";

const DUE_ORDER: Record<AvkkRow["dueState"], number> = {
  overdue: 0,
  due: 1,
  upcoming: 2,
  none: 3,
};

export function prioritize(rows: readonly AvkkRow[], options: ManagementOptions = {}): AvkkRow[] {
  const { high, critical } = ranks(options);
  const score = (r: AvkkRow) =>
    (r.maxSeverityRank >= critical ? 8 : 0) +
    (r.atRisk ? 4 : 0) +
    (r.maxSeverityRank >= high ? 2 : 0) +
    (r.dueState === "overdue" ? 1 : 0);
  return rows
    .slice()
    .sort(
      (a, b) =>
        score(b) - score(a) ||
        DUE_ORDER[a.dueState] - DUE_ORDER[b.dueState] ||
        a.task.title.localeCompare(b.task.title, "de"),
    );
}

// ------------------------------------------------------- Report-Datenvertrag

export const MANAGEMENT_SNAPSHOT_VERSION = "1.0.0";

export interface ManagementSnapshot {
  version: string;
  generatedAt: string;
  filter: ManagementFilter;
  summary: ManagementSummary;
  actions: { category: ActionCategory; label: string; rule: string; count: number }[];
  competenceGaps: Omit<CompetenceGap, "keys">[];
  consequences: Omit<ConsequenceGroup, "keys">[];
  responsibility: ResponsibilityOverview;
  priorityRule: string;
  /** Kontextindikatoren sind eine getrennte Ebene und noch nicht erhoben. */
  contextIndicators: "planned";
}

/**
 * Serialisierbarer Management-Datenvertrag für Reporting (Sprint 09A).
 * Enthält bewusst **keine** Personenbezüge und keine Zeilenschlüssel.
 */
export function buildManagementSnapshot(
  rows: readonly AvkkRow[],
  input: { generatedAt: string; filter?: ManagementFilter } & ManagementOptions,
): ManagementSnapshot {
  const { generatedAt, filter = {}, ...options } = input;
  return {
    version: MANAGEMENT_SNAPSHOT_VERSION,
    generatedAt,
    filter,
    summary: buildManagementSummary(rows, options),
    actions: buildActionGroups(rows, options).map(({ keys: _keys, ...rest }) => rest),
    competenceGaps: aggregateCompetenceGaps(rows).map(({ keys: _keys, ...rest }) => rest),
    consequences: aggregateConsequences(rows, options).map(({ keys: _keys, ...rest }) => rest),
    responsibility: aggregateResponsibility(rows, options),
    priorityRule: PRIORITY_RULE,
    contextIndicators: "planned",
  };
}
