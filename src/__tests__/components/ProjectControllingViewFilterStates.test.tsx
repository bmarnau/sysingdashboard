import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectControllingView } from "@/components/project-controlling/ProjectControllingView";
import type { ProjectControllingFilters } from "@/lib/project-controlling/project-controlling-contract";

const filters: ProjectControllingFilters = {
  from: "2026-09-01",
  to: "2026-09-05",
  billable: "all",
};

describe("ProjectControllingView filter bar states (CONTROLLING-FILTER)", () => {
  it("keeps the filter bar visible while data is loading", () => {
    render(<ProjectControllingView state={{ kind: "loading" }} filters={filters} />);

    expect(screen.getByRole("region", { name: "Filter" })).toBeInTheDocument();
    expect(screen.getByText("Controlling-Daten werden geladen …")).toBeInTheDocument();
  });

  it("keeps the filter bar and offers a retry after a load error", () => {
    const onRetry = vi.fn();
    render(
      <ProjectControllingView state={{ kind: "error" }} filters={filters} onRetry={onRetry} />,
    );

    expect(screen.getByRole("region", { name: "Filter" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Projektcontrolling konnte nicht geladen werden.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("lets the user correct the range after an error", () => {
    const onFiltersChange = vi.fn();
    render(
      <ProjectControllingView
        state={{ kind: "error" }}
        filters={filters}
        onFiltersChange={onFiltersChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Bis"), { target: { value: "2026-09-10" } });

    expect(onFiltersChange).toHaveBeenCalledWith({ ...filters, to: "2026-09-10" });
  });

  it("shows field-level range errors without removing the filter bar", () => {
    render(
      <ProjectControllingView
        state={{ kind: "loading" }}
        filters={{ ...filters, from: "" }}
        filterErrors={{ from: "Bitte ein gültiges Von-Datum angeben." }}
      />,
    );

    expect(screen.getByRole("region", { name: "Filter" })).toBeInTheDocument();
    expect(screen.getByText("Bitte ein gültiges Von-Datum angeben.")).toBeInTheDocument();
    expect(screen.getByLabelText("Von")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows no retry button when no retry handler is provided", () => {
    render(<ProjectControllingView state={{ kind: "error" }} />);

    expect(screen.queryByRole("button", { name: "Erneut versuchen" })).not.toBeInTheDocument();
  });
});
