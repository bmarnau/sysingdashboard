import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

function successfulSave() {
  return vi.fn(async () => true);
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
        onSave={successfulSave()}
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
        onSave={successfulSave()}
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
        onSave={successfulSave()}
      />,
    );

    expect(screen.getByRole("option", { name: "Georg Marnau" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Petra Marnau" })).toBeInTheDocument();
  });

  it("blockiert eine identische bereits aktive Zuordnung", () => {
    const onSave = successfulSave();
    render(
      <AvkkResponsibilitySection
        responsibilities={[responsibility("user-sam")]}
        people={[{ id: "user-sam", displayName: "Sam Marnau" }]}
        roles={[role]}
        types={[type]}
        readOnly={false}
        saving={false}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Person"), { target: { value: "user-sam" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Umsetzung" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Diese Verantwortung ist bereits aktiv zugeordnet.",
    );
    expect(screen.getByRole("button", { name: "Verantwortung zuordnen" })).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("setzt das Neuanlageformular erst nach erfolgreichem Speichern zurueck", async () => {
    const onSave = successfulSave();
    render(
      <AvkkResponsibilitySection
        responsibilities={[]}
        people={[{ id: "user-sam", displayName: "Sam Marnau" }]}
        roles={[role]}
        types={[type]}
        readOnly={false}
        saving={false}
        onSave={onSave}
      />,
    );

    const person = screen.getByLabelText("Person");
    const responsibilityType = screen.getByRole("checkbox", { name: "Umsetzung" });
    const note = screen.getByLabelText("Notiz (optional)");

    fireEvent.change(person, { target: { value: "user-sam" } });
    fireEvent.click(responsibilityType);
    fireEvent.change(note, { target: { value: "Testdelegation" } });
    fireEvent.click(screen.getByRole("button", { name: "Verantwortung zuordnen" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(person).toHaveValue(""));
    expect(responsibilityType).not.toBeChecked();
    expect(note).toHaveValue("");
    expect(screen.getByLabelText("Rolle")).toHaveValue("owner");
  });

  it("behaelt die Eingabe wenn Speichern fehlschlaegt", async () => {
    const onSave = vi.fn(async () => false);
    render(
      <AvkkResponsibilitySection
        responsibilities={[]}
        people={[{ id: "user-sam", displayName: "Sam Marnau" }]}
        roles={[role]}
        types={[type]}
        readOnly={false}
        saving={false}
        onSave={onSave}
      />,
    );

    const person = screen.getByLabelText("Person");
    const responsibilityType = screen.getByRole("checkbox", { name: "Umsetzung" });
    const note = screen.getByLabelText("Notiz (optional)");

    fireEvent.change(person, { target: { value: "user-sam" } });
    fireEvent.click(responsibilityType);
    fireEvent.change(note, { target: { value: "Nicht verloren" } });
    fireEvent.click(screen.getByRole("button", { name: "Verantwortung zuordnen" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(person).toHaveValue("user-sam");
    expect(responsibilityType).toBeChecked();
    expect(note).toHaveValue("Nicht verloren");
  });
});
