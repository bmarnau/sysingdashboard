import { describe, expect, it } from "vitest";
import {
  DEMO_PERSONAS,
  DEMO_SUBJECT_PERSONA,
  buildDemoDataset,
  buildPersonaExpectations,
  demoAvkkCases,
  personaOfSubject,
  resolvePersonId,
  setDemoBaseDate,
} from "@/lib/demo-data";

setDemoBaseDate("2026-08-13");

describe("Demo-Personenschicht (Sprint 09C, F-11)", () => {
  it("should_haveUniquePersonas_when_datasetLoaded", () => {
    const ids = DEMO_PERSONAS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const names = DEMO_PERSONAS.map((p) => p.displayName);
    expect(new Set(names).size).toBe(names.length);
  });

  it("should_assignEveryAvkkCase_when_personaMappingApplied", () => {
    for (const demoCase of demoAvkkCases) {
      expect(personaOfSubject(demoCase.subjectId), demoCase.caseId).not.toBeNull();
    }
  });

  it("should_onlyMapDemoSubjects_when_mappingInspected", () => {
    for (const subjectId of Object.keys(DEMO_SUBJECT_PERSONA)) {
      expect(subjectId.startsWith("demo-")).toBe(true);
    }
  });

  it("should_separateEngineerScopes_when_expectationsBuilt", () => {
    const byId = new Map(buildPersonaExpectations().map((e) => [e.personaId, e]));
    const alex = byId.get("alex")!;
    const sam = byId.get("sam")!;

    expect(alex.cases).toBeGreaterThan(0);
    expect(sam.cases).toBeGreaterThan(0);
    const overlap = alex.caseIds.filter((id) => sam.caseIds.includes(id));
    expect(overlap).toEqual([]);
  });

  it("should_coverAllCases_when_personaScopesCombined", () => {
    const all = buildPersonaExpectations().flatMap((e) => e.caseIds);
    expect(new Set(all).size).toBe(demoAvkkCases.length);
  });

  it("should_matchLocalAssignments_when_personaNamesUsed", () => {
    const dataset = buildDemoDataset();
    const names = new Set(DEMO_PERSONAS.map((p) => p.displayName));
    for (const wp of dataset.workPackages) {
      expect(names.has(wp.assignee ?? ""), wp.id).toBe(true);
    }
    for (const project of dataset.projects) {
      expect(names.has(project.lead ?? ""), project.id).toBe(true);
    }
  });

  it("should_fallBackToActor_when_personaHasNoAccount", () => {
    expect(resolvePersonId("demo-wp-netz-planung", {}, "actor-1")).toBe("actor-1");
    expect(resolvePersonId("demo-wp-netz-planung", { alex: "user-a" }, "actor-1")).toBe("user-a");
    expect(resolvePersonId("kein-demo-objekt", { alex: "user-a" }, "actor-1")).toBe("actor-1");
  });

  it("should_giveManagementFullPortfolio_when_projectsAggregated", () => {
    const dataset = buildDemoDataset();
    const led = buildPersonaExpectations().reduce((sum, e) => sum + e.projectsLed, 0);
    expect(led).toBe(dataset.projects.length);
  });

  it("should_exposeNoPersonRanking_when_expectationsRead", () => {
    for (const e of buildPersonaExpectations()) {
      expect(Object.keys(e)).not.toContain("score");
      expect(Object.keys(e)).not.toContain("rank");
    }
  });
});
