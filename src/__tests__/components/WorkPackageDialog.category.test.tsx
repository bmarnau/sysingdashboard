/**
 * BSF-03D (#103) — Kategorie-Select im Arbeitspaket-Dialog.
 * Default „— Keine Kategorie —“, aktive Werte, deaktivierter Altbestand bleibt
 * nachvollziehbar, Tags unabhängig, A11y (axe) ohne Verstöße.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { describe, expect, it, vi } from "vitest";
import { WorkPackageDialog } from "@/components/dashboard/dialogs/WorkPackageDialog";
import type { WorkPackageCategoryContext } from "@/components/dashboard/dialogs/WorkPackageDialog";
import type { ReferenceValue } from "@/lib/reference-data";
import { makeWorkPackage } from "../fixtures/workpackages";

function value(key: string, label: string, isActive = true): ReferenceValue {
  return {
    id: key,
    catalogId: "c",
    catalogKey: "workpackage.category",
    key,
    label,
    description: "",
    sortOrder: key === "netzwerk" ? 1 : 2,
    isActive,
    isDefault: false,
    parentValueId: null,
    attributes: {},
    validFrom: "2026-01-01",
    validTo: null,
    systemhouseId: "sh-1",
  };
}

const ctx = (over: Partial<WorkPackageCategoryContext> = {}): WorkPackageCategoryContext => ({
  status: "ready",
  values: [value("netzwerk", "Netzwerk"), value("legacy", "Altkategorie", false)],
  systemhouses: [{ id: "sh-1", name: "Systemhaus A" }],
  selectedSystemhouseId: "sh-1",
  onSelectSystemhouse: () => {},
  ...over,
});

describe("WorkPackageDialog — Kategorie", () => {
  it("should_defaultToNoCategory_andListOnlyActiveValues", () => {
    render(
      <WorkPackageDialog
        wp={makeWorkPackage({ title: "" })}
        projects={[]}
        onClose={() => {}}
        onSave={() => {}}
        categories={ctx()}
      />,
    );
    const select = screen.getByLabelText(/^Kategorie/) as HTMLSelectElement;
    expect(select.value).toBe("");
    const labels = Array.from(select.options).map((o) => o.textContent);
    expect(labels).toEqual(["— Keine Kategorie —", "Netzwerk"]);
  });

  it("should_keepDeactivatedCategoryVisible_forExistingWorkPackage", () => {
    render(
      <WorkPackageDialog
        wp={makeWorkPackage({ categoryKey: "legacy" })}
        projects={[]}
        onClose={() => {}}
        onSave={() => {}}
        categories={ctx()}
      />,
    );
    const select = screen.getByLabelText(/^Kategorie/) as HTMLSelectElement;
    expect(select.value).toBe("legacy");
    expect(Array.from(select.options).map((o) => o.textContent)).toContain(
      "Altkategorie (deaktiviert)",
    );
  });

  it("should_saveCategoryKey_andLeaveTagsPriorityStatusUntouched", () => {
    const onSave = vi.fn();
    render(
      <WorkPackageDialog
        wp={makeWorkPackage({ tags: ["x"], priority: "hoch", status: "offen" })}
        projects={[]}
        onClose={() => {}}
        onSave={onSave}
        categories={ctx()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/^Kategorie/), { target: { value: "netzwerk" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryKey: "netzwerk",
        tags: ["x"],
        priority: "hoch",
        status: "offen",
      }),
    );
  });

  it("should_saveNull_when_noCategoryChosen", () => {
    const onSave = vi.fn();
    render(
      <WorkPackageDialog
        wp={makeWorkPackage({ categoryKey: "netzwerk" })}
        projects={[]}
        onClose={() => {}}
        onSave={onSave}
        categories={ctx()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/^Kategorie/), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    expect(onSave.mock.calls[0]?.[0].categoryKey).toBeNull();
  });

  it("should_requireExplicitSystemhouse_when_multipleMemberships", () => {
    render(
      <WorkPackageDialog
        wp={makeWorkPackage()}
        projects={[]}
        onClose={() => {}}
        onSave={() => {}}
        categories={ctx({
          status: "select-systemhouse",
          values: [],
          selectedSystemhouseId: null,
          systemhouses: [
            { id: "sh-1", name: "A" },
            { id: "sh-2", name: "B" },
          ],
        })}
      />,
    );
    expect(screen.getByLabelText(/^Systemhaus$/)).toBeInTheDocument();
    expect((screen.getByLabelText(/^Kategorie/) as HTMLSelectElement).disabled).toBe(true);
  });

  it("should_stillRenderWithoutCategoryContext_backwardsCompatible", () => {
    render(
      <WorkPackageDialog
        wp={makeWorkPackage()}
        projects={[]}
        onClose={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.queryByLabelText(/^Kategorie/)).toBeNull();
  });

  it("should_haveNoA11yViolations", async () => {
    const { container } = render(
      <WorkPackageDialog
        wp={makeWorkPackage({ categoryKey: "legacy" })}
        projects={[]}
        onClose={() => {}}
        onSave={() => {}}
        categories={ctx()}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
