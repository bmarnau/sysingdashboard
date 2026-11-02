import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  ManagementCockpitView,
  PARTIAL_HINT,
  type ManagementCockpitViewState,
} from "@/components/management-cockpit/ManagementCockpitView";
import type {
  CockpitDataState,
  CockpitReason,
  CockpitResult,
} from "@/lib/management-cockpit/types";

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
      "/verantwortungen?tab=workpackages",
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

  it("zeigt bei DENIED auch mit widersprüchlicher Antwort keine Kundendetails oder Zähler", () => {
    render(
      <ManagementCockpitView state={{ kind: "ready", result: result({ dataState: "DENIED" }) }} />,
    );
    expect(screen.queryByText("DEMO – Kunde A")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Kennzahlen" })).not.toBeInTheDocument();
  });

  it("stellt technische Kunden-IDs nicht als Anzeigenamen dar", () => {
    const data = result();
    data.items = data.items.map((item) => ({ ...item, customerName: CUSTOMER }));
    render(<ManagementCockpitView state={{ kind: "ready", result: data }} />);
    expect(screen.queryByText(CUSTOMER)).not.toBeInTheDocument();
    expect(screen.getByText("Autorisierter Kunde")).toBeInTheDocument();
  });
});

describe("L2 U6 — PARTIAL und UNKNOWN (E-U6-1)", () => {
  function single(reason: Partial<CockpitReason>, overrides: Partial<CockpitResult> = {}) {
    const base = result();
    const item = {
      ...base.items[0],
      reasons: [{ ...base.items[0].reasons[2], ...reason }],
    };
    return result({ items: [item], ...overrides });
  }

  function attentionList() {
    return screen.getByRole("region", { name: "Handlungsbedarf" });
  }

  it("(a) Grund mit Zustand UNKNOWN zeigt „Nicht ermittelbar“ und keine 0", () => {
    render(
      <ManagementCockpitView
        state={{ kind: "ready", result: single({ count: null, dataState: "UNKNOWN" }) }}
      />,
    );
    const reason = within(attentionList()).getByText("Controlling-Lücke").closest("li")!;
    expect(within(reason).getByText("Nicht ermittelbar")).toBeInTheDocument();
    expect(within(reason).queryByText("0")).not.toBeInTheDocument();
    expect(within(reason).queryByText(PARTIAL_HINT)).not.toBeInTheDocument();
  });

  it("(b) Grund mit Zustand PARTIAL und Zähler 0 zeigt die 0 nur mit Hinweis", () => {
    render(
      <ManagementCockpitView
        state={{ kind: "ready", result: single({ count: 0, dataState: "PARTIAL" }) }}
      />,
    );
    const reason = within(attentionList()).getByText("Controlling-Lücke").closest("li")!;
    expect(within(reason).getByText("0")).toBeInTheDocument();
    expect(within(reason).getByText(PARTIAL_HINT)).toBeInTheDocument();
  });

  it("(c) Grund mit Zustand PARTIAL und Zähler > 0 zeigt Zahl und Hinweis", () => {
    render(
      <ManagementCockpitView
        state={{ kind: "ready", result: single({ count: 3, dataState: "PARTIAL" }) }}
      />,
    );
    const reason = within(attentionList()).getByText("Controlling-Lücke").closest("li")!;
    expect(within(reason).getByText("3")).toBeInTheDocument();
    expect(within(reason).getByText(PARTIAL_HINT)).toBeInTheDocument();
  });

  it("(d) Gesamtzustand PARTIAL: Kennzahl zeigt Zahl mit Hinweis", () => {
    render(
      <ManagementCockpitView
        state={{
          kind: "ready",
          result: result({
            dataState: "PARTIAL",
            items: [],
            counters: { attentionItems: 0, reasonsByCode: {} },
          }),
        }}
      />,
    );
    const metric = within(screen.getByRole("region", { name: "Kennzahlen" }))
      .getByText("Einträge mit Handlungsbedarf")
      .closest("div")!;
    expect(within(metric).getByText("0")).toBeInTheDocument();
    expect(within(metric).getByText(PARTIAL_HINT)).toBeInTheDocument();
  });

  it("AVAILABLE und EMPTY zeigen keinen Hinweis", () => {
    for (const dataState of ["AVAILABLE", "EMPTY"] as const) {
      const { unmount } = render(
        <ManagementCockpitView
          state={{
            kind: "ready",
            result: result({
              dataState,
              items: [],
              counters: { attentionItems: 0, reasonsByCode: {} },
            }),
          }}
        />,
      );
      expect(screen.queryByText(PARTIAL_HINT)).not.toBeInTheDocument();
      unmount();
    }
  });
});
