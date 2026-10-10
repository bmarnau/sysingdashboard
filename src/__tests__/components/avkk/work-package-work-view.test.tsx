import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkPackageWorkView } from "@/components/avkk/work/WorkPackageWorkView";
import type { WorkPackageWorkViewRow } from "@/lib/avkk/work-package-work-view.types";

const read = vi.hoisted(() => ({
  rows: [] as WorkPackageWorkViewRow[],
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
}));
vi.mock("@/hooks/useWorkPackageWorkView", () => ({ useWorkPackageWorkView: () => read }));

const base: WorkPackageWorkViewRow = {
  workPackageId: "AP-1",
  sourceId: "WP-1",
  systemhouseId: "SH-A",
  customerId: "C-A",
  customerName: "Alpha GmbH",
  title: "Zulu Migration",
  status: "open",
  due: "2026-10-03",
  dueGroup: "OVERDUE",
  owner: { personId: "person-a", displayName: "Ada Beispiel" },
  deputies: [{ personId: "person-b", displayName: "Berta Beispiel" }],
  asOfDate: "2026-10-04",
};
const fixture: WorkPackageWorkViewRow[] = [
  base,
  {
    ...base,
    workPackageId: "AP-2",
    title: "Alpha Wartung",
    due: "2026-10-04",
    dueGroup: "TODAY",
    deputies: [],
  },
  {
    ...base,
    workPackageId: "AP-3",
    customerId: "C-B",
    customerName: "Beta GmbH",
    title: "Beta Planung",
    due: "2026-10-05",
    dueGroup: "FUTURE",
    owner: "UNASSIGNED",
    deputies: [],
  },
  {
    ...base,
    workPackageId: "AP-4",
    customerId: "C-B",
    customerName: "Beta GmbH",
    title: "Ohne Termin",
    status: "done",
    due: null,
    dueGroup: "NO_DUE_DATE",
    owner: "UNASSIGNED",
    deputies: [],
  },
];
function ids() {
  return [...document.querySelectorAll("[data-work-package-id]")].map((row) =>
    row.getAttribute("data-work-package-id"),
  );
}
function choose(name: string, value: string) {
  fireEvent.change(screen.getByRole("combobox", { name }), { target: { value } });
}

describe("operative AP-Arbeitssicht", () => {
  beforeEach(() => {
    read.rows = fixture;
    read.loading = false;
    read.error = null;
    read.refresh.mockReset();
  });

  it("preserves stable AP ids across all groupings and shows owner, deputies and unassigned", () => {
    render(<WorkPackageWorkView />);
    for (const mode of ["customer", "owner", "due"]) {
      choose("Gruppieren nach", mode);
      expect(ids().sort()).toEqual(["AP-1", "AP-2", "AP-3", "AP-4"]);
      expect(screen.getAllByText("Nicht zugeordnet").length).toBeGreaterThan(0);
      expect(screen.getByText("Berta Beispiel")).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: /Überfällig/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Heute/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Später/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Ohne Fälligkeitsdatum/ })).toBeInTheDocument();
    expect(screen.getByText(/04\.10\.2026.*Europe\/Berlin/)).toBeInTheDocument();
    expect(screen.queryByText("person-a")).toBeNull();
  });

  it("changes row sorting independently of grouping", () => {
    render(<WorkPackageWorkView />);
    expect(ids().slice(0, 2)).toEqual(["AP-1", "AP-2"]);
    choose("Sortieren nach", "title");
    expect(ids().slice(0, 2)).toEqual(["AP-2", "AP-1"]);
    choose("Sortierrichtung", "desc");
    expect(ids().slice(0, 2)).toEqual(["AP-1", "AP-2"]);
    expect(screen.getByRole("combobox", { name: "Gruppieren nach" })).toHaveValue("customer");
  });

  it("keeps explicit filters on group changes and resets only filters", () => {
    render(<WorkPackageWorkView />);
    choose("Verantwortlichen filtern", "UNASSIGNED");
    choose("Gruppieren nach", "due");
    choose("Sortieren nach", "title");
    expect(ids().sort()).toEqual(["AP-3", "AP-4"]);
    choose("Fälligkeit filtern", "NO_DUE_DATE");
    expect(ids()).toEqual(["AP-4"]);
    fireEvent.click(screen.getByRole("button", { name: "Filter zurücksetzen" }));
    expect(ids().sort()).toEqual(["AP-1", "AP-2", "AP-3", "AP-4"]);
    expect(screen.getByRole("combobox", { name: "Gruppieren nach" })).toHaveValue("due");
    expect(screen.getByRole("combobox", { name: "Sortieren nach" })).toHaveValue("title");
  });

  it("combines customer, status and text filters without hiding unassigned by default", () => {
    render(<WorkPackageWorkView />);
    choose("Kunde filtern", "C-B");
    choose("Status filtern", "done");
    fireEvent.change(screen.getByRole("searchbox", { name: "Arbeitspakete suchen" }), {
      target: { value: "Termin" },
    });
    expect(ids()).toEqual(["AP-4"]);
    expect(screen.getByText(/1 von 4/)).toBeInTheDocument();
  });

  it("distinguishes an empty filtered result from an empty authorized source", () => {
    const { rerender } = render(<WorkPackageWorkView />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Arbeitspakete suchen" }), {
      target: { value: "nicht vorhanden" },
    });
    expect(screen.getByText(/Keine Arbeitspakete entsprechen den Filtern/)).toBeInTheDocument();
    read.rows = [];
    rerender(<WorkPackageWorkView />);
    expect(screen.getByText(/Keine Arbeitspakete im freigegebenen Bereich/)).toBeInTheDocument();
  });

  it("hides rows in loading and error states while keeping refresh available", () => {
    read.loading = true;
    const { rerender } = render(<WorkPackageWorkView />);
    expect(ids()).toEqual([]);
    expect(screen.getByText(/Arbeitspakete werden geladen/)).toBeInTheDocument();
    read.loading = false;
    read.error = "Die Arbeitspakete konnten nicht geladen werden.";
    rerender(<WorkPackageWorkView />);
    expect(ids()).toEqual([]);
    expect(screen.getByRole("alert")).toHaveTextContent(read.error);
    fireEvent.click(screen.getByRole("button", { name: "Arbeitspakete aktualisieren" }));
    expect(read.refresh).toHaveBeenCalledTimes(1);
  });
});
