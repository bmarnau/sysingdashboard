/**
 * Vertragstests des AVKK-Fachdienstes (Sprint 07B).
 *
 * Abgesichert werden die Servicezusagen: Katalogbindung mit Snapshot,
 * Fortschreibung statt Überschreiben bei Kompetenzen, Offline-Sperre für
 * Schreibvorgänge, Validierung des polymorphen Subject-Bezugs (Anwendungsregel,
 * keine Datenbank-FK — siehe ADR-0025), Fehlerdurchreichung bei fehlender
 * Berechtigung und der abgeleitete Frühindikator.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvkkError } from "@/lib/errors";
import { evaluateRisk } from "@/lib/avkk/indicators";
import type {
  AvkkCompetence,
  AvkkConsequence,
  AvkkResponsibility,
  AvkkSubject,
} from "@/lib/avkk/types";

const adapterMocks = vi.hoisted(() => ({
  insertSubject: vi.fn(),
  selectSubjects: vi.fn(),
  selectSubject: vi.fn(),
  insertResponsibility: vi.fn(),
  insertResponsibilityTypes: vi.fn(),
  selectResponsibilities: vi.fn(),
  endResponsibility: vi.fn(),
  supersedeCompetence: vi.fn(),
  insertCompetence: vi.fn(),
  selectCompetences: vi.fn(),
  insertConsequence: vi.fn(),
  selectConsequences: vi.fn(),
  selectRiskThreshold: vi.fn(),
}));

vi.mock("@/lib/avkk/adapter", () => adapterMocks);

const requireValue = vi.hoisted(() => vi.fn());
vi.mock("@/lib/reference-data", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reference-data/types")>(
    "@/lib/reference-data/types",
  );
  return {
    CATALOG_KEYS: actual.CATALOG_KEYS,
    requireValue: (...args: unknown[]) => requireValue(...args),
  };
});

import * as service from "@/lib/avkk";

const SUBJECT_REF = "aaaaaaaa-0000-4000-8000-000000000001";

function subject(overrides: Partial<AvkkSubject> = {}): AvkkSubject {
  return {
    id: SUBJECT_REF,
    subjectType: "workpackage",
    subjectId: "WP-001",
    subjectTitleSnapshot: "Rohrleitungsplanung",
    status: "active",
    version: 1,
    createdBy: "actor-1",
    createdAt: "2026-08-09T10:00:00.000Z",
    updatedAt: "2026-08-09T10:00:00.000Z",
    ...overrides,
  };
}

function responsibility(overrides: Partial<AvkkResponsibility> = {}): AvkkResponsibility {
  return {
    id: "r1",
    subjectRef: SUBJECT_REF,
    personId: "person-1",
    roleKey: "owner",
    roleLabel: "Verantwortlich",
    types: [],
    note: "",
    validFrom: "2026-08-09T10:00:00.000Z",
    validTo: null,
    ...overrides,
  };
}

function competence(overrides: Partial<AvkkCompetence> = {}): AvkkCompetence {
  return {
    id: "k1",
    subjectRef: SUBJECT_REF,
    dimensionKey: "technical",
    dimensionLabel: "Fachlich",
    ratingKey: "full",
    ratingLabel: "Vorhanden",
    supportNeeded: false,
    note: "",
    supersededAt: null,
    createdAt: "2026-08-09T10:00:00.000Z",
    ...overrides,
  };
}

function consequence(overrides: Partial<AvkkConsequence> = {}): AvkkConsequence {
  return {
    id: "c1",
    subjectRef: SUBJECT_REF,
    areaKey: "quality",
    areaLabel: "Qualität",
    severityKey: "high",
    severityLabel: "Hoch",
    scheduleImpactKey: "weeks",
    scheduleImpactLabel: "Wochen",
    description: "",
    supersededAt: null,
    ...overrides,
  };
}

function setOnline(online: boolean): void {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value: online });
}

beforeEach(() => {
  vi.clearAllMocks();
  setOnline(true);
  service.registerSubjectResolver(null);
  requireValue.mockImplementation((catalogKey: string, valueKey: string) =>
    Promise.resolve({ id: `${catalogKey}:${valueKey}`, key: valueKey, label: `L-${valueKey}` }),
  );
  adapterMocks.insertSubject.mockResolvedValue(subject());
  adapterMocks.selectSubjects.mockResolvedValue([subject()]);
  adapterMocks.selectSubject.mockResolvedValue(subject());
  adapterMocks.insertResponsibility.mockResolvedValue("r1");
  adapterMocks.insertResponsibilityTypes.mockResolvedValue(undefined);
  adapterMocks.selectResponsibilities.mockResolvedValue([responsibility()]);
  adapterMocks.selectCompetences.mockResolvedValue([competence()]);
  adapterMocks.selectConsequences.mockResolvedValue([consequence()]);
  adapterMocks.selectRiskThreshold.mockResolvedValue({ missingCount: 1, partialCount: 2 });
  adapterMocks.supersedeCompetence.mockResolvedValue(undefined);
  adapterMocks.insertCompetence.mockResolvedValue(undefined);
  adapterMocks.insertConsequence.mockResolvedValue(undefined);
});

afterEach(() => {
  service.registerSubjectResolver(null);
});

describe("AvkkService — Aufgabenbezug (Subject)", () => {
  it("should_createSubject_when_typeAndIdValid", async () => {
    const created = await service.createSubject({
      subjectType: "workpackage",
      subjectId: "WP-001",
      title: "Rohrleitungsplanung",
      actorId: "actor-1",
    });
    expect(created.subjectId).toBe("WP-001");
    expect(adapterMocks.insertSubject).toHaveBeenCalledWith(
      expect.objectContaining({ subjectType: "workpackage", subjectId: "WP-001" }),
    );
  });

  it("should_rejectUnknownSubjectType_when_typeOutsideAllowedSet", async () => {
    await expect(
      service.createSubject({ subjectType: "invoice", subjectId: "X", actorId: "a" }),
    ).rejects.toMatchObject({ code: "AVKK_SUBJECT_TYPE_INVALID" });
    expect(adapterMocks.insertSubject).not.toHaveBeenCalled();
  });

  it("should_rejectEmptySubjectId_when_idBlank", async () => {
    await expect(
      service.createSubject({ subjectType: "project", subjectId: "   ", actorId: "a" }),
    ).rejects.toMatchObject({ code: "AVKK_SUBJECT_ID_REQUIRED" });
  });

  it("should_rejectUnknownLocalObject_when_resolverReportsMissing", async () => {
    service.registerSubjectResolver(() => null);
    await expect(
      service.createSubject({ subjectType: "project", subjectId: "P-404", actorId: "a" }),
    ).rejects.toMatchObject({ code: "AVKK_SUBJECT_NOT_FOUND" });
  });

  it("should_useResolvedTitleAsSnapshot_when_titleOmitted", async () => {
    service.registerSubjectResolver(() => "Aufgetauter Titel");
    await service.createSubject({ subjectType: "project", subjectId: "P-1", actorId: "a" });
    expect(adapterMocks.insertSubject).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Aufgetauter Titel" }),
    );
  });

  it("should_blockWrite_when_offline", async () => {
    setOnline(false);
    await expect(
      service.createSubject({ subjectType: "project", subjectId: "P-1", actorId: "a" }),
    ).rejects.toBeInstanceOf(AvkkError);
    expect(adapterMocks.insertSubject).not.toHaveBeenCalled();
  });

  it("should_reportOrphans_when_localObjectNoLongerExists", async () => {
    adapterMocks.selectSubjects.mockResolvedValue([
      subject(),
      subject({ id: "s2", subjectType: "project", subjectId: "P-GONE" }),
    ]);
    const orphans = await service.findOrphanSubjects(new Set(["workpackage:WP-001"]));
    expect(orphans.map((s) => s.subjectId)).toEqual(["P-GONE"]);
  });
});

describe("AvkkService — Verantwortung, Kompetenz, Konsequenz", () => {
  it("should_storeRoleSnapshotAndTypes_when_responsibilityAssigned", async () => {
    await service.assignResponsibility({
      subjectRef: SUBJECT_REF,
      personId: "person-1",
      roleKey: "owner",
      typeKeys: ["decision", "execution"],
      actorId: "actor-1",
    });
    expect(adapterMocks.insertResponsibility).toHaveBeenCalledWith(
      expect.objectContaining({ roleKey: "owner", roleLabel: "L-owner" }),
    );
    expect(adapterMocks.insertResponsibilityTypes).toHaveBeenCalledWith(
      "r1",
      [expect.objectContaining({ key: "decision" }), expect.objectContaining({ key: "execution" })],
      "actor-1",
    );
  });

  it("should_rejectResponsibility_when_catalogValueUnknown", async () => {
    requireValue.mockRejectedValueOnce(new Error("REFDATA_VALUE_UNKNOWN"));
    await expect(
      service.assignResponsibility({
        subjectRef: SUBJECT_REF,
        personId: "p",
        roleKey: "ghost",
        typeKeys: [],
        actorId: "a",
      }),
    ).rejects.toThrow();
    expect(adapterMocks.insertResponsibility).not.toHaveBeenCalled();
  });

  it("should_supersedeBeforeInsert_when_competenceRated", async () => {
    const order: string[] = [];
    adapterMocks.supersedeCompetence.mockImplementation(async () => {
      order.push("supersede");
    });
    adapterMocks.insertCompetence.mockImplementation(async () => {
      order.push("insert");
    });
    await service.rateCompetence({
      subjectRef: SUBJECT_REF,
      dimensionKey: "technical",
      ratingKey: "partial",
      actorId: "actor-1",
    });
    expect(order).toEqual(["supersede", "insert"]);
    expect(adapterMocks.supersedeCompetence).toHaveBeenCalledWith(
      SUBJECT_REF,
      "technical",
      "actor-1",
    );
  });

  it("should_persistConsequenceSnapshots_when_consequenceAdded", async () => {
    await service.addConsequence({
      subjectRef: SUBJECT_REF,
      areaKey: "quality",
      severityKey: "high",
      scheduleImpactKey: "weeks",
      description: "Nacharbeit erwartet",
      actorId: "actor-1",
    });
    expect(adapterMocks.insertConsequence).toHaveBeenCalledWith(
      expect.objectContaining({
        areaKey: "quality",
        severityKey: "high",
        scheduleImpactKey: "weeks",
        description: "Nacharbeit erwartet",
      }),
    );
  });

  it("should_surfacePermissionDenied_when_rowLevelSecurityRejectsWrite", async () => {
    adapterMocks.insertCompetence.mockRejectedValue(
      new AvkkError("AVKK_COMPETENCE_INSERT_FAILED", "new row violates row-level security policy"),
    );
    await expect(
      service.rateCompetence({
        subjectRef: SUBJECT_REF,
        dimensionKey: "technical",
        ratingKey: "missing",
        actorId: "actor-1",
      }),
    ).rejects.toMatchObject({ code: "AVKK_COMPETENCE_INSERT_FAILED" });
  });

  it("should_blockAllWrites_when_offline", async () => {
    setOnline(false);
    await expect(
      service.assignResponsibility({
        subjectRef: SUBJECT_REF,
        personId: "p",
        roleKey: "owner",
        typeKeys: [],
        actorId: "a",
      }),
    ).rejects.toMatchObject({ code: "AVKK_OFFLINE_READONLY" });
    await expect(
      service.rateCompetence({
        subjectRef: SUBJECT_REF,
        dimensionKey: "technical",
        ratingKey: "full",
        actorId: "a",
      }),
    ).rejects.toMatchObject({ code: "AVKK_OFFLINE_READONLY" });
    await expect(
      service.addConsequence({
        subjectRef: SUBJECT_REF,
        areaKey: "quality",
        severityKey: "high",
        scheduleImpactKey: "weeks",
        actorId: "a",
      }),
    ).rejects.toMatchObject({ code: "AVKK_OFFLINE_READONLY" });
    expect(requireValue).not.toHaveBeenCalled();
  });
});

describe("AvkkService — Dossier und Frühindikator", () => {
  it("should_returnNull_when_subjectNotFound", async () => {
    adapterMocks.selectSubject.mockResolvedValue(null);
    await expect(service.getDossier("project", "P-404")).resolves.toBeNull();
  });

  it("should_rejectInvalidSubjectType_when_dossierRequested", async () => {
    await expect(service.getDossier("invoice", "X")).rejects.toMatchObject({
      code: "AVKK_SUBJECT_TYPE_INVALID",
    });
  });

  it("should_aggregateAllParts_when_dossierLoaded", async () => {
    const dossier = await service.getDossier("workpackage", "WP-001");
    expect(dossier?.responsibilities).toHaveLength(1);
    expect(dossier?.competences).toHaveLength(1);
    expect(dossier?.consequences).toHaveLength(1);
    expect(dossier?.atRisk).toBe(false);
  });

  it("should_flagAtRisk_when_competenceMissingAndResponsibilityAssigned", async () => {
    adapterMocks.selectCompetences.mockResolvedValue([competence({ ratingKey: "missing" })]);
    const dossier = await service.getDossier("workpackage", "WP-001");
    expect(dossier?.atRisk).toBe(true);
    expect(dossier?.riskReasons.join(" ")).toContain("nicht vorhanden");
  });

  it("should_useThresholdFromSettings_when_noOverrideGiven", async () => {
    adapterMocks.selectRiskThreshold.mockResolvedValue({ missingCount: 5, partialCount: 5 });
    adapterMocks.selectCompetences.mockResolvedValue([competence({ ratingKey: "missing" })]);
    const dossier = await service.getDossier("workpackage", "WP-001");
    expect(adapterMocks.selectRiskThreshold).toHaveBeenCalled();
    expect(dossier?.atRisk).toBe(false);
  });
});

describe("evaluateRisk — abgeleiteter Frühindikator", () => {
  it("should_stayNotAtRisk_when_noResponsibilityAssigned", () => {
    const result = evaluateRisk([], [competence({ ratingKey: "missing" })], {
      missingCount: 1,
      partialCount: 2,
    });
    expect(result.atRisk).toBe(false);
    expect(result.reasons[0]).toContain("Keine gültige Verantwortungszuordnung");
  });

  it("should_ignoreSupersededRatings_when_evaluating", () => {
    const result = evaluateRisk(
      [responsibility()],
      [competence({ ratingKey: "missing", supersededAt: "2026-08-09T12:00:00.000Z" })],
      { missingCount: 1, partialCount: 2 },
    );
    expect(result.atRisk).toBe(false);
    expect(result.missing).toBe(0);
  });

  it("should_flagAtRisk_when_partialCountReachesThreshold", () => {
    const result = evaluateRisk(
      [responsibility()],
      [
        competence({ id: "a", ratingKey: "partial" }),
        competence({ id: "b", ratingKey: "partial", dimensionKey: "method" }),
      ],
      { missingCount: 1, partialCount: 2 },
    );
    expect(result.atRisk).toBe(true);
    expect(result.partial).toBe(2);
  });

  it("should_ignoreEndedResponsibilities_when_evaluating", () => {
    const result = evaluateRisk(
      [responsibility({ validTo: "2026-08-01T00:00:00.000Z" })],
      [competence({ ratingKey: "missing" })],
      { missingCount: 1, partialCount: 2 },
    );
    expect(result.atRisk).toBe(false);
  });
});
