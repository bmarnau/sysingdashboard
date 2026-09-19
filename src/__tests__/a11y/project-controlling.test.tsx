/**
 * BSF-03A — Accessibility-Vertrag für Projektcontrolling.
 */
/// <reference types="vitest-axe/extend-expect" />
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import { ProjectControllingView } from "@/components/project-controlling/ProjectControllingView";
import type { ProjectControllingResult } from "@/lib/project-controlling/project-controlling-contract";

const SYSTEMHOUSE_ID = "11111111-1111-4111-8111-111111111111";
const CUSTOMER_ID = "22222222-2222-4222-8222-222222222222";

function result(rows: ProjectControllingResult["rows"]): ProjectControllingResult {
  return {
    filters: {
      from: "2026-09-01",
      to: "2026-09-05",
      billable: "all",
      systemhouseId: SYSTEMHOUSE_ID,
    },
    summary: {
      activities: rows.length,
      customers: rows.length ? 1 : 0,
      projects: rows.some((row) => row.projectSourceId) ? 1 : 0,
      workPackages: rows.some((row) => row.workPackageSourceId) ? 1 : 0,
      totalHours: rows.reduce((sum, row) => sum + row.durationHours, 0),
      billableHours: rows
        .filter((row) => row.billable)
        .reduce((sum, row) => sum + row.durationHours, 0),
      nonBillableHours: rows
        .filter((row) => !row.billable)
        .reduce((sum, row) => sum + row.durationHours, 0),
      billableQuotePercent: rows.length ? 50 : 0,
    },
    trend: [
      { date: "2026-09-01", totalHours: 2, billableHours: 1, nonBillableHours: 1 },
      { date: "2026-09-02", totalHours: 0, billableHours: 0, nonBillableHours: 0 },
    ],
    scopeOptions: [
      { kind: "systemhouse", label: "Systemhaus Nord", systemhouseId: SYSTEMHOUSE_ID },
      {
        kind: "customer",
        label: "Kunde Alpha",
        systemhouseId: SYSTEMHOUSE_ID,
        customerId: CUSTOMER_ID,
      },
      {
        kind: "category",
        label: "Wartung",
        systemhouseId: SYSTEMHOUSE_ID,
        categoryKey: "wartung",
        active: false,
      },
    ],
    rows,
    completeness: {
      categoryUnobservedRows: rows.filter((row) => row.categoryState === "unobserved").length,
      categoryUnknownRows: rows.filter((row) => row.categoryState === "unknown").length,
      rowsWithoutProject: rows.filter((row) => !row.projectSourceId).length,
      rowsWithoutWorkPackage: rows.filter((row) => !row.workPackageSourceId).length,
    },
    oldestPublishedAt: null,
    latestPublishedAt: null,
  };
}

const historicalRows: ProjectControllingResult["rows"] = [
  {
    activityId: "a-legacy",
    activityDate: "2026-09-01",
    activityTitle: "Legacy-Zuordnung prüfen",
    durationHours: 1,
    billable: true,
    billingStatus: "open",
    systemhouseId: SYSTEMHOUSE_ID,
    systemhouseName: "Systemhaus Nord",
    customerId: CUSTOMER_ID,
    customerName: "Kunde Alpha",
    projectSourceId: null,
    projectName: null,
    workPackageSourceId: null,
    workPackageTitle: null,
    categoryObserved: false,
    categoryKey: null,
    categoryLabel: null,
    categoryState: "unobserved",
  },
  {
    activityId: "a-unknown",
    activityDate: "2026-09-01",
    activityTitle: "Unbekannte Kategorie prüfen",
    durationHours: 1,
    billable: false,
    billingStatus: null,
    systemhouseId: SYSTEMHOUSE_ID,
    systemhouseName: "Systemhaus Nord",
    customerId: CUSTOMER_ID,
    customerName: "Kunde Alpha",
    projectSourceId: "project-alpha",
    projectName: "Projekt Alpha",
    workPackageSourceId: "wp-alpha",
    workPackageTitle: "Arbeitspaket Alpha",
    categoryObserved: true,
    categoryKey: "legacy-key",
    categoryLabel: null,
    categoryState: "unknown",
  },
];

describe("BSF-03A Projektcontrolling – Accessibility", () => {
  it("Filter, KPI, Trend und Drill-down haben keine axe-Violations", async () => {
    const { container } = render(
      <ProjectControllingView state={{ kind: "ready", result: result(historicalRows) }} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it("Empty State hat keine axe-Violations", async () => {
    const { container } = render(
      <ProjectControllingView state={{ kind: "ready", result: result([]) }} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it("Loading und Error State bleiben zugänglich", async () => {
    const loading = render(<ProjectControllingView state={{ kind: "loading" }} />);
    expect(await axe(loading.container)).toHaveNoViolations();
    loading.unmount();

    const error = render(<ProjectControllingView state={{ kind: "error" }} />);
    expect(await axe(error.container)).toHaveNoViolations();
  });
});
