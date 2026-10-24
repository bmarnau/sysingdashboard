import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEMO_DATASET_VERSION,
  DEMO_PERSONAS,
  DEMO_STALE_AFTER_DAYS,
  buildDemoDataset,
  getDemoFreshness,
  removeDemoData,
  seedDemoData,
  setDemoBaseDate,
} from "@/lib/demo-data";
import { dashboardStore } from "@/lib/store/dashboard-store";

const FIXED = "2026-10-24";

describe("Erweiterter Demo-Datensatz (TD-01 Stufe a)", () => {
  beforeEach(() => setDemoBaseDate(FIXED));

  it("should_reachTargetSize_when_datasetBuilt", () => {
    const d = buildDemoDataset();
    expect(DEMO_DATASET_VERSION).toBe("2.2.0");
    expect(d.projects).toHaveLength(6);
    expect(d.workPackages.length).toBeGreaterThanOrEqual(24);
    expect(d.activities.length).toBeGreaterThanOrEqual(55);
  });

  it("should_beDeterministic_when_builtTwiceWithSameBaseDate", () => {
    expect(buildDemoDataset()).toEqual(buildDemoDataset());
  });

  it("should_useUniqueDemoPrefixedIds_when_datasetBuilt", () => {
    const d = buildDemoDataset();
    for (const list of [d.projects, d.workPackages, d.activities]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id.startsWith("demo-"), id).toBe(true);
    }
  });

  it("should_keepReferencesConsistent_when_datasetBuilt", () => {
    const d = buildDemoDataset();
    const projectIds = new Set(d.projects.map((p) => p.id));
    const wpIds = new Set(d.workPackages.map((w) => w.id));
    for (const w of d.workPackages) {
      if (w.projectId) expect(projectIds.has(w.projectId), w.id).toBe(true);
    }
    for (const a of d.activities) {
      expect(a.workPackageId && wpIds.has(a.workPackageId), a.id).toBe(true);
    }
  });

  it("should_coverPublishEdgeCases_when_datasetBuilt", () => {
    const d = buildDemoDataset();
    const dues = d.workPackages.map((w) => w.due);
    expect(dues.some((x) => x === FIXED)).toBe(true);
    expect(dues.some((x) => x !== undefined && x < FIXED)).toBe(true);
    expect(dues.some((x) => x !== undefined && x > FIXED)).toBe(true);
    expect(dues.some((x) => x === undefined)).toBe(true);
    expect(d.workPackages.some((w) => !w.projectId)).toBe(true);
    const clients = new Set(d.projects.map((p) => p.client));
    expect(clients.size).toBeGreaterThanOrEqual(4);
  });

  it("should_notCarryEngineerIds_when_datasetBuilt", () => {
    // Echte Kennungen wären Fremdschlüssel auf Konten; erfundene bräche den Server-Vertrag.
    for (const a of buildDemoDataset().activities) expect(a.engineerId, a.id).toBeUndefined();
  });

  it("should_placeActivitiesBeforeBaseDate_when_datasetBuilt", () => {
    for (const a of buildDemoDataset().activities) expect(a.date < FIXED, a.id).toBe(true);
  });

  it("should_assignEveryPackageToAPersona_when_datasetBuilt", () => {
    const names = new Set(DEMO_PERSONAS.map((p) => p.displayName));
    const d = buildDemoDataset();
    for (const w of d.workPackages) expect(names.has(w.assignee ?? ""), w.id).toBe(true);
    const assigned = new Set(d.workPackages.map((w) => w.assignee));
    expect(assigned.size).toBeGreaterThanOrEqual(4);
  });

  it("should_includeViewerPersonaWithoutAssignments_when_personasListed", () => {
    const viewer = DEMO_PERSONAS.find((p) => p.requiredRole === "viewer");
    expect(viewer).toBeDefined();
    const d = buildDemoDataset();
    expect(d.workPackages.some((w) => w.assignee === viewer!.displayName)).toBe(false);
    expect(d.projects.some((p) => p.lead === viewer!.displayName)).toBe(false);
  });
});

describe("Aktualität der Demodaten (relative Datumsangaben)", () => {
  afterEach(() => {
    removeDemoData();
    setDemoBaseDate(FIXED);
  });

  it("should_reportNoFreshness_when_noDemoDataSeeded", () => {
    removeDemoData();
    expect(getDemoFreshness(FIXED)).toEqual({ seededBaseDate: null, ageDays: null, stale: false });
  });

  it("should_beFresh_when_seededToday", () => {
    setDemoBaseDate(FIXED);
    seedDemoData();
    expect(getDemoFreshness(FIXED)).toEqual({ seededBaseDate: FIXED, ageDays: 0, stale: false });
  });

  it("should_becomeStale_when_daysPassAfterSeeding", () => {
    setDemoBaseDate(FIXED);
    seedDemoData();
    const later = "2026-10-29";
    const result = getDemoFreshness(later);
    expect(result.seededBaseDate).toBe(FIXED);
    expect(result.ageDays).toBe(5);
    expect(result.ageDays! >= DEMO_STALE_AFTER_DAYS).toBe(true);
    expect(result.stale).toBe(true);
  });

  it("should_shiftAllDates_when_reseededWithNewBaseDate", () => {
    setDemoBaseDate(FIXED);
    seedDemoData();
    setDemoBaseDate("2026-10-29");
    const second = seedDemoData();
    expect(second.replaced).toBe(true);
    expect(getDemoFreshness("2026-10-29").stale).toBe(false);
    const demoWps = dashboardStore.getState().workPackages.filter((w) => w.id.startsWith("demo-"));
    expect(demoWps).toHaveLength(buildDemoDataset().workPackages.length);
  });
});

describe("Keine Berührung von Echtdaten", () => {
  it("should_keepNonDemoRecords_when_reseeded", () => {
    const before = dashboardStore.getState().projects.filter((p) => !p.id.startsWith("demo-"));
    seedDemoData();
    removeDemoData();
    const after = dashboardStore.getState().projects.filter((p) => !p.id.startsWith("demo-"));
    expect(after).toEqual(before);
  });
});
