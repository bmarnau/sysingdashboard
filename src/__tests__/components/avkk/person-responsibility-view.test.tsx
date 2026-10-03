import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersonResponsibilityTable } from "@/components/avkk/person/PersonResponsibilityTable";
import type { ResponsibilityPersonViewRow } from "@/lib/avkk/responsibility-management.types";

const owner: ResponsibilityPersonViewRow = {
  responsibilityId: "11111111-1111-4111-8111-111111111111",
  personId: "22222222-2222-4222-8222-222222222222",
  displayName: "Ada Beispiel",
  role: "owner",
  subjectType: "project",
  subjectId: "project-1",
  title: "Netzwerk",
  systemhouseId: "33333333-3333-4333-8333-333333333333",
  customerId: "44444444-4444-4444-8444-444444444444",
  customerName: "Kunde",
  status: "active",
  due: null,
  atRisk: true,
  riskReasons: ["Kompetenz fehlt"],
  validFrom: "2026-09-01",
  validTo: null,
};

describe("PersonResponsibilityTable", () => {
  it("shows transfer and add-deputy only for owners", () => {
    render(
      <PersonResponsibilityTable
        rows={[
          owner,
          { ...owner, responsibilityId: "55555555-5555-4555-8555-555555555555", role: "deputy" },
        ]}
        canMutate
        onTransfer={vi.fn()}
        onAddDeputy={vi.fn()}
        onEnd={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("button", { name: "Verantwortung übertragen" })).not.toHaveLength(0);
    expect(screen.getAllByRole("button", { name: "Stellvertretung hinzufügen" })).not.toHaveLength(
      0,
    );
    expect(screen.getAllByRole("button", { name: "Stellvertretung beenden" })).not.toHaveLength(0);
    expect(screen.getAllByText(/Risiko: Kompetenz fehlt/)).not.toHaveLength(0);
  });

  it("hides all mutation actions without assign permission", () => {
    render(
      <PersonResponsibilityTable
        rows={[owner]}
        canMutate={false}
        onTransfer={vi.fn()}
        onAddDeputy={vi.fn()}
        onEnd={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", {
        name: /Verantwortung übertragen|Stellvertretung hinzufügen|Stellvertretung beenden/,
      }),
    ).toBeNull();
  });

  it("calls the matching owner action", () => {
    const transfer = vi.fn();
    render(
      <PersonResponsibilityTable
        rows={[owner]}
        canMutate
        onTransfer={transfer}
        onAddDeputy={vi.fn()}
        onEnd={vi.fn()}
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Verantwortung übertragen" })[0]);
    expect(transfer).toHaveBeenCalledWith(owner);
  });
});
