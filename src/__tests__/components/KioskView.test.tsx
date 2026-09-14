import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KioskView } from "@/components/kiosk/KioskView";
import type { KioskSnapshot, KioskDomainSnapshot } from "@/lib/kiosk/kiosk-contract";
import type { KioskSnapshotState } from "@/hooks/useKioskSnapshot";

const DOMAINS: KioskDomainSnapshot[] = [
  { id: "projects", title: "Projekte", level: "ok", metrics: [{ label: "Aktiv", value: 12, level: "ok" }] },
  { id: "workPackages", title: "Arbeitspakete", level: "warning", metrics: [{ label: "Offen", value: 34, level: "warning" }] },
  { id: "activities", title: "Tätigkeiten", level: "ok", metrics: [{ label: "Heute", value: 18, level: "ok" }] },
  { id: "availability", title: "Verfügbarkeit", level: "ok", metrics: [{ label: "Abwesend", value: 2, level: "ok" }] },
  { id: "infrastructure", title: "Infrastruktur", level: "critical", metrics: [{ label: "Kritisch", value: 1, level: "critical" }] },
  { id: "support", title: "Support-Postfach", level: "warning", metrics: [{ label: "Heute", value: 11, level: "warning" }] },
];

function snapshot(domains = DOMAINS): KioskSnapshot {
  return {
    mode: "demo",
    datasetState: "loaded",
    datasetVersion: "1.0.0",
    generatedAt: "2026-09-14T06:00:00.000Z",
    observedAt: "2026-09-14T05:55:00.000Z",
    domains,
  };
}

function ready(value = snapshot(), refreshError: string | null = null): KioskSnapshotState {
  return {
    status: "ready",
    snapshot: value,
    refreshError,
    lastRefreshedAt: value.generatedAt,
  };
}

describe("KioskView", () => {
  it("shows the permanent demo banner, six domains and logout", () => {
    const onLogout = vi.fn();
    render(<KioskView state={ready()} securityStatus="valid" onLogout={onLogout} />);
    expect(screen.getByText("DEMO-DATEN — KEINE LIVE-DATEN")).toBeVisible();
    for (const title of ["Projekte", "Arbeitspakete", "Tätigkeiten", "Verfügbarkeit", "Infrastruktur", "Support-Postfach"]) {
      expect(screen.getByRole("heading", { name: title })).toBeVisible();
    }
    fireEvent.click(screen.getByRole("button", { name: "Abmelden" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("shows a clear not-loaded state without a seed action", () => {
    const value = { ...snapshot([]), datasetState: "not_loaded" as const };
    render(<KioskView state={ready(value)} securityStatus="valid" onLogout={() => undefined} />);
    expect(screen.getByText("Kiosk-Demodaten sind auf diesem Gerät nicht geladen.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /laden/i })).not.toBeInTheDocument();
  });

  it("renders unknown as unknown rather than zero or ok", () => {
    const domains = DOMAINS.map((domain) =>
      domain.id === "infrastructure"
        ? { ...domain, level: "unknown" as const, metrics: [{ label: "Datenstand", value: null, level: "unknown" as const }] }
        : domain,
    );
    render(<KioskView state={ready(snapshot(domains))} securityStatus="valid" onLogout={() => undefined} />);
    expect(screen.getByText("UNBEKANNT")).toBeVisible();
  });

  it("shows controlled loading, initial error and last-good refresh warning", () => {
    const { rerender } = render(
      <KioskView
        state={{ status: "loading", snapshot: null, refreshError: null, lastRefreshedAt: null }}
        securityStatus="valid"
        onLogout={() => undefined}
      />,
    );
    expect(screen.getByText("Kiosk-Daten werden geladen …")).toBeVisible();

    rerender(
      <KioskView
        state={{ status: "error", snapshot: null, refreshError: "Aktualisierung fehlgeschlagen", lastRefreshedAt: null }}
        securityStatus="valid"
        onLogout={() => undefined}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Kiosk-Daten konnten nicht geladen werden");

    rerender(
      <KioskView state={ready(snapshot(), "Aktualisierung fehlgeschlagen")} securityStatus="valid" onLogout={() => undefined} />,
    );
    expect(screen.getByText("Aktualisierung fehlgeschlagen")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Projekte" })).toBeVisible();
  });

  it("blocks domain data while continuous security validation is unavailable", () => {
    render(<KioskView state={ready()} securityStatus="unavailable" onLogout={() => undefined} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Sicherheitsprüfung derzeit nicht verfügbar");
    expect(screen.queryByRole("heading", { name: "Projekte" })).not.toBeInTheDocument();
  });
});
