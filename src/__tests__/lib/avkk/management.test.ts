import { describe, it, expect } from "vitest";
import {
  ACTION_CATEGORIES,
  aggregateCompetenceGaps,
  aggregateConsequences,
  aggregateResponsibility,
  buildActionGroups,
  buildManagementSnapshot,
  buildManagementSummary,
  filterManagementRows,
  matchesAction,
  prioritize,
  riskDistribution,
  severityDistribution,
} from "@/lib/avkk/management";
import type { AvkkRow } from "@/lib/avkk/workspace";

function row(over: Partial<AvkkRow> = {}): AvkkRow {
  return {
    key: "workpackage:wp-1",
    task: {
      subjectType: "workpackage",
      subjectId: "wp-1",
      title: "AP Eins",
      context: "Projekt A",
      due: null,
    },
    hasDossier: true,
    responsibleCount: 1,
    ownResponsibility: false,
    ratedDimensions: 2,
    totalDimensions: 2,
    missing: 0,
    partial: 0,
    supportNeeded: false,
    consequenceCount: 0,
    maxSeverityLabel: null,
    maxSeverityRank: 0,
    atRisk: false,
    riskReasons: [],
    contextHints: [],
    complete: true,
    dueState: "none",
    updatedAt: null,
    responsibilities: [
      {
        personId: "p1",
        roleKey: "engineer",
        roleLabel: "Ingenieur",
        typeKeys: ["execution"],
        typeLabels: ["Durchführung"],
      },
    ],
    competences: [],
    consequences: [],
    ...over,
  };
}

describe("AVKK-Management: Kennzahlen", () => {
  it("zählt offene, gefährdete und kritische Aufgaben", () => {
    const rows = [
      row(),
      row({ key: "a", atRisk: true, complete: false, missing: 1 }),
      row({
        key: "b",
        maxSeverityRank: 4,
        dueState: "overdue",
        task: { ...row().task, due: "2020-01-01" },
      }),
    ];
    const s = buildManagementSummary(rows);
    expect(s.total).toBe(3);
    expect(s.atRisk).toBe(1);
    expect(s.critical).toBe(1);
    expect(s.overdue).toBe(1);
    expect(s.competenceGap).toBe(1);
    expect(s.open).toBe(1);
  });

  it("weist Aufgaben ohne Verantwortung aus", () => {
    const s = buildManagementSummary([row({ responsibleCount: 0, responsibilities: [] })]);
    expect(s.withoutResponsibility).toBe(1);
  });
});

describe("AVKK-Management: Handlungsbedarf", () => {
  it("liefert für jede Kategorie eine Regel im Klartext", () => {
    const groups = buildActionGroups([row()]);
    expect(groups).toHaveLength(ACTION_CATEGORIES.length);
    for (const g of groups) expect(g.rule.length).toBeGreaterThan(10);
  });

  it("erkennt kritische Lage nur bei Gefährdung oder Überfälligkeit", () => {
    expect(matchesAction(row({ maxSeverityRank: 4 }), "kritisch")).toBe(false);
    expect(matchesAction(row({ maxSeverityRank: 4, atRisk: true }), "kritisch")).toBe(true);
  });

  it("erkennt fehlende Verantwortung", () => {
    const r = row({ responsibleCount: 0, responsibilities: [] });
    expect(matchesAction(r, "verantwortung-fehlt")).toBe(true);
  });

  it("erkennt hohe Kundenkonsequenz über den Bereich", () => {
    const r = row({
      consequences: [
        {
          areaKey: "customer",
          areaLabel: "Kunde",
          severityKey: "high",
          severityLabel: "Hoch",
          severityRank: 3,
          scheduleImpactKey: "delay",
          scheduleImpactLabel: "Verzug",
        },
      ],
    });
    expect(matchesAction(r, "konsequenz-kunde")).toBe(true);
    expect(matchesAction(r, "konsequenz-projekt")).toBe(false);
  });
});

describe("AVKK-Management: Aggregationen", () => {
  it("verdichtet Kompetenzlücken je Dimension, nicht je Person", () => {
    const r = row({
      competences: [
        {
          dimensionKey: "time",
          dimensionLabel: "Zeit",
          ratingKey: "missing",
          ratingLabel: "Nicht vorhanden",
          supportNeeded: true,
        },
      ],
    });
    const gaps = aggregateCompetenceGaps([r, { ...r, key: "x" }]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ dimensionKey: "time", missing: 2, supportNeeded: 2 });
    expect(JSON.stringify(gaps)).not.toContain("p1");
  });

  it("verdichtet Konsequenzen je Bereich", () => {
    const r = row({
      consequences: [
        {
          areaKey: "project",
          areaLabel: "Projekt",
          severityKey: "critical",
          severityLabel: "Kritisch",
          severityRank: 4,
          scheduleImpactKey: "delay",
          scheduleImpactLabel: "Verzug",
        },
      ],
    });
    const groups = aggregateConsequences([r]);
    expect(groups[0]).toMatchObject({ areaKey: "project", critical: 1, total: 1 });
    expect(groups[0]?.scheduleImpacts).toEqual(["Verzug"]);
  });

  it("aggregiert Verantwortung ohne Personenrangliste", () => {
    const overview = aggregateResponsibility([
      row(),
      row({ key: "b", responsibleCount: 0, responsibilities: [] }),
    ]);
    expect(overview.assigned).toBe(1);
    expect(overview.unassigned).toBe(1);
    expect(overview.types[0]).toMatchObject({ key: "execution", count: 1 });
    expect(JSON.stringify(overview)).not.toContain("p1");
  });

  it("liefert Verteilungen für Diagramme", () => {
    expect(riskDistribution([row({ atRisk: true })])[0]).toEqual({ label: "Gefährdet", count: 1 });
    expect(severityDistribution([row()])).toEqual([]);
  });
});

describe("AVKK-Management: Filter und Priorisierung", () => {
  it("filtert nach Kontext, Gefährdung und Zeitraum", () => {
    const rows = [
      row(),
      row({
        key: "b",
        atRisk: true,
        task: { ...row().task, context: "Projekt B", due: "2026-09-01" },
      }),
    ];
    expect(filterManagementRows(rows, { risk: "gefaehrdet" })).toHaveLength(1);
    expect(filterManagementRows(rows, { context: "Projekt B" })).toHaveLength(1);
    expect(filterManagementRows(rows, { from: "2026-08-01", to: "2026-08-31" })).toHaveLength(0);
  });

  it("schränkt per Drill-down-Schlüssel ein", () => {
    const rows = [row(), row({ key: "b" })];
    expect(filterManagementRows(rows, { keys: ["b"] }).map((r) => r.key)).toEqual(["b"]);
  });

  it("priorisiert kritisch vor gefährdet vor überfällig", () => {
    const rows = [
      row({ key: "spaet", dueState: "overdue" }),
      row({ key: "risiko", atRisk: true }),
      row({ key: "kritisch", maxSeverityRank: 4, atRisk: true }),
    ];
    expect(prioritize(rows).map((r) => r.key)).toEqual(["kritisch", "risiko", "spaet"]);
  });
});

describe("AVKK-Management: Berichtsdatenvertrag", () => {
  it("erzeugt einen versionierten Stand ohne Personenbezug", () => {
    const snapshot = buildManagementSnapshot([row()], { generatedAt: "2026-08-13T00:00:00.000Z" });
    expect(snapshot.version).toBe("1.0.0");
    expect(snapshot.contextIndicators).toBe("planned");
    expect(snapshot.priorityRule).toContain("kritische Konsequenz");
    const json = JSON.stringify(snapshot);
    expect(json).not.toContain("p1");
    expect(json).not.toContain("workpackage:wp-1");
  });
});
