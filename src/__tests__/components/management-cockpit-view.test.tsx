import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  ManagementCockpitView,
  type ManagementCockpitViewState,
} from "@/components/management-cockpit/ManagementCockpitView";
import type { CockpitDataState, CockpitResult } from "@/lib/management-cockpit/types";

const SH = "11111111-1111-4111-8111-111111111111";
const CUSTOMER = "22222222-2222-4222-8222-222222222222";

function result(overrides: Partial<CockpitResult> = {}): CockpitResult {
  return {
    asOfDate: "2026-10-27",
    dataState: "PARTIAL",
    sources: { controlling: "AVAILABLE", workPackages: "UNAVAILABLE", avkk: "DENIED" },
    items: [
      {
        key: `${SH}:${CUSTOMER}`,
        systemhouseId: SH,
        customerId: CUSTOMER,
        customerName: "DEMO – Kunde A",
        projectKey: null,
        projectName: null,
        dataState: "PARTIAL",
        reasons: [
          {
            code: "WP_UNASSIGNED",
            count: null,
            dataState: "UNKNOWN",
            drilldown: {
              target: "WORK_VIEW",
              systemhouseId: SH,
              customerId: CUSTOMER,
              projectKey: null,
            },
          },
          {
            code: "AVKK_HIGH_OR_CRITICAL",
            count: 2,
            dataState: "PARTIAL",
            drilldown: {
              target: "AVKK_MANAGEMENT",
              systemhouseId: SH,
              customerId: CUSTOMER,
              projectKey: null,
            },
          },
          {
            code: "CONTROLLING_GAP",
            count: 1,
            dataState: "AVAILABLE",
            drilldown: {
              target: "PROJECT_CONTROLLING",
              systemhouseId: SH,
              customerId: CUSTOMER,
              projectKey: "demo-project",
            },
          },
        ],
      },
    ],
    counters: { attentionItems: null, reasonsByCode: null },
    ...overrides,
  };
}

afterEach(cleanup);

describe("L2 P3 — schreibgeschützte Cockpit-Präsentation", () => {
  it("stellt Handlungsbedarf vor Kennzahlen dar und zeigt Gründe samt Datenzustand", () => {
    render(<ManagementCockpitView state={{ kind: "ready", result: result() }} />);

    const attention = screen.getByRole("heading", { name: "Handlungsbedarf" });
    const metrics = screen.getByRole("heading", { name: "Kennzahlen" });
    expect(attention.compareDocumentPosition(metrics) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByText("Ohne Verantwortlichen")).toBeInTheDocument();
    expect(screen.getAllByText("Unbekannt").length).toBeGreaterThan(0);
    expect(screen.getByText("Hohe oder kritische AVKK-Folge")).toBeInTheDocument();
    expect(screen.getAllByText("Teilweise").length).toBeGreaterThan(0);
  });

  it.each([
    ["AVAILABLE", "Verfügbar"],
    ["EMPTY", "Leer"],
    ["PARTIAL", "Teilweise"],
    ["UNKNOWN", "Unbekannt"],
    ["UNAVAILABLE", "Nicht verfügbar"],
    ["DENIED", "Nicht berechtigt"],
  ] as const)("zeigt den Datenzustand %s ehrlich als %s", (dataState, label) => {
    const state: ManagementCockpitViewState = {
      kind: "ready",
      result: result({ dataState: dataState as CockpitDataState, items: [] }),
    };
    render(<ManagementCockpitView state={state} />);
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  });

  it("zeigt unbekannte Zähler nie als Null", () => {
    render(<ManagementCockpitView state={{ kind: "ready", result: result() }} />);
    const metrics = screen.getByRole("region", { name: "Kennzahlen" });
    expect(within(metrics).getAllByText("Nicht ermittelbar").length).toBeGreaterThan(0);
    expect(within(metrics).queryByText("0")).not.toBeInTheDocument();
  });

  it("verlinkt jeden Grund auf die vorhandene Fachansicht", () => {
    render(<ManagementCockpitView state={{ kind: "ready", result: result() }} />);
    expect(screen.getByRole("link", { name: /Ohne Verantwortlichen/ })).toHaveAttribute(
      "href",
      "/verantwortungen",
    );
    expect(screen.getByRole("link", { name: /Hohe oder kritische AVKK-Folge/ })).toHaveAttribute(
      "href",
      "/dashboard?tab=avkk-management",
    );
    expect(screen.getByRole("link", { name: /Controlling-Lücke/ })).toHaveAttribute(
      "href",
      "/projektcontrolling",
    );
  });

  it("bietet keine schreibende Aktion, keinen Betrag und keine Personenwertung", () => {
    const { container } = render(
      <ManagementCockpitView state={{ kind: "ready", result: result() }} />,
    );
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/€|Betrag|Score|Ranking|Personenwertung/i);
  });

  it("zeigt einen fehlgeschlagenen Leseweg als nicht verfügbar", () => {
    render(<ManagementCockpitView state={{ kind: "unavailable" }} />);
    expect(screen.getByText("Nicht verfügbar")).toBeInTheDocument();
    expect(screen.queryByText(/kein Handlungsbedarf/i)).not.toBeInTheDocument();
  });
});
