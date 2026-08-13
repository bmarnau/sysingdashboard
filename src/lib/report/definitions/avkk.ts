/**
 * Fachliche AVKK-Berichte (Sprint 09A).
 *
 * Verbindliche Regel (ADR-0027): keine personenbezogenen Ranglisten,
 * Punktzahlen oder Leistungsbewertungen. Verantwortung erscheint nur als
 * Zuordnungsstatus, Kompetenz nur je Dimension aggregiert.
 */

import {
  aggregateCompetenceGaps,
  aggregateConsequences,
  aggregateResponsibility,
  buildActionGroups,
  buildManagementSummary,
  prioritize,
  PRIORITY_RULE,
} from "@/lib/avkk/management";
import type { AvkkRow } from "@/lib/avkk/workspace";
import { DEFAULT_TEMPLATE_ID } from "../templates/default-provider";
import type { ReportContext, ReportDefinition, ReportDocument, ReportSection } from "../types";
import { selectPersonalRows, selectProjectRows, type AvkkReportInput } from "../data/avkk-selectors";

const DUE_LABEL: Record<AvkkRow["dueState"], string> = {
  none: "—",
  upcoming: "bald fällig",
  due: "heute fällig",
  overdue: "überfällig",
};

const SUBJECT_LABEL: Record<string, string> = {
  project: "Projekt",
  workpackage: "Arbeitspaket",
  activity: "Tätigkeit",
  measure: "Maßnahme",
};

function statusText(row: AvkkRow): string {
  if (!row.hasDossier) return "ohne AVKK-Stand";
  if (row.atRisk) return "gefährdet";
  if (!row.complete) return "unvollständig";
  return "im Plan";
}

function baseMeta(ctx: ReportContext, input: AvkkReportInput, definitionVersion: string) {
  return [
    { label: "Umfang", value: input.scopeLabel },
    { label: "Erstellt von", value: ctx.actor.displayName },
    { label: "Rolle", value: ctx.actor.role },
    { label: "Erstellt am", value: ctx.generatedAt.toLocaleString("de-DE") },
    { label: "Berichtsversion", value: definitionVersion },
    { label: "Zeitraum", value: ctx.period ?? "aktueller Stand" },
  ];
}

function taskTable(rows: readonly AvkkRow[], title: string, description: string): ReportSection {
  return {
    kind: "table",
    id: "aufgaben",
    title,
    description,
    columns: [
      { key: "typ", label: "Typ", weight: 1 },
      { key: "titel", label: "Aufgabe", weight: 3 },
      { key: "kontext", label: "Kontext", weight: 2 },
      { key: "status", label: "Status" },
      { key: "termin", label: "Termin" },
      { key: "verantwortung", label: "Verantwortung", align: "right" },
      { key: "kompetenz", label: "Kompetenz (fehlt/teilweise)", align: "right" },
      { key: "konsequenz", label: "Höchste Konsequenz" },
    ],
    rows: rows.map((r) => [
      SUBJECT_LABEL[r.task.subjectType] ?? r.task.subjectType,
      r.task.title,
      r.task.context,
      statusText(r),
      r.task.due ? `${r.task.due} (${DUE_LABEL[r.dueState]})` : "—",
      r.responsibleCount,
      `${r.missing}/${r.partial}`,
      r.maxSeverityLabel ?? "—",
    ]),
    emptyText: "Keine Aufgaben im gewählten Umfang",
  };
}

function actionSection(rows: readonly AvkkRow[]): ReportSection {
  const groups = buildActionGroups(rows).filter((g) => g.count > 0);
  return {
    kind: "table",
    id: "handlungsbedarf",
    title: "Handlungsbedarf",
    description: "Jede Kategorie nennt die angewandte Regel im Klartext.",
    columns: [
      { key: "kategorie", label: "Kategorie" },
      { key: "anzahl", label: "Aufgaben", align: "right" },
      { key: "regel", label: "Regel", weight: 4 },
    ],
    rows: groups.map((g) => [g.label, g.count, g.rule]),
    emptyText: "Kein Handlungsbedarf erkannt",
  };
}

function competenceSection(rows: readonly AvkkRow[]): ReportSection {
  const gaps = aggregateCompetenceGaps(rows).filter(
    (g) => g.missing > 0 || g.partial > 0 || g.supportNeeded > 0,
  );
  return {
    kind: "table",
    id: "kompetenz",
    title: "Kompetenz- und Voraussetzungslücken",
    description: "Aggregation je Dimension — ausdrücklich keine Personenbewertung.",
    columns: [
      { key: "dimension", label: "Dimension" },
      { key: "fehlt", label: "fehlt", align: "right" },
      { key: "teilweise", label: "teilweise", align: "right" },
      { key: "support", label: "Unterstützung nötig", align: "right" },
    ],
    rows: gaps.map((g) => [g.dimensionLabel, g.missing, g.partial, g.supportNeeded]),
    emptyText: "Keine Lücken gemeldet",
  };
}

function consequenceSection(rows: readonly AvkkRow[]): ReportSection {
  const groups = aggregateConsequences(rows);
  return {
    kind: "table",
    id: "konsequenz",
    title: "Konsequenzen",
    columns: [
      { key: "bereich", label: "Bereich" },
      { key: "anzahl", label: "Aufgaben", align: "right" },
      { key: "hoch", label: "hoch", align: "right" },
      { key: "kritisch", label: "kritisch", align: "right" },
      { key: "termin", label: "Terminwirkung", weight: 2 },
    ],
    rows: groups.map((g) => [
      g.areaLabel,
      g.total,
      g.high,
      g.critical,
      g.scheduleImpacts.join(", ") || "—",
    ]),
    emptyText: "Keine Konsequenzen erfasst",
  };
}

function kpiSection(rows: readonly AvkkRow[], title: string): ReportSection {
  const s = buildManagementSummary(rows);
  return {
    kind: "kpi",
    id: "kennzahlen",
    title,
    items: [
      { label: "Aufgaben gesamt", value: s.total },
      { label: "Mit AVKK-Stand", value: s.withDossier },
      { label: "Gefährdet", value: s.atRisk },
      { label: "Kritische Konsequenz", value: s.critical },
      { label: "Überfällig", value: s.overdue },
      { label: "Kompetenzlücke", value: s.competenceGap },
      { label: "Unvollständig bewertet", value: s.incomplete },
      { label: "Ohne Verantwortung", value: s.withoutResponsibility },
      { label: "Unterstützung erforderlich", value: s.supportNeeded },
    ],
  };
}

/* ------------------------------ A: persönlich ----------------------------- */

export const avkkPersonalReport: ReportDefinition<AvkkReportInput> = {
  reportId: "avkk-personal",
  title: "AVKK — Persönlicher Bericht",
  description:
    "Eigene Aufgaben entlang Aufgabe, Verantwortung, Kompetenz und Konsequenz inklusive Gefährdungen und Handlungsbedarf.",
  version: "1.0.0",
  dataSource: "avkk.workspace",
  permission: "avkk.view",
  templateId: DEFAULT_TEMPLATE_ID,
  formats: ["pdf", "print", "json", "csv", "docx"],
  fileNamePattern: "{docId}_{slug}_{version}_{timestamp}",
  documentId: "SYSING-101",
  metadata: { scope: "person", ranking: "none" },
  build(input, ctx): ReportDocument {
    const rows = prioritize(selectPersonalRows(input.rows, input.personId ?? null));
    return {
      reportId: this.reportId,
      title: this.title,
      subtitle: input.scopeLabel,
      meta: baseMeta(ctx, input, this.version),
      sections: [
        kpiSection(rows, "Eigener Stand"),
        actionSection(rows),
        taskTable(rows, "Eigene Aufgaben", PRIORITY_RULE),
        competenceSection(rows),
        consequenceSection(rows),
      ],
    };
  },
};

/* --------------------------- B: Projektmanager ---------------------------- */

export const avkkProjectReport: ReportDefinition<AvkkReportInput> = {
  reportId: "avkk-project",
  title: "AVKK — Projektbericht",
  description:
    "Projektsicht mit Arbeitspaketen, kritischen und gefährdeten Vorgängen, Kompetenzlücken, Konsequenzen und Handlungsbedarf.",
  version: "1.0.0",
  dataSource: "avkk.workspace",
  permission: "avkk.view",
  templateId: DEFAULT_TEMPLATE_ID,
  formats: ["pdf", "print", "json", "csv", "docx"],
  fileNamePattern: "{docId}_{slug}_{period}_{version}_{timestamp}",
  documentId: "SYSING-102",
  metadata: { scope: "project", ranking: "none" },
  build(input, ctx): ReportDocument {
    const rows = input.projectId
      ? prioritize(selectProjectRows(input.rows, input.projectId, input.workPackages))
      : prioritize(input.rows);
    const project = input.projects.find((p) => p.id === input.projectId) ?? null;
    const packages = input.workPackages.filter((w) => w.projectId === input.projectId);
    const responsibility = aggregateResponsibility(rows);

    const packageSection: ReportSection = {
      kind: "table",
      id: "arbeitspakete",
      title: "Arbeitspakete",
      columns: [
        { key: "titel", label: "Arbeitspaket", weight: 3 },
        { key: "status", label: "Status" },
        { key: "prio", label: "Priorität" },
        { key: "faellig", label: "Fällig" },
        { key: "avkk", label: "AVKK-Stand" },
      ],
      rows: packages.map((w) => {
        const row = rows.find(
          (r) => r.task.subjectType === "workpackage" && r.task.subjectId === w.id,
        );
        return [w.title, w.status, w.priority, w.due ?? "—", row ? statusText(row) : "nicht erfasst"];
      }),
      emptyText: "Keine Arbeitspakete im Projekt",
    };

    return {
      reportId: this.reportId,
      title: this.title,
      subtitle: project ? `${project.name} · ${project.client}` : input.scopeLabel,
      meta: [
        ...baseMeta(ctx, input, this.version),
        { label: "Projekt", value: project?.name ?? "Alle Projekte" },
        { label: "Kunde", value: project?.client ?? "—" },
        { label: "Projektleitung", value: project?.lead ?? "—" },
        { label: "Projektstatus", value: project?.status ?? "—" },
      ],
      sections: [
        kpiSection(rows, "Projektstand"),
        actionSection(rows),
        packageSection,
        taskTable(rows, "Vorgänge nach Priorität", PRIORITY_RULE),
        competenceSection(rows),
        consequenceSection(rows),
        {
          kind: "kpi",
          id: "verantwortung",
          title: "Verantwortungszuordnung",
          items: [
            { label: "Aufgaben mit Verantwortung", value: responsibility.assigned },
            { label: "Aufgaben ohne Verantwortung", value: responsibility.unassigned },
            {
              label: "Überfällig mit Verantwortung",
              value: responsibility.overdueWithResponsibility,
            },
            {
              label: "Kritisch ohne Verantwortung",
              value: responsibility.criticalWithoutFullResponsibility,
            },
          ],
        },
      ],
    };
  },
};

/* ---------------------------- C: Management ------------------------------- */

export const avkkManagementReport: ReportDefinition<AvkkReportInput> = {
  reportId: "avkk-management",
  title: "AVKK — Managementbericht",
  description:
    "Verdichtete Portfoliosicht mit Projekten im Plan, gefährdeten und kritischen Vorgängen, Konsequenzen und nachvollziehbaren Ursachen.",
  version: "1.0.0",
  dataSource: "avkk.management",
  permission: "avkk.management.view",
  templateId: DEFAULT_TEMPLATE_ID,
  formats: ["pdf", "print", "json", "csv", "docx"],
  fileNamePattern: "{docId}_{slug}_{version}_{timestamp}",
  documentId: "SYSING-103",
  metadata: { scope: "portfolio", ranking: "none" },
  build(input, ctx): ReportDocument {
    const rows = prioritize(input.rows);
    const byProject = input.projects.map((project) => {
      const projectRows = selectProjectRows(rows, project.id, input.workPackages);
      const summary = buildManagementSummary(projectRows);
      const state =
        summary.critical > 0 ? "kritisch" : summary.atRisk > 0 ? "gefährdet" : "im Plan";
      return [
        project.name,
        project.client,
        project.status,
        state,
        summary.total,
        summary.atRisk,
        summary.critical,
        summary.overdue,
      ];
    });

    return {
      reportId: this.reportId,
      title: this.title,
      subtitle: "Portfolioübersicht ohne personenbezogene Bewertung",
      meta: baseMeta(ctx, input, this.version),
      sections: [
        kpiSection(rows, "Portfoliokennzahlen"),
        {
          kind: "table",
          id: "projekte",
          title: "Projekte",
          description: "Zustand je Projekt aus den AVKK-Vorgängen abgeleitet.",
          columns: [
            { key: "projekt", label: "Projekt", weight: 3 },
            { key: "kunde", label: "Kunde", weight: 2 },
            { key: "status", label: "Projektstatus" },
            { key: "avkk", label: "AVKK-Zustand" },
            { key: "vorgaenge", label: "Vorgänge", align: "right" },
            { key: "gefaehrdet", label: "Gefährdet", align: "right" },
            { key: "kritisch", label: "Kritisch", align: "right" },
            { key: "ueberfaellig", label: "Überfällig", align: "right" },
          ],
          rows: byProject,
          emptyText: "Keine Projekte vorhanden",
        },
        actionSection(rows),
        competenceSection(rows),
        consequenceSection(rows),
        {
          kind: "text",
          id: "ursachen",
          title: "Nachvollziehbarkeit",
          paragraphs: [
            `Priorisierungsregel: ${PRIORITY_RULE}`,
            "Der Bericht enthält bewusst keine personenbezogenen Ranglisten, Punktzahlen oder Leistungsbewertungen (ADR-0027).",
            "Kompetenz wird ausschließlich je Dimension, Verantwortung ausschließlich als Zuordnungsstatus verdichtet.",
          ],
        },
      ],
    };
  },
};

export const avkkReportDefinitions = [
  avkkPersonalReport,
  avkkProjectReport,
  avkkManagementReport,
] as const;
