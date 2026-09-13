import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { describe, expect, it, vi } from "vitest";
import { MyCustomersView } from "@/components/customers/MyCustomersView";
import { CustomerDetailView } from "@/components/customers/CustomerDetailView";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    ...rest
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
    className?: string;
  }) => (
    <a href={params ? `${to}?${new URLSearchParams(params)}` : to} {...rest}>
      {children}
    </a>
  ),
}));

const SH = "11111111-1111-4111-8111-111111111111";
const C1 = "22222222-2222-4222-8222-222222222221";

describe("MyCustomersView", () => {
  it("zeigt Ladezustand barrierefrei an", async () => {
    const { container } = render(<MyCustomersView state={{ kind: "loading" }} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("zeigt leeren Zustand mit verständlichem Hinweis", () => {
    render(<MyCustomersView state={{ kind: "ready", customers: [] }} />);
    expect(screen.getByText("Keine zugeordneten Kunden")).toBeInTheDocument();
  });

  it("zeigt Fehlerzustand ohne Kundendaten", () => {
    render(<MyCustomersView state={{ kind: "error" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("konnte nicht geladen werden");
  });

  it("verlinkt jeden Kunden mit beiden Scope-IDs und zeigt Verantwortungs-/Zugriffsstatus", async () => {
    const { container } = render(
      <MyCustomersView
        state={{
          kind: "ready",
          customers: [
            {
              systemhouseId: SH,
              customerId: C1,
              name: "ACME",
              status: "active",
              responsibilityStatus: "active",
              responsibleSince: "2026-01-01T00:00:00Z",
              accessLevel: "read",
            },
            {
              systemhouseId: SH,
              customerId: "22222222-2222-4222-8222-222222222222",
              name: "Beta",
              status: "inactive",
              responsibilityStatus: "active",
              responsibleSince: "2026-01-01T00:00:00Z",
              accessLevel: "write",
            },
          ],
        }}
      />,
    );
    const link = screen.getByRole("link", { name: /ACME/ });
    expect(link.getAttribute("href")).toContain(`systemhouseId=${SH}`);
    expect(link.getAttribute("href")).toContain(`customerId=${C1}`);
    expect(screen.getByText("Aktiv")).toBeInTheDocument();
    expect(screen.getAllByText("Verantwortlich")).toHaveLength(2);
    expect(screen.getByText("Nur Lesen")).toBeInTheDocument();
    expect(screen.getByText("Schreibzugriff")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("CustomerDetailView", () => {
  it("denied: generische Meldung, keine Daten, kein Unterschied zu unbekannter ID", () => {
    render(<CustomerDetailView state={{ kind: "denied" }} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Kunde nicht verfügbar");
    expect(screen.getByRole("alert")).toHaveTextContent(/keine gültige Zuordnung|existiert nicht/);
  });

  it("ready: rendert Projekt -> Arbeitspaket -> Tätigkeit ohne Editier-Steuerelemente", async () => {
    const base = {
      systemhouseId: SH,
      customerId: C1,
      legacyClient: "ACME",
      publishedBy: "u",
      publishedAt: "2026-01-01T00:00:00Z",
      sourceRevision: 1,
      sourceHash: "h",
    };
    const { container } = render(
      <CustomerDetailView
        state={{
          kind: "ready",
          detail: {
            customer: {
              systemhouseId: SH,
              customerId: C1,
              name: "ACME",
              status: "active",
              responsibilityStatus: "active",
              responsibleSince: "2026-01-15T00:00:00Z",
              accessLevel: "write",
            },
            responsible: { userId: "u", displayName: "Max Mustermann" },
            projection: {
              systemhouseId: SH,
              customerId: C1,
              projects: [
                { ...base, projectionId: "p1", sourceId: "P1", name: "Migration", status: "aktiv" },
              ],
              workPackages: [
                {
                  ...base,
                  projectionId: "w1",
                  sourceId: "W1",
                  projectSourceId: "P1",
                  parentLinkStatus: "linked",
                  title: "Netzwerk",
                  status: "offen",
                  priority: "hoch",
                },
              ],
              activities: [
                {
                  ...base,
                  projectionId: "a1",
                  sourceId: "A1",
                  workPackageSourceId: "W1",
                  parentLinkStatus: "linked",
                  engineerId: "e",
                  title: "Switch konfiguriert",
                  date: "2026-02-01",
                  duration: 2,
                  billable: true,
                  billingStatus: "offen",
                },
              ],
            },
          },
        }}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("ACME");
    expect(screen.getByText("Max Mustermann")).toBeInTheDocument();
    expect(screen.getByText("Verantwortlich")).toBeInTheDocument();
    expect(screen.getByText("Schreibzugriff")).toBeInTheDocument();
    expect(screen.getByText(/Schreiben nur mit fachlicher Berechtigung/)).toBeInTheDocument();
    expect(screen.getByText("Migration")).toBeInTheDocument();
    expect(screen.getByText("Netzwerk")).toBeInTheDocument();
    expect(screen.getByText("Switch konfiguriert")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /bearbeiten|löschen|neu/i })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });
});
