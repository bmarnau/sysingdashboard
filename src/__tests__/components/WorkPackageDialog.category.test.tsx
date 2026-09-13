import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkPackageDialog } from "@/components/dashboard/dialogs/WorkPackageDialog";
import type { WorkPackage } from "@/lib/dashboard-data";
import type { ReferenceValue } from "@/lib/reference-data/types";

const SH_A = "11111111-1111-4111-8111-111111111111";

const categories: ReferenceValue[] = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    catalogId: "44444444-4444-4444-8444-444444444444",
    catalogKey: "workpackage.category",
    key: "incident",
    label: "Störung",
    description: "Operative Störung",
    sortOrder: 10,
    isActive: true,
    isDefault: false,
    parentValueId: null,
    attributes: {},
    validFrom: "2026-09-13T00:00:00.000Z",
    validTo: null,
    systemhouseId: SH_A,
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    catalogId: "44444444-4444-4444-8444-444444444444",
    catalogKey: "workpackage.category",
    key: "legacy",
    label: "Training",
    description: "Historischer Wert",
    sortOrder: 20,
    isActive: false,
    isDefault: false,
    parentValueId: null,
    attributes: {},
    validFrom: "2026-01-01T00:00:00.000Z",
    validTo: "2026-09-01T00:00:00.000Z",
    systemhouseId: SH_A,
  },
];

function workPackage(patch: Partial<WorkPackage> = {}): WorkPackage {
  return {
    id: "wp-1",
    title: "Firewall prüfen",
    projectId: null,
    client: "Kunde A",
    status: "offen",
    priority: "mittel",
    tags: ["Firewall"],
    ...patch,
  };
}

function renderDialog(
  wp: WorkPackage,
  options: { categoryValues?: ReferenceValue[]; categoryScopeResolved?: boolean } = {},
) {
  const onSave = vi.fn();
  const extraProps = {
    categoryValues: options.categoryValues ?? categories,
    categoryScopeResolved: options.categoryScopeResolved ?? true,
  } as Record<string, unknown>;

  render(
    <WorkPackageDialog
      wp={wp}
      projects={[]}
      onClose={vi.fn()}
      onSave={onSave}
      {...extraProps}
    />,
  );
  return { onSave };
}

describe("BSF-03D WorkPackageDialog Kategorie", () => {
  it("speichert eine aktive Kategorie als Key und Label-Snapshot", () => {
    const { onSave } = renderDialog(workPackage());

    const category = screen.getByRole("combobox", { name: /^Kategorie$/i });
    expect(screen.getByRole("option", { name: "— Keine Kategorie —" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Störung" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /^Training$/ })).toBeNull();

    fireEvent.change(category, { target: { value: "incident" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryKey: "incident",
        categoryLabel: "Störung",
        tags: ["Firewall"],
      }),
    );
  });

  it("zeigt eine historische deaktivierte Kategorie, bietet sie aber nicht als neue Auswahl an", () => {
    renderDialog(workPackage({ categoryKey: "legacy", categoryLabel: "Training" }));

    const category = screen.getByRole("combobox", { name: /^Kategorie$/i });
    expect(category).toHaveValue("legacy");
    expect(screen.getByRole("option", { name: "Training (deaktiviert)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Störung" })).toBeInTheDocument();
  });

  it("bleibt ohne eindeutigen Systemhauskontext fail-closed", () => {
    renderDialog(workPackage(), { categoryScopeResolved: false, categoryValues: [] });

    expect(screen.getByRole("combobox", { name: /^Kategorie$/i })).toBeDisabled();
    expect(screen.getByText(/eindeutiger Systemhauskontext/i)).toBeInTheDocument();
  });
});
