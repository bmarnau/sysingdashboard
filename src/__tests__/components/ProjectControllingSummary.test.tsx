import { render, screen, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";
import { ProjectControllingSummary as CurrentProjectControllingSummary } from "@/components/project-controlling/ProjectControllingSummary";
import type { ProjectControllingSummary as ProjectControllingSummaryContract } from "@/lib/project-controlling/project-controlling-contract";

const summary: ProjectControllingSummaryContract = {
  activities: 8,
  customers: 2,
  projects: 3,
  workPackages: 5,
  totalHours: 25,
  billableHours: 20,
  nonBillableHours: 5,
  billableQuotePercent: 80,
};

const ProjectControllingSummary = CurrentProjectControllingSummary as ComponentType<{
  summary: ProjectControllingSummaryContract;
}>;

function card(label: string): HTMLElement {
  const labelNode = screen.getByText(label);
  const cardNode = labelNode.closest("[data-kpi]");
  expect(cardNode).not.toBeNull();
  return cardNode as HTMLElement;
}

describe("BSF-03A ProjectControllingSummary", () => {
  it("renders the eight V1 KPIs from the provider-neutral summary without monetary values", () => {
    const { container } = render(<ProjectControllingSummary summary={summary} />);

    expect(screen.getByRole("region", { name: "Kennzahlen" })).toBeInTheDocument();
    expect(within(card("Gesamtstunden")).getByText("25,00 h")).toBeInTheDocument();
    expect(within(card("Abrechenbare Stunden")).getByText("20,00 h")).toBeInTheDocument();
    expect(within(card("Nicht abrechenbare Stunden")).getByText("5,00 h")).toBeInTheDocument();
    expect(within(card("Billable-Quote")).getByText("80 %")).toBeInTheDocument();
    expect(within(card("Tätigkeiten")).getByText("8")).toBeInTheDocument();
    expect(within(card("Kunden")).getByText("2")).toBeInTheDocument();
    expect(within(card("Projekte")).getByText("3")).toBeInTheDocument();
    expect(within(card("Arbeitspakete")).getByText("5")).toBeInTheDocument();

    expect(container.textContent).not.toMatch(/€|\bEUR\b|\bEuro\b/i);
  });
});
