import { describe, expect, it, vi } from "vitest";
import {
  buildCustomerProjectionTree,
  effectiveAccessLevel,
  listMyCustomers,
  selectMyCustomers,
  type MyCustomerCandidate,
  type MyCustomersRepository,
} from "@/lib/customer-data/my-customers";
import type { SharedCustomerProjectionSnapshot } from "@/lib/customer-data/shared-projection-runtime";

const SH = "11111111-1111-4111-8111-111111111111";
const C1 = "22222222-2222-4222-8222-222222222221";
const C2 = "22222222-2222-4222-8222-222222222222";

function candidate(
  customerId: string,
  customer: MyCustomerCandidate["customer"] = { name: "Kunde", status: "active" },
  accessLevel: MyCustomerCandidate["accessLevel"] = "read",
): MyCustomerCandidate {
  return {
    systemhouseId: SH,
    customerId,
    customer,
    accessLevel,
    responsibilityStatus: "active",
    responsibleSince: "2026-01-01T00:00:00Z",
  };
}

describe("BSF-03 selectMyCustomers (M01–M04)", () => {
  it("M01: verwirft Kandidaten ohne per RLS lesbaren Customer (Responsibility ohne Access)", () => {
    const result = selectMyCustomers([candidate(C1, null)], new Set([`${SH}::${C1}`]));
    expect(result).toEqual([]);
  });

  it("M01b: verwirft Kandidaten ohne eigenen aktiven Customer Access (kein Indikator, kein Kunde)", () => {
    const result = selectMyCustomers(
      [candidate(C1, { name: "Kunde", status: "active" }, null)],
      new Set([`${SH}::${C1}`]),
    );
    expect(result).toEqual([]);
  });

  it("M02: verwirft Kandidaten ohne bestätigte DB-Schnittmenge", () => {
    const result = selectMyCustomers([candidate(C1)], new Set());
    expect(result).toEqual([]);
  });

  it("M03: dedupliziert je (systemhouseId, customerId) und sortiert stabil nach Name", () => {
    const result = selectMyCustomers(
      [
        candidate(C2, { name: "Zeta", status: "active" }),
        candidate(C1, { name: "Alpha", status: "inactive" }),
        candidate(C1, { name: "Alpha", status: "inactive" }),
      ],
      new Set([`${SH}::${C1}`, `${SH}::${C2}`]),
    );
    expect(result.map((c) => c.name)).toEqual(["Alpha", "Zeta"]);
    expect(result).toHaveLength(2);
  });

  it("M04: gibt nur Anzeigeattribute zurück (Scope, Kunde, eigene Verantwortung, Access)", () => {
    const [row] = selectMyCustomers([candidate(C1, undefined, "write")], new Set([`${SH}::${C1}`]));
    expect(Object.keys(row).sort()).toEqual([
      "accessLevel",
      "customerId",
      "name",
      "responsibilityStatus",
      "responsibleSince",
      "status",
      "systemhouseId",
    ]);
    expect(row.accessLevel).toBe("write");
  });

  it("M04b: effectiveAccessLevel — write dominiert, unbekannte Stufen zählen nicht", () => {
    expect(effectiveAccessLevel(["read", "write"])).toBe("write");
    expect(effectiveAccessLevel(["read"])).toBe("read");
    expect(effectiveAccessLevel(["admin"])).toBeNull();
    expect(effectiveAccessLevel([])).toBeNull();
  });
});

describe("BSF-03 listMyCustomers (M05–M06)", () => {
  function repo(overrides: Partial<MyCustomersRepository>): MyCustomersRepository {
    return {
      listCandidates: vi.fn(async () => [candidate(C1), candidate(C2, null)]),
      isMyCustomer: vi.fn(async () => true),
      readCustomer: vi.fn(async () => null),
      readOwnResponsibility: vi.fn(async () => null),
      readOwnAccessLevel: vi.fn(async () => null),
      readOwnDisplayName: vi.fn(async () => null),
      ...overrides,
    };
  }

  it("M05: bestätigt nur lesbare Kandidaten per is_my_customer und schließt andere fail-closed aus", async () => {
    const isMyCustomer = vi.fn(async ({ customerId }: { customerId: string }) => customerId === C1);
    const result = await listMyCustomers(repo({ isMyCustomer }), "user");
    expect(result.map((c) => c.customerId)).toEqual([C1]);
    // Nicht lesbarer Kandidat (C2) wird gar nicht erst geprüft.
    expect(isMyCustomer).toHaveBeenCalledTimes(1);
  });

  it("M06: Fehler bei der Bestätigung führen zum Ausschluss statt zur Anzeige", async () => {
    const isMyCustomer = vi.fn(async () => {
      throw new Error("rpc down");
    });
    const result = await listMyCustomers(repo({ isMyCustomer }), "user");
    expect(result).toEqual([]);
  });
});

describe("BSF-03 buildCustomerProjectionTree (M07–M08)", () => {
  const base = {
    systemhouseId: SH,
    customerId: C1,
    legacyClient: "ACME",
    publishedBy: "u",
    publishedAt: "2026-01-01T00:00:00Z",
    sourceRevision: 1,
    sourceHash: "h",
  };
  const snapshot: SharedCustomerProjectionSnapshot = {
    systemhouseId: SH,
    customerId: C1,
    projects: [
      { ...base, projectionId: "p2", sourceId: "P2", name: "Beta", status: "aktiv" },
      { ...base, projectionId: "p1", sourceId: "P1", name: "Alpha", status: "aktiv" },
    ],
    workPackages: [
      {
        ...base,
        projectionId: "w1",
        sourceId: "W1",
        projectSourceId: "P1",
        parentLinkStatus: "linked",
        title: "AP 1",
        status: "offen",
        priority: "hoch",
      },
      {
        ...base,
        projectionId: "w9",
        sourceId: "W9",
        projectSourceId: "P-missing",
        parentLinkStatus: "linked",
        title: "AP verwaist",
        status: "offen",
        priority: "niedrig",
      },
    ],
    activities: [
      {
        ...base,
        projectionId: "a1",
        sourceId: "A1",
        workPackageSourceId: "W1",
        parentLinkStatus: "linked",
        engineerId: "e",
        title: "Alt",
        date: "2026-01-01",
        duration: 1,
        billable: true,
        billingStatus: "offen",
      },
      {
        ...base,
        projectionId: "a2",
        sourceId: "A2",
        workPackageSourceId: "W1",
        parentLinkStatus: "linked",
        engineerId: "e",
        title: "Neu",
        date: "2026-02-01",
        duration: 2,
        billable: true,
        billingStatus: "offen",
      },
      {
        ...base,
        projectionId: "a3",
        sourceId: "A3",
        workPackageSourceId: null,
        parentLinkStatus: "none",
        engineerId: "e",
        title: "Lose",
        date: "2026-03-01",
        duration: 0.5,
        billable: false,
        billingStatus: "nicht_abrechenbar",
      },
    ],
  };

  it("M07: baut Projekt -> Arbeitspaket -> Tätigkeit mit stabiler Sortierung", () => {
    const tree = buildCustomerProjectionTree(snapshot);
    expect(tree.projects.map((p) => p.project.name)).toEqual(["Alpha", "Beta"]);
    expect(tree.projects[0].workPackages[0].workPackage.sourceId).toBe("W1");
    expect(tree.projects[0].workPackages[0].activities.map((a) => a.title)).toEqual(["Neu", "Alt"]);
    expect(tree.counts).toEqual({ projects: 2, workPackages: 2, activities: 3 });
  });

  it("M08: nicht auflösbare Verknüpfungen werden sichtbar als 'ohne Zuordnung' geführt, nie verworfen", () => {
    const tree = buildCustomerProjectionTree(snapshot);
    expect(tree.unassignedWorkPackages.map((n) => n.workPackage.sourceId)).toEqual(["W9"]);
    expect(tree.unassignedActivities.map((a) => a.sourceId)).toEqual(["A3"]);
  });
});
