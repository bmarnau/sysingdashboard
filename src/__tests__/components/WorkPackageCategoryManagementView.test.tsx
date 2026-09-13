import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { describe, expect, it, vi } from "vitest";
import {
  WorkPackageCategoryManagementView,
  type WorkPackageCategoryManagementViewState,
} from "@/components/reference-data/WorkPackageCategoryManagementView";

const SH_A = "11111111-1111-4111-8111-111111111111";
const SH_B = "22222222-2222-4222-8222-222222222222";

const readyState: WorkPackageCategoryManagementViewState = {
  kind: "ready",
  payload: {
    scopes: [{ systemhouseId: SH_A, systemhouseName: "Systemhaus A" }],
    selectedSystemhouseId: SH_A,
    values: [
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
    ],
  },
};

describe("WorkPackageCategoryManagementView", () => {
  it("zeigt einen barrierefreien Ladezustand", async () => {
    const { container } = render(
      <WorkPackageCategoryManagementView
        state={{ kind: "loading" }}
        canManage
        onSystemhouseChange={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDeactivate={vi.fn()}
      />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("zeigt aktiven und deaktivierten Bestand ohne unnoetige Systemhausauswahl bei genau einem Scope", () => {
    render(
      <WorkPackageCategoryManagementView
        state={readyState}
        canManage
        onSystemhouseChange={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDeactivate={vi.fn()}
      />,
    );
    expect(screen.getByText("Störung")).toBeInTheDocument();
    expect(screen.getByText("Training")).toBeInTheDocument();
    expect(screen.getByText("Deaktiviert")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Systemhaus/i })).toBeNull();
  });

  it("erzwingt bei mehreren Scopes eine explizite Systemhausauswahl", () => {
    const onSystemhouseChange = vi.fn();
    const state: WorkPackageCategoryManagementViewState = {
      kind: "ready",
      payload: {
        ...readyState.payload,
        scopes: [
          { systemhouseId: SH_A, systemhouseName: "Systemhaus A" },
          { systemhouseId: SH_B, systemhouseName: "Systemhaus B" },
        ],
      },
    };
    render(
      <WorkPackageCategoryManagementView
        state={state}
        canManage
        onSystemhouseChange={onSystemhouseChange}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDeactivate={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("combobox", { name: /Systemhaus/i }), {
      target: { value: SH_B },
    });
    expect(onSystemhouseChange).toHaveBeenCalledWith(SH_B);
  });

  it("versteckt Schreibkontrollen ohne Manage-Recht", () => {
    render(
      <WorkPackageCategoryManagementView
        state={readyState}
        canManage={false}
        onSystemhouseChange={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDeactivate={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Neue Kategorie/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Bearbeiten/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Deaktivieren/i })).toBeNull();
  });

  it("bietet bei Manage-Recht Anlegen, Bearbeiten und Deaktivieren an", () => {
    render(
      <WorkPackageCategoryManagementView
        state={readyState}
        canManage
        onSystemhouseChange={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDeactivate={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Neue Kategorie/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Bearbeiten/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Deaktivieren/i }).length).toBeGreaterThan(0);
  });
});
