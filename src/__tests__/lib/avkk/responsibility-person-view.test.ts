import { describe, expect, it, vi } from "vitest";
import { ResponsibilityPersonViewService } from "@/lib/avkk/responsibility-management";
import type {
  ResponsibilityPersonViewRepository,
  ResponsibilityPersonViewSourceRow,
} from "@/lib/avkk/responsibility-management.types";

const PERSON = "11111111-1111-4111-8111-111111111111";
const SH = "22222222-2222-4222-8222-222222222222";
const C1 = "33333333-3333-4333-8333-333333333333";

function row(
  overrides: Partial<ResponsibilityPersonViewSourceRow> = {},
): ResponsibilityPersonViewSourceRow {
  return {
    responsibilityId: "44444444-4444-4444-8444-444444444444",
    subjectRef: "55555555-5555-4555-8555-555555555555",
    personId: PERSON,
    displayName: "Ada Beispiel",
    role: "owner",
    subjectType: "project",
    subjectId: "P-100",
    title: "Migration",
    systemhouseId: SH,
    customerId: C1,
    customerName: "Beispielkunde",
    status: "active",
    due: null,
    missingCount: 0,
    partialCount: 0,
    supportNeeded: false,
    validFrom: "2026-09-01T00:00:00Z",
    validTo: null,
    ...overrides,
  };
}

function repository(
  rows: ResponsibilityPersonViewSourceRow[],
): ResponsibilityPersonViewRepository {
  return {
    listByPerson: vi.fn(async () => rows),
    readRiskThreshold: vi.fn(async () => ({ missingCount: 1, partialCount: 2 })),
  };
}

describe("BSF-03E P1 responsibility person view", () => {
  it("returns only active project/workpackage responsibilities and derives AVKK risk", async () => {
    const service = new ResponsibilityPersonViewService(
      repository([
        row({
          missingCount: 1,
          supportNeeded: true,
        }),
        row({
          responsibilityId: "66666666-6666-4666-8666-666666666666",
          subjectRef: "77777777-7777-4777-8777-777777777777",
          role: "deputy",
          subjectType: "workpackage",
          subjectId: "WP-10",
          title: "Pilotbetrieb",
          status: "open",
          partialCount: 2,
        }),
        row({
          responsibilityId: "88888888-8888-4888-8888-888888888888",
          validTo: "2026-09-20T00:00:00Z",
        }),
        row({
          responsibilityId: "99999999-9999-4999-8999-999999999999",
          subjectType: "activity" as never,
          subjectId: "A-1",
        }),
      ]),
    );

    const result = await service.listByPerson(PERSON);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      role: "owner",
      subjectType: "project",
      atRisk: true,
      riskReasons: [
        "1 Kompetenzdimension(en) nicht vorhanden",
        "Unterstützungsbedarf gemeldet",
      ],
    });
    expect(result[1]).toMatchObject({
      role: "deputy",
      subjectType: "workpackage",
      atRisk: true,
      riskReasons: ["2 Kompetenzdimension(en) nur teilweise vorhanden"],
    });
  });

  it("never exposes a technical UUID as display name", async () => {
    const service = new ResponsibilityPersonViewService(
      repository([
        row({
          displayName: PERSON,
        }),
      ]),
    );

    const [result] = await service.listByPerson(PERSON);

    expect(result.displayName).toBe("Unbenannt");
    expect(result.displayName).not.toBe(PERSON);
  });

  it("returns an empty person view when the repository exposes no readable scope", async () => {
    const repo = repository([]);
    const service = new ResponsibilityPersonViewService(repo);

    await expect(service.listByPerson(PERSON)).resolves.toEqual([]);
    expect(repo.listByPerson).toHaveBeenCalledWith(PERSON);
  });
});
