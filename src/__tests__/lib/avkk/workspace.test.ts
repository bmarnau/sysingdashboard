import { describe, it, expect } from "vitest";
import {
  buildRows,
  filterRows,
  sortRows,
  summarize,
  dueState,
  tasksFromLocalData,
  type AvkkTask,
} from "@/lib/avkk/workspace";
import type { AvkkDossier } from "@/lib/avkk";

const TODAY = "2026-08-11";

function task(over: Partial<AvkkTask> = {}): AvkkTask {
  return {
    subjectType: "workpackage",
    subjectId: "wp-1",
    title: "AP Eins",
    context: "Projekt A",
    due: null,
    ...over,
  };
}

function dossier(over: Partial<AvkkDossier> = {}): AvkkDossier {
  return {
    subject: {
      id: "s1",
      subjectType: "workpackage",
      subjectId: "wp-1",
      subjectTitleSnapshot: "AP Eins",
      status: "active",
      version: 1,
      createdBy: null,
      createdAt: TODAY,
      updatedAt: TODAY,
    },
    responsibilities: [],
    competences: [],
    consequences: [],
    atRisk: false,
    riskReasons: [],
    ...over,
  };
}

const resp = {
  id: "r1",
  subjectRef: "s1",
  personId: "u1",
  roleKey: "owner",
  roleLabel: "Verantwortlicher",
  types: [],
  note: "",
  validFrom: TODAY,
  validTo: null,
};

describe("dueState", () => {
  it("erkennt überfällig, fällig und anstehend", () => {
    expect(dueState("2026-08-10", TODAY)).toBe("overdue");
    expect(dueState(TODAY, TODAY)).toBe("due");
    expect(dueState("2026-08-14", TODAY)).toBe("upcoming");
    expect(dueState("2026-12-01", TODAY)).toBe("none");
    expect(dueState(null, TODAY)).toBe("none");
  });
});

describe("buildRows", () => {
  const opts = {
    dimensionKeys: ["knowledge", "time"],
    personId: "u1",
    today: TODAY,
    severityRanks: { low: 1, critical: 4 },
    criticalRank: 3,
  };

  it("markiert Aufgaben ohne Dossier als nicht erfasst", () => {
    const [row] = buildRows([task()], new Map(), opts);
    expect(row.hasDossier).toBe(false);
    expect(row.complete).toBe(false);
    expect(row.totalDimensions).toBe(2);
  });

  it("zählt Bewertungen, Verantwortung und eigene Zuordnung", () => {
    const d = dossier({
      responsibilities: [resp],
      competences: [
        {
          id: "c1",
          subjectRef: "s1",
          dimensionKey: "knowledge",
          dimensionLabel: "Fachwissen",
          ratingKey: "missing",
          ratingLabel: "nicht vorhanden",
          supportNeeded: true,
          note: "",
          supersededAt: null,
          createdAt: TODAY,
        },
      ],
      atRisk: true,
      riskReasons: ["1 Kompetenzdimension(en) nicht vorhanden"],
    });
    const [row] = buildRows([task()], new Map([["workpackage:wp-1", d]]), opts);
    expect(row.ownResponsibility).toBe(true);
    expect(row.ratedDimensions).toBe(1);
    expect(row.missing).toBe(1);
    expect(row.supportNeeded).toBe(true);
    expect(row.atRisk).toBe(true);
    expect(row.complete).toBe(false);
  });

  it("ignoriert abgelöste Bewertungen und beendete Verantwortung", () => {
    const d = dossier({
      responsibilities: [{ ...resp, validTo: TODAY }],
      competences: [
        {
          id: "c1",
          subjectRef: "s1",
          dimensionKey: "knowledge",
          dimensionLabel: "Fachwissen",
          ratingKey: "missing",
          ratingLabel: "nicht vorhanden",
          supportNeeded: false,
          note: "",
          supersededAt: TODAY,
          createdAt: TODAY,
        },
      ],
    });
    const [row] = buildRows([task()], new Map([["workpackage:wp-1", d]]), opts);
    expect(row.responsibleCount).toBe(0);
    expect(row.ratedDimensions).toBe(0);
  });

  it("leitet kritische Konsequenz und Terminhinweis ab", () => {
    const d = dossier({
      responsibilities: [resp],
      consequences: [
        {
          id: "k1",
          subjectRef: "s1",
          areaKey: "project",
          areaLabel: "Projekt",
          severityKey: "critical",
          severityLabel: "kritisch",
          scheduleImpactKey: "delay",
          scheduleImpactLabel: "Verzögerung",
          description: "",
          supersededAt: null,
        },
      ],
    });
    const [row] = buildRows(
      [task({ due: "2026-08-01" })],
      new Map([["workpackage:wp-1", d]]),
      opts,
    );
    expect(row.maxSeverityLabel).toBe("kritisch");
    expect(row.dueState).toBe("overdue");
    expect(row.contextHints).toContain("Termin überschritten");
    expect(row.contextHints.some((h) => h.includes("kritisch"))).toBe(true);
  });
});

describe("filterRows / sortRows / summarize", () => {
  const opts = {
    dimensionKeys: ["knowledge"],
    personId: "u1",
    today: TODAY,
    severityRanks: {},
  };
  const rows = buildRows(
    [
      task({ subjectId: "wp-1", title: "Alpha", due: "2026-08-01" }),
      task({ subjectId: "wp-2", title: "Beta", due: null }),
    ],
    new Map([["workpackage:wp-1", dossier({ responsibilities: [resp], atRisk: true })]]),
    opts,
  );

  it("filtert per Suchbegriff", () => {
    expect(filterRows(rows, { query: "beta" })).toHaveLength(1);
  });

  it("filtert nach Gefährdung, Überfälligkeit und eigener Verantwortung", () => {
    expect(filterRows(rows, { filter: "gefaehrdet" })[0]?.task.title).toBe("Alpha");
    expect(filterRows(rows, { filter: "ueberfaellig" })).toHaveLength(1);
    expect(filterRows(rows, { filter: "eigene" })).toHaveLength(1);
    expect(filterRows(rows, { filter: "unvollstaendig" })).toHaveLength(2);
  });

  it("sortiert gefährdete Aufgaben nach oben und alphabetisch nach Titel", () => {
    expect(sortRows(rows, "risiko")[0]?.task.title).toBe("Alpha");
    expect(sortRows(rows, "titel").map((r) => r.task.title)).toEqual(["Alpha", "Beta"]);
    expect(sortRows(rows, "termin")[0]?.task.title).toBe("Alpha");
  });

  it("fasst Kennzahlen zusammen", () => {
    expect(summarize(rows)).toMatchObject({ total: 2, withDossier: 1, atRisk: 1, overdue: 1 });
  });
});

describe("tasksFromLocalData", () => {
  it("bildet Projekte und Arbeitspakete ab, Tätigkeiten aber nicht als AVKK-Aufgaben", () => {
    const tasks = tasksFromLocalData({
      projects: [{ id: "p1", name: "Projekt A", client: "Kunde", deadline: "2026-09-01" }],
      workPackages: [{ id: "w1", title: "AP", projectId: "p1", due: "2026-08-20" }],
      activities: [{ id: "a1", title: "Tätigkeit", workPackageId: "w1", date: "2026-08-11" }],
    });
    expect(tasks.map((t) => t.subjectType)).toEqual(["project", "workpackage"]);
    expect(tasks[1]?.context).toBe("Projekt A");
    expect(tasks.some((t) => t.subjectId === "a1")).toBe(false);
  });
});
