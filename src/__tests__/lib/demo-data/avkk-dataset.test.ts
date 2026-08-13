/**
 * Abnahmenachweis Sprint 09B: Der Demo-Datensatz muss jede in der MVP-Abnahme
 * geforderte AVKK-Lage genau abdecken. Der Test ist die maschinelle Prüfliste
 * zum manuellen Abnahmebericht (docs/MVP-ACCEPTANCE-REPORT.md).
 */
import { describe, expect, it } from "vitest";

import {
  DEMO_AVKK_EXPECTATIONS,
  DEMO_AVKK_VERSION,
  demoAvkkCases,
} from "@/lib/demo-data/avkk-dataset";

const hasRating = (dimension: string, rating: "available" | "partial" | "missing") =>
  demoAvkkCases.some((c) =>
    c.competences.some((k) => k.dimensionKey === dimension && k.ratingKey === rating),
  );

describe("Demo-AVKK-Datensatz — Abdeckung der Abnahmeszenarien", () => {
  it("should_haveStableVersionAndUniqueCaseIds", () => {
    expect(DEMO_AVKK_VERSION).toBe("1.1.0");
    const ids = demoAvkkCases.map((c) => c.caseId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should_referenceOnlyDemoPrefixedSubjects", () => {
    for (const c of demoAvkkCases) {
      expect(c.subjectId.startsWith("demo-")).toBe(true);
    }
  });

  it("should_coverPlannedAndAtRiskCases", () => {
    expect(DEMO_AVKK_EXPECTATIONS.notAtRisk).toBeGreaterThanOrEqual(1);
    expect(DEMO_AVKK_EXPECTATIONS.atRisk).toBeGreaterThanOrEqual(5);
  });

  it("should_coverMissingKnowledgeTimeMaterialAuthorization", () => {
    expect(hasRating("knowledge", "missing")).toBe(true);
    expect(hasRating("time", "missing")).toBe(true);
    expect(hasRating("material", "missing")).toBe(true);
    expect(hasRating("authorization", "missing")).toBe(true);
  });

  it("should_coverPartialSupport", () => {
    expect(hasRating("support", "partial")).toBe(true);
  });

  it("should_coverHighCustomerAndScheduleConsequences", () => {
    const customer = demoAvkkCases.some((c) =>
      c.consequences.some(
        (k) =>
          k.areaKey === "customer" && (k.severityKey === "high" || k.severityKey === "critical"),
      ),
    );
    const schedule = demoAvkkCases.some((c) =>
      c.consequences.some(
        (k) => k.scheduleImpactKey === "major_delay" || k.scheduleImpactKey === "project_stop",
      ),
    );
    expect(customer).toBe(true);
    expect(schedule).toBe(true);
  });

  it("should_containNoPersonRankingFields", () => {
    const serialized = JSON.stringify(demoAvkkCases).toLowerCase();
    for (const forbidden of ["score", "ranking", "performance", "bewertungspunkte"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
