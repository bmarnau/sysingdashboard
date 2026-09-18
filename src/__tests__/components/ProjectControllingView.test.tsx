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
  trend: [
    { date: "2026-09-01", totalHours: 5, billableHours: 4, nonBillableHours: 1 },
    { date: "2026-09-02", totalHours: 0, billableHours: 0, nonBillableHours: 0 },
  ],
  scopeOptions: [
    {
      kind: "systemhouse",
      label: "Systemhaus Nord",
      systemhouseId: "11111111-1111-4111-8111-111111111111",
    },
    {
      kind: "customer",
      label: "Kunde Alpha",
      systemhouseId: "11111111-1111-4111-8111-111111111111",
      customerId: "22222222-2222-4222-8222-222222222222",
    },
    {
      kind: "project",
      label: "Projekt Alpha",
      systemhouseId: "11111111-1111-4111-8111-111111111111",
      customerId: "22222222-2222-4222-8222-222222222222",
      projectSourceId: "project-alpha",
    },
    {
      kind: "workPackage",
      label: "Arbeitspaket A",
      systemhouseId: "11111111-1111-4111-8111-111111111111",
      customerId: "22222222-2222-4222-8222-222222222222",
      projectSourceId: "project-alpha",
      workPackageSourceId: "wp-a",
    },
  ],
  rows: [
    {
      activityId: "a-1",
      activityDate: "2026-09-01",
      activityTitle: "Patch-Analyse",
      durationHours: 2,
      billable: true,
      billingStatus: "open",
      systemhouseId: "11111111-1111-4111-8111-111111111111",
      systemhouseName: "Systemhaus Nord",
      customerId: "22222222-2222-4222-8222-222222222222",
      customerName: "Kunde Alpha",
      projectSourceId: "project-alpha",
      projectName: "Projekt Alpha",
      workPackageSourceId: "wp-a",
      workPackageTitle: "Arbeitspaket A",
      categoryObserved: false,
      categoryKey: null,
      categoryLabel: null,
      categoryState: "unobserved",
    },
    {
      activityId: "a-2",
      activityDate: "2026-09-01",
      activityTitle: "Dokumentation",
      durationHours: 1,
      billable: false,
      billingStatus: null,
      systemhouseId: "11111111-1111-4111-8111-111111111111",
      systemhouseName: "Systemhaus Nord",
      customerId: "22222222-2222-4222-8222-222222222222",
      customerName: "Kunde Alpha",
      projectSourceId: null,
      projectName: null,
      workPackageSourceId: null,
      workPackageTitle: null,
      categoryObserved: true,
      categoryKey: null,
      categoryLabel: null,
      categoryState: "none",
    },
    {
      activityId: "a-3",
      activityDate: "2026-09-02",
      activityTitle: "Altbestand prüfen",
      durationHours: 1,
      billable: true,
      billingStatus: "open",
      systemhouseId: "11111111-1111-4111-8111-111111111111",
      systemhouseName: "Systemhaus Nord",
      customerId: "22222222-2222-4222-8222-222222222222",
      customerName: "Kunde Alpha",
      projectSourceId: "project-alpha",
      projectName: "Projekt Alpha",
      workPackageSourceId: "wp-a",
      workPackageTitle: "Arbeitspaket A",
      categoryObserved: true,
      categoryKey: "wartung",
      categoryLabel: "Wartung",
      categoryState: "inactive",
    },
    {
      activityId: "a-4",
      activityDate: "2026-09-02",
      activityTitle: "Legacy prüfen",
      durationHours: 1,
      billable: true,
      billingStatus: "open",
      systemhouseId: "11111111-1111-4111-8111-111111111111",
      systemhouseName: "Systemhaus Nord",
      customerId: "22222222-2222-4222-8222-222222222222",
      customerName: "Kunde Alpha",
      projectSourceId: "project-alpha",
      projectName: "Projekt Alpha",
      workPackageSourceId: "wp-a",
      workPackageTitle: "Arbeitspaket A",
      categoryObserved: true,
      categoryKey: "legacy-key",
      categoryLabel: null,
      categoryState: "unknown",
    },
  ],
  completeness: {
    categoryUnobservedRows: 1,
    categoryUnknownRows: 1,
    rowsWithoutProject: 1,
    rowsWithoutWorkPackage: 1,
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

  it("renders the read-only filters, daily trend and drill-down without exposing internal UUIDs", () => {
    render(<ProjectControllingView state={{ kind: "ready", result }} />);

    expect(screen.getByRole("region", { name: "Filter" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Täglicher Stundenverlauf" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Drill-down" })).toBeInTheDocument();

    expect(screen.getByText("Patch-Analyse")).toBeInTheDocument();
    expect(screen.getByText("Ohne Projekt")).toBeInTheDocument();
    expect(screen.getByText("Ohne Arbeitspaket")).toBeInTheDocument();
    expect(screen.getByText("Kategorie nicht publiziert")).toBeInTheDocument();
    expect(screen.getByText("Keine Kategorie")).toBeInTheDocument();
    expect(screen.getByText("Wartung (inaktiv)")).toBeInTheDocument();
    expect(screen.getByText("Unbekannte Kategorie (legacy-key)")).toBeInTheDocument();

    expect(screen.queryByText("11111111-1111-4111-8111-111111111111")).not.toBeInTheDocument();
    expect(screen.queryByText("22222222-2222-4222-8222-222222222222")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /bearbeiten|finalisieren/i })).not.toBeInTheDocument();
  });
});
