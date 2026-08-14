/**
 * Regressionstest zum manuellen Befund F-11: die im Demo-Dialog eingestellte
 * Personenzuordnung muss auch bei bereits vorhandenen Demo-Fällen wirksam
 * werden. Vorher brach der Seed vor der Verantwortungszuweisung ab, sodass
 * alle Fälle beim einspielenden Benutzer verblieben.
 *
 * Der AVKK-Dienst wird durch einen In-Memory-Zwilling ersetzt: geprüft wird
 * die Seed-Fachlogik, nicht der Datenbankzugriff (RLS bleibt unberührt).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AvkkDossier, AvkkResponsibility } from "@/lib/avkk/types";
import { buildRows, taskKey, type AvkkTask } from "@/lib/avkk/workspace";

interface StoreSubject {
  id: string;
  subjectType: string;
  subjectId: string;
  status: string;
  responsibilities: AvkkResponsibility[];
  competences: number;
  consequences: number;
}

const store = new Map<string, StoreSubject>();
let idCounter = 0;
const nextId = () => `id-${++idCounter}`;
let failEnd = false;

function key(type: string, id: string) {
  return `${type}:${id}`;
}

function asDossier(s: StoreSubject): AvkkDossier {
  return {
    subject: {
      id: s.id,
      subjectType: s.subjectType,
      subjectId: s.subjectId,
      subjectTitle: s.subjectId,
      status: s.status,
      version: 1,
    },
    responsibilities: s.responsibilities,
    competences: [],
    consequences: [],
    atRisk: false,
    riskReasons: [],
  } as unknown as AvkkDossier;
}

vi.mock("@/lib/avkk/service", () => ({
  AvkkService: {
    getDossier: vi.fn(async (type: string, id: string) => {
      const s = store.get(key(type, id));
      return s ? asDossier(s) : null;
    }),
    listDossiers: vi.fn(async () => [...store.values()].map(asDossier)),
    createSubject: vi.fn(
      async (input: { subjectType: string; subjectId: string; title: string }) => {
        const s: StoreSubject = {
          id: nextId(),
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          status: "draft",
          responsibilities: [],
          competences: 0,
          consequences: 0,
        };
        store.set(key(input.subjectType, input.subjectId), s);
        return { id: s.id };
      },
    ),
    assignResponsibility: vi.fn(async (input: { subjectRef: string; personId: string }) => {
      const s = [...store.values()].find((x) => x.id === input.subjectRef);
      if (!s) throw new Error("unbekannter Sachverhalt");
      s.responsibilities.push({
        id: nextId(),
        subjectRef: s.id,
        personId: input.personId,
        roleKey: "responsible",
        roleLabel: "Verantwortlich",
        types: [],
        note: "",
        validFrom: "2026-08-14T00:00:00.000Z",
        validTo: null,
      });
    }),
    endResponsibility: vi.fn(async (responsibilityId: string) => {
      if (failEnd) throw new Error("keine Berechtigung");
      for (const s of store.values()) {
        const r = s.responsibilities.find((x) => x.id === responsibilityId);
        if (r) r.validTo = "2026-08-14T10:00:00.000Z";
      }
    }),
    rateCompetence: vi.fn(async (input: { subjectRef: string }) => {
      const s = [...store.values()].find((x) => x.id === input.subjectRef);
      if (s) s.competences += 1;
    }),
    addConsequence: vi.fn(async (input: { subjectRef: string }) => {
      const s = [...store.values()].find((x) => x.id === input.subjectRef);
      if (s) s.consequences += 1;
    }),
    retireSubject: vi.fn(async (subjectRef: string) => {
      const s = [...store.values()].find((x) => x.id === subjectRef);
      if (s) s.status = "closed";
    }),
  },
}));

const { seedAvkkDemoData } = await import("@/lib/demo-data/avkk-seed");
const { demoAvkkCases } = await import("@/lib/demo-data/avkk-dataset");
const { personaOfSubject } = await import("@/lib/demo-data/personas");

const ACTOR = "actor-admin";
const ALEX = "user-alex";
const SAM = "user-sam";
const PETRA = "user-petra";
const GEORG = "user-georg";
const ACCOUNTS = { alex: ALEX, sam: SAM, petra: PETRA, georg: GEORG } as const;

function activePerson(subjectId: string): string | undefined {
  const s = [...store.values()].find((x) => x.subjectId === subjectId);
  return s?.responsibilities.find((r) => r.validTo === null)?.personId;
}

beforeEach(() => {
  store.clear();
  idCounter = 0;
  failEnd = false;
});

describe("Demo-Seed — Personenzuordnung (F-11)", () => {
  it("should_assignEachCaseToItsPersonaAccount_when_seededOnce", async () => {
    const result = await seedAvkkDemoData(ACTOR, ACCOUNTS);

    expect(result.created).toBe(demoAvkkCases.length);
    expect(result.delegated).toBeGreaterThan(0);
    for (const c of demoAvkkCases.filter((x) => x.responsibility)) {
      const persona = personaOfSubject(c.subjectId)!;
      expect(activePerson(c.subjectId), c.subjectId).toBe(ACCOUNTS[persona]);
    }
  });

  it("should_reassignResponsibility_when_seededAgainWithChangedMapping", async () => {
    await seedAvkkDemoData(ACTOR, ACCOUNTS);
    const swapped = { ...ACCOUNTS, alex: SAM, sam: ALEX };

    const second = await seedAvkkDemoData(ACTOR, swapped);

    expect(second.created).toBe(0);
    expect(second.skipped).toBe(demoAvkkCases.length);
    expect(second.reassigned).toBeGreaterThan(0);
    expect(second.failures).toEqual([]);

    for (const c of demoAvkkCases.filter((x) => x.responsibility)) {
      const persona = personaOfSubject(c.subjectId)!;
      expect(activePerson(c.subjectId), c.subjectId).toBe(swapped[persona]);
      const s = [...store.values()].find((x) => x.subjectId === c.subjectId)!;
      // Genau eine gültige Verantwortung, alte Zuordnung historisiert.
      expect(s.responsibilities.filter((r) => r.validTo === null)).toHaveLength(1);
    }
  });

  it("should_notWriteAnything_when_seededAgainWithSameMapping", async () => {
    await seedAvkkDemoData(ACTOR, ACCOUNTS);
    const before = [...store.values()].map((s) => s.responsibilities.length);

    const second = await seedAvkkDemoData(ACTOR, ACCOUNTS);

    expect(second.reassigned).toBe(0);
    expect(second.created).toBe(0);
    expect([...store.values()].map((s) => s.responsibilities.length)).toEqual(before);
  });

  it("should_reportFailure_when_endingResponsibilityIsNotPermitted", async () => {
    await seedAvkkDemoData(ACTOR, ACCOUNTS);
    failEnd = true;

    const second = await seedAvkkDemoData(ACTOR, { ...ACCOUNTS, alex: SAM });

    expect(second.failures.length).toBeGreaterThan(0);
    expect(second.reassigned).toBe(0);
  });

  it("should_onlyTouchDemoSubjects_when_seeded", async () => {
    await seedAvkkDemoData(ACTOR, ACCOUNTS);
    for (const s of store.values()) {
      expect(s.subjectId.startsWith("demo-")).toBe(true);
    }
  });

  it("should_createFreshCase_when_previousCaseWasRetired", async () => {
    await seedAvkkDemoData(ACTOR, ACCOUNTS);
    for (const s of store.values()) s.status = "closed";

    const second = await seedAvkkDemoData(ACTOR, ACCOUNTS);

    expect(second.created).toBe(demoAvkkCases.length);
    expect(second.skipped).toBe(0);
  });
});

describe("Ableitung „eigene Verantwortung" (F-11)", () => {
  const tasks: AvkkTask[] = demoAvkkCases
    .filter((c) => c.responsibility)
    .map((c) => ({
      subjectType: c.subjectType,
      subjectId: c.subjectId,
      title: c.title,
      context: "",
      due: null,
    }));

  function rowsFor(personId: string) {
    const dossiers = new Map<string, AvkkDossier>();
    for (const s of store.values()) {
      dossiers.set(taskKey(s.subjectType, s.subjectId), asDossier(s));
    }
    return buildRows(tasks, dossiers, {
      dimensionKeys: ["knowledge"],
      personId,
      today: "2026-08-14",
    });
  }

  it("should_separateScopes_when_alexAndSamAreCompared", async () => {
    await seedAvkkDemoData(ACTOR, ACCOUNTS);

    const alexOwn = rowsFor(ALEX)
      .filter((r) => r.ownResponsibility)
      .map((r) => r.task.subjectId);
    const samOwn = rowsFor(SAM)
      .filter((r) => r.ownResponsibility)
      .map((r) => r.task.subjectId);

    expect(alexOwn.length).toBeGreaterThan(0);
    expect(samOwn.length).toBeGreaterThan(0);
    expect(alexOwn.some((id) => samOwn.includes(id))).toBe(false);
    expect(rowsFor(ACTOR).filter((r) => r.ownResponsibility)).toHaveLength(0);
  });
});
