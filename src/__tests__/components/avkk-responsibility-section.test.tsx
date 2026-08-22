import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AvkkResponsibilitySection } from "@/components/avkk/AvkkResponsibilitySection";
import type { AvkkResponsibility } from "@/lib/avkk";
import type { ReferenceValue } from "@/lib/reference-data";

const role: ReferenceValue = {
  id: "role-1",
  catalogId: "catalog-role",
  catalogKey: "avkk.responsibility_role",
  key: "owner",
  label: "Verantwortlicher",
  description: "",
  sortOrder: 1,
  isActive: true,
  isDefault: true,
  parentValueId: null,
  attributes: {},
  validFrom: "2026-08-01T00:00:00Z",
  validTo: null,
};

const type: ReferenceValue = {
  ...role,
  id: "type-1",
  catalogId: "catalog-type",
  catalogKey: "avkk.responsibility_type",
  key: "delivery",
  label: "Umsetzung",
};

function responsibility(personId: string): AvkkResponsibility {
  return {
    id: "resp-1",
    subjectRef: "subject-1",
    personId,
    roleKey: "owner",
    roleLabel: "Verantwortlicher",
    types: [{ valueId: "type-1", key: "delivery", label: "Umsetzung" }],
    note: "",
    validFrom: "2026-08-22T00:00:00Z",
    validTo: null,
  };
}

describe("AvkkResponsibilitySection", () => {
  it("zeigt fuer bekannte Verantwortliche den vollstaendigen Namen", () => {
    render(
      <AvkkResponsibilitySection
        responsibilities={[responsibility("user-alex")]}
        people={[{ id: "user-alex", displayName: "Alex Marnau" }]}
        roles={[role]}
        types={[type]}
        readOnly
        saving={false}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText(/Alex Marnau — Verantwortlicher/)).toBeInTheDocument();
  });

  it("gibt eine unbekannte technische ID nicht als Personenname aus", () => {
    render(
      <AvkkResponsibilitySection
        responsibilities={[responsibility("29a5515d-9166-41d4-868c-0ac1f22b2bb4")]}
        people={[]}
        roles={[role]}
        types={[type]}
        readOnly
        saving={false}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText(/Person nicht verfuegbar|Person nicht verfügbar/)).toBeInTheDocument();
    expect(screen.queryByText("29a5515d-9166-41d4-868c-0ac1f22b2bb4")).not.toBeInTheDocument();
  });

  it("bietet vollstaendige Namen im Delegationsfeld an", () => {
    render(
      <AvkkResponsibilitySection
        responsibilities={[]}
        people={[
          { id: "user-georg", displayName: "Georg Marnau" },
          { id: "user-petra", displayName: "Petra Marnau" },
        ]}
        roles={[role]}
        types={[type]}
        readOnly={false}
        saving={false}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole("option", { name: "Georg Marnau" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Petra Marnau" })).toBeInTheDocument();
  });
});
