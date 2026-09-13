import { describe, expect, it } from "vitest";
import {
  normalizeResponsibilityCandidates,
  normalizeResponsibilityCustomers,
  type ResponsibilityCandidate,
  type ResponsibilityManagementCustomer,
} from "@/lib/customer-data/customer-responsibility-management";

describe("BSF-03 P5 customer responsibility management", () => {
  it("sortiert Kunden stabil und erhält nicht zugeordnete Kunden", () => {
    const rows: ResponsibilityManagementCustomer[] = [
      {
        systemhouseId: "sh",
        customerId: "b",
        name: "Zulu GmbH",
        status: "active",
        responsibility: null,
      },
      {
        systemhouseId: "sh",
        customerId: "a",
        name: "Alpha AG",
        status: "active",
        responsibility: {
          id: "r1",
          userId: "u1",
          displayName: "Sam Beispiel",
          responsibleSince: "2026-09-13T10:00:00.000Z",
        },
      },
    ];

    expect(normalizeResponsibilityCustomers(rows).map((row) => row.customerId)).toEqual(["a", "b"]);
    expect(normalizeResponsibilityCustomers(rows)[1]?.responsibility).toBeNull();
  });

  it("dedupliziert Kandidaten nach userId und sortiert nach Anzeigename", () => {
    const rows: ResponsibilityCandidate[] = [
      { userId: "u2", displayName: "Zulu" },
      { userId: "u1", displayName: "Alpha" },
      { userId: "u1", displayName: "Alpha Duplikat" },
    ];

    expect(normalizeResponsibilityCandidates(rows)).toEqual([
      { userId: "u1", displayName: "Alpha" },
      { userId: "u2", displayName: "Zulu" },
    ]);
  });

  it("liefert für leere Providerergebnisse leere Sammlungen", () => {
    expect(normalizeResponsibilityCustomers([])).toEqual([]);
    expect(normalizeResponsibilityCandidates([])).toEqual([]);
  });
});
