import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  disambiguateLabels,
  workDateLabel,
  workStatusLabel,
} from "@/components/avkk/work/work-view-presentation";
import { WorkPackageWorkViewControls } from "@/components/avkk/work/WorkPackageWorkViewControls";
import { selectWorkPackageWorkView } from "@/lib/avkk/work-package-work-view";
import type { WorkPackageWorkViewRow } from "@/lib/avkk/work-package-work-view.types";

function row(id: string, due: string | null, extra: Partial<WorkPackageWorkViewRow> = {}) {
  return {
    workPackageId: id,
    sourceId: id,
    systemhouseId: "sh",
    customerId: "c1",
    customerName: "Muster GmbH",
    title: id,
    status: "open",
    due,
    dueGroup: due ? "FUTURE" : "NO_DUE_DATE",
    owner: "UNASSIGNED",
    deputies: [],
    asOfDate: "2026-10-10",
    ...extra,
  } as WorkPackageWorkViewRow;
}

describe("BSF-03E P3b-2 Präsentation", () => {
  it("keeps 'Ohne Fälligkeitsdatum' last in both due sort directions", () => {
    const rows = [row("none", null), row("a", "2026-10-11"), row("b", "2026-10-20")];
    for (const sortDirection of ["asc", "desc"] as const) {
      const [group] = selectWorkPackageWorkView(rows, {
        groupBy: "customer",
        sortBy: "due",
        sortDirection,
        filters: {},
      });
      expect(group.rows.at(-1)?.workPackageId).toBe("none");
    }
  });

  it("formats valid dates and never shows malformed raw dates", () => {
    expect(workDateLabel("2026-10-04")).toBe("04.10.2026");
    expect(workDateLabel("2026-10-04T00:00:00Z")).toBe("Datum unbekannt");
  });

  it("humanizes unknown status values", () => {
    expect(workStatusLabel("blocked_by_customer")).toBe("Blocked by customer");
    expect(workStatusLabel("OPEN")).toBe("Offen");
  });

  it("disambiguates equal names without ids", () => {
    const out = disambiguateLabels([{ label: "Anna" }, { label: "Anna" }, { label: "Ben" }]);
    expect(out.map((o) => o.label)).toEqual([
      "Anna (gleichnamig 1)",
      "Anna (gleichnamig 2)",
      "Ben",
    ]);
  });

  it("shows an active filter whose option vanished after refresh", () => {
    render(
      <WorkPackageWorkViewControls
        rows={[row("a", null)]}
        selection={{
          groupBy: "customer",
          sortBy: "due",
          sortDirection: "asc",
          filters: { customerIds: ["gone"] },
        }}
        onChange={() => {}}
        disabled={false}
      />,
    );
    const select = screen.getByRole("combobox", { name: "Kunde filtern" }) as HTMLSelectElement;
    expect(select.value).toBe("gone");
    expect(select.selectedOptions[0].textContent).toBe("Nicht mehr in den aktuellen Daten");
    expect(screen.getByText(/Filter ist noch aktiv/)).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "" } });
  });
});
