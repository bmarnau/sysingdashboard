import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AvkkResponsibility } from "@/lib/avkk/types";

const responsibilityRepository = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  addTypes: vi.fn(),
}));

vi.mock("@/lib/avkk/repository", () => ({
  responsibilities: responsibilityRepository,
}));

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

import { assignResponsibility } from "@/lib/avkk/service";

const SUBJECT_REF = "subject-1";

function responsibility(overrides: Partial<AvkkResponsibility> = {}): AvkkResponsibility {
  return {
    id: "responsibility-1",
    subjectRef: SUBJECT_REF,
    personId: "user-sam",
    roleKey: "deputy",
    roleLabel: "Stellvertreter",
    types: [
      { valueId: "type-coordination", key: "coordination", label: "Koordination" },
      { valueId: "type-communication", key: "communication", label: "Kommunikation" },
    ],
    note: "",
    validFrom: "2026-08-22T11:49:37.000Z",
    validTo: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
  responsibilityRepository.list.mockResolvedValue([]);
  responsibilityRepository.create.mockResolvedValue("responsibility-new");
  responsibilityRepository.addTypes.mockResolvedValue(undefined);
  requireValue.mockImplementation((_catalogKey: string, key: string) =>
    Promise.resolve({ id: `value-${key}`, key, label: key }),
  );
});

describe("assignResponsibility — duplicate protection", () => {
  it("rejects an identical active responsibility independent of type order", async () => {
    responsibilityRepository.list.mockResolvedValue([responsibility()]);

    await expect(
      assignResponsibility({
        subjectRef: SUBJECT_REF,
        personId: "user-sam",
        roleKey: "deputy",
        typeKeys: ["communication", "coordination"],
        actorId: "user-georg",
      }),
    ).rejects.toMatchObject({ code: "AVKK_RESPONSIBILITY_DUPLICATE" });

    expect(responsibilityRepository.create).not.toHaveBeenCalled();
    expect(responsibilityRepository.addTypes).not.toHaveBeenCalled();
  });

  it("allows the same person and role with a different responsibility type set", async () => {
    responsibilityRepository.list.mockResolvedValue([responsibility()]);

    await assignResponsibility({
      subjectRef: SUBJECT_REF,
      personId: "user-sam",
      roleKey: "deputy",
      typeKeys: ["coordination"],
      actorId: "user-georg",
    });

    expect(responsibilityRepository.create).toHaveBeenCalledTimes(1);
    expect(responsibilityRepository.addTypes).toHaveBeenCalledTimes(1);
  });

  it("allows a formerly ended identical responsibility to be assigned again", async () => {
    responsibilityRepository.list.mockResolvedValue([
      responsibility({ validTo: "2026-08-22T12:00:00.000Z" }),
    ]);

    await assignResponsibility({
      subjectRef: SUBJECT_REF,
      personId: "user-sam",
      roleKey: "deputy",
      typeKeys: ["coordination", "communication"],
      actorId: "user-georg",
    });

    expect(responsibilityRepository.create).toHaveBeenCalledTimes(1);
    expect(responsibilityRepository.addTypes).toHaveBeenCalledTimes(1);
  });
});
