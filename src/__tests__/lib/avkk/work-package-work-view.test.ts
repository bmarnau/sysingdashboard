import { describe, expect, it, vi } from "vitest";
import {
  WorkPackageWorkViewService,
  selectWorkPackageWorkView,
} from "@/lib/avkk/work-package-work-view";
import type {
  WorkPackageWorkViewRepository,
  WorkPackageWorkViewSourceRow,
} from "@/lib/avkk/work-package-work-view.types";

const REFERENCE = "2026-10-03T22:30:00.000Z";
const SH = "11111111-1111-4111-8111-111111111111";
const CUSTOMER_A = "22222222-2222-4222-8222-222222222222";
const CUSTOMER_B = "33333333-3333-4333-8333-333333333333";
const ADA = "44444444-4444-4444-8444-444444444444";
const BOB = "55555555-5555-4555-8555-555555555555";

function sourceRow(
  overrides: Partial<WorkPackageWorkViewSourceRow> = {},
): WorkPackageWorkViewSourceRow {
  return {
    workPackageId: "66666666-6666-4666-8666-666666666666",
    sourceId: "WP-1",
    systemhouseId: SH,
    customerId: CUSTOMER_A,
    customerName: "Alpha GmbH",
    title: "Migration vorbereiten",
    status: "open",
    due: "2026-10-04",
    responsibilities: [],
    ...overrides,
  };
}

function repository(rows: readonly WorkPackageWorkViewSourceRow[]): WorkPackageWorkViewRepository {
  return { listAuthorizedWorkPackages: vi.fn(async () => rows) };
}

describe("BSF-03E P3b-1 work package work view", () => {
  it("derives Berlin due groups across summer, winter, and UTC day boundaries", async () => {
    const service = new WorkPackageWorkViewService(
      repository([
        sourceRow({ workPackageId: "00000000-0000-4000-8000-000000000001", due: "2026-10-03" }),
        sourceRow({ workPackageId: "00000000-0000-4000-8000-000000000002", due: "2026-10-04" }),
        sourceRow({ workPackageId: "00000000-0000-4000-8000-000000000003", due: "2026-10-02" }),
        sourceRow({ workPackageId: "00000000-0000-4000-8000-000000000004", due: null }),
      ]),
    );

    const rows = await service.list(REFERENCE);
    expect(rows.map((row) => [row.due, row.dueGroup, row.asOfDate])).toEqual([
      ["2026-10-03", "OVERDUE", "2026-10-04"],
      ["2026-10-04", "TODAY", "2026-10-04"],
      ["2026-10-02", "OVERDUE", "2026-10-04"],
      [null, "NO_DUE_DATE", "2026-10-04"],
    ]);

    await expect(service.list("2026-01-03T23:30:00.000Z")).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ asOfDate: "2026-01-04" })]),
    );
  });

  it("fails closed for invalid calendar dates instead of normalizing them", async () => {
    const service = new WorkPackageWorkViewService(repository([sourceRow({ due: "2026-02-31" })]));
    await expect(service.list(REFERENCE)).rejects.toThrow(/Fälligkeit|due/i);
  });

  it("keeps unassigned work packages, deduplicates deputies, and excludes the owner", async () => {
    const service = new WorkPackageWorkViewService(
      repository([
        sourceRow({
          responsibilities: [
            { personId: ADA, displayName: "Ada Beispiel", role: "owner" },
            { personId: ADA, displayName: "Ada Beispiel", role: "deputy" },
            { personId: BOB, displayName: "Bob Beispiel", role: "deputy" },
            { personId: BOB, displayName: "Bob Beispiel", role: "deputy" },
          ],
        }),
        sourceRow({ workPackageId: "77777777-7777-4777-8777-777777777777", sourceId: "WP-2" }),
      ]),
    );

    const rows = await service.list(REFERENCE);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ owner: { personId: ADA, displayName: "Ada Beispiel" } });
    expect(rows[0].deputies).toEqual([{ personId: BOB, displayName: "Bob Beispiel" }]);
    expect(rows[1].owner).toBe("UNASSIGNED");
  });

  it("fails closed when a work package has multiple active owners", async () => {
    const service = new WorkPackageWorkViewService(
      repository([
        sourceRow({
          responsibilities: [
            { personId: ADA, displayName: "Ada Beispiel", role: "owner" },
            { personId: BOB, displayName: "Bob Beispiel", role: "owner" },
          ],
        }),
      ]),
    );
    await expect(service.list(REFERENCE)).rejects.toThrow(/mehrere.*Owner|Owner.*mehrere/i);
  });

  it("filters only explicitly requested rows while every grouping preserves stable work package ids", async () => {
    const service = new WorkPackageWorkViewService(
      repository([
        sourceRow({ title: "Zulu", due: "2026-10-02" }),
        sourceRow({
          workPackageId: "77777777-7777-4777-8777-777777777777",
          sourceId: "WP-2",
          customerId: CUSTOMER_B,
          customerName: "Beta GmbH",
          title: "Alpha",
          status: "done",
          due: null,
          responsibilities: [{ personId: ADA, displayName: "Ada Beispiel", role: "owner" }],
        }),
      ]),
    );
    const rows = await service.list(REFERENCE);

    for (const groupBy of ["customer", "owner", "due"] as const) {
      const grouped = selectWorkPackageWorkView(rows, {
        groupBy,
        sortBy: "title",
        sortDirection: "asc",
      });
      expect(grouped.flatMap((group) => group.rows.map((row) => row.workPackageId)).sort()).toEqual(
        rows.map((row) => row.workPackageId).sort(),
      );
    }

    const filtered = selectWorkPackageWorkView(rows, {
      groupBy: "customer",
      sortBy: "title",
      sortDirection: "asc",
      filters: {
        customerIds: [CUSTOMER_B],
        ownerIds: [ADA],
        status: ["done"],
        dueGroups: ["NO_DUE_DATE"],
      },
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].rows).toHaveLength(1);
    expect(filtered[0].rows[0]).toMatchObject({
      workPackageId: "77777777-7777-4777-8777-777777777777",
    });
  });

  it("sorts group keys deterministically and uses title then stable id as tie breakers", () => {
    const rows = [
      {
        ...sourceRow({ workPackageId: "99999999-9999-4999-8999-999999999999", title: "Alpha" }),
        dueGroup: "FUTURE" as const,
        asOfDate: "2026-10-04",
        owner: "UNASSIGNED" as const,
        deputies: [],
      },
      {
        ...sourceRow({ workPackageId: "88888888-8888-4888-8888-888888888888", title: "Alpha" }),
        dueGroup: "OVERDUE" as const,
        asOfDate: "2026-10-04",
        owner: { personId: ADA, displayName: "Ada Beispiel" },
        deputies: [],
      },
    ];
    const grouped = selectWorkPackageWorkView(rows, {
      groupBy: "due",
      sortBy: "title",
      sortDirection: "asc",
    });
    expect(grouped.map((group) => group.key)).toEqual(["OVERDUE", "FUTURE"]);
    expect(
      selectWorkPackageWorkView(rows, {
        groupBy: "owner",
        sortBy: "title",
        sortDirection: "asc",
      }).map((group) => group.key),
    ).toEqual(["Ada Beispiel", "UNASSIGNED"]);
  });
});
