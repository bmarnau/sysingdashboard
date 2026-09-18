import { render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";
import { ProjectControllingView as CurrentProjectControllingView } from "@/components/project-controlling/ProjectControllingView";
import type { ProjectControllingResult } from "@/lib/project-controlling/project-controlling-contract";

const result: ProjectControllingResult = {
  filters: {
    from: "2026-09-01",
    to: "2026-09-05",
    billable: "all",
  },
  summary: {
    activities: 8,
    customers: 2,
    projects: 3,
    workPackages: 5,
    totalHours: 25,
    billableHours: 20,
    nonBillableHours: 5,
    billableQuotePercent: 80,
  },
  trend: [],
  scopeOptions: [],
  rows: [],
  completeness: {
    categoryUnobservedRows: 0,
    categoryUnknownRows: 0,
    rowsWithoutProject: 0,
    rowsWithoutWorkPackage: 0,
  },
};

type ProjectControllingViewState =
  | { kind: "loading" }
  | { kind: "ready"; result: ProjectControllingResult }
  | { kind: "error" };

const ProjectControllingView = CurrentProjectControllingView as unknown as ComponentType<{
  state: ProjectControllingViewState;
}>;

describe("BSF-03A ProjectControllingView", () => {
  it("renders provider-neutral KPI data when the server result is ready", () => {
    render(<ProjectControllingView state={{ kind: "ready", result }} />);

    expect(screen.getByRole("region", { name: "Kennzahlen" })).toBeInTheDocument();
    expect(screen.getByText("25,00 h")).toBeInTheDocument();
    expect(screen.getByText("80 %")).toBeInTheDocument();
  });
});
