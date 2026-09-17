import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KioskView } from "@/components/kiosk/KioskView";
import type { KioskSnapshot, KioskDomainSnapshot } from "@/lib/kiosk/kiosk-contract";
import type { KioskSnapshotState } from "@/hooks/useKioskSnapshot";

const DOMAINS: KioskDomainSnapshot[] = [
  {
    id: "projects",
    title: "Projekte",
    level: "ok",
    metrics: [{ label: "Aktiv", value: 12, level: "ok" }],
  },
  {
    id: "workPackages",
    title: "Arbeitspakete",
    level: "warning",
    metrics: [{ label: "Offen", value: 34, level: "warning" }],
  },
  {
    id: "activities",
    title: "Tätigkeiten",
    level: "ok",
    metrics: [{ label: "Heute", value: 18, level: "ok" }],
  },
  {
    id: "availability",
    title: "Verfügbarkeit",
    level: "ok",
    metrics: [{ label: "Abwesend", value: 2, level: "ok" }],
  },
  {
    id: "infrastructure",
    title: "Infrastruktur",
    level: "critical",
    metrics: [{ label: "Kritisch", value: 1, level: "critical" }],
  },
  {
    id: "support",
    title: "Support-Postfach",
    level: "warning",
    metrics: [{ label: "Heute", value: 11, level: "warning" }],
  },
];

type RichDomainSnapshot = KioskDomainSnapshot & {
  metrics: Array<KioskDomainSnapshot["metrics"][number] & { unit?: string }>;
  rows?: Array<{
    label: string;
    breakdown: { ok: number; warning: number; critical: number };
  }>;
};

const WALLBOARD_DOMAINS: RichDomainSnapshot[] = [
  {
    id: "projects",
    title: "Projekte",
    level: "warning",
    metrics: [
      { label: "Aktive Projekte", value: 8, level: "ok" },
      { label: "Mit Terminrisiko", value: 1, level: "warning" },
    ],
  },
  {
    id: "workPackages",
    title: "Arbeitspakete",
    level: "warning",
    metrics: [
      { label: "Offene Arbeitspakete", value: 24, level: "ok" },
      { label: "Überfällig", value: 3, level: "warning" },
    ],
  },
  {
    id: "activities",
    title: "Tätigkeiten",
    level: "ok",
    metrics: [
      { label: "Stunden im Demo-Zeitraum", value: 126.5, level: "ok", unit: "h" },
      { label: "Abrechenbarer Anteil", value: 82, level: "ok", unit: "%" },
    ],
  },
  {
    id: "availability",
    title: "Urlaub (Mitarbeiter)",
    level: "ok",
    metrics: [
      { label: "Diese Woche im Urlaub", value: 4, level: "ok" },
      { label: "Nächste Woche im Urlaub", value: 6, level: "ok" },
    ],
    note: "Nur Anzahl, keine personenbezogenen Daten",
  },
  {
    id: "infrastructure",
    title: "Infrastruktur",
    level: "critical",
    metrics: [
      { label: "OK", value: 131, level: "ok" },
      { label: "Warnung", value: 8, level: "warning" },
      { label: "Kritisch", value: 3, level: "critical" },
    ],
    rows: [
      { label: "Server", breakdown: { ok: 28, warning: 2, critical: 1 } },
      { label: "Backup", breakdown: { ok: 18, warning: 1, critical: 0 } },
      { label: "Netzwerk", breakdown: { ok: 32, warning: 2, critical: 1 } },
      { label: "Firewall", breakdown: { ok: 12, warning: 1, critical: 0 } },
      { label: "Internet", breakdown: { ok: 16, warning: 1, critical: 1 } },
      { label: "Cloud", breakdown: { ok: 25, warning: 1, critical: 0 } },
    ],
  },
  {
    id: "support",
    title: "Support-Postfach",
    level: "warning",
    metrics: [
      { label: "Posteingang gesamt", value: 87, level: "warning" },
      { label: "Heute", value: 12, level: "ok" },
      { label: "Gestern", value: 18, level: "ok" },
      { label: "Älter", value: 57, level: "warning" },
    ],
    note: "Nur Mengen und Alter, keine Mailinhalte",
  },
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
    for (const title of [
      "Projekte",
      "Arbeitspakete",
      "Tätigkeiten",
      "Verfügbarkeit",
      "Infrastruktur",
      "Support-Postfach",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeVisible();
    }
    fireEvent.click(screen.getByRole("button", { name: "Abmelden" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("renders the approved management wallboard information hierarchy", () => {
    render(<KioskView state={ready()} securityStatus="valid" onLogout={() => undefined} />);

    expect(screen.getByRole("heading", { name: "Operatives Management-Wallboard" })).toBeVisible();
    expect(screen.getByText("Read-only | Auto-Refresh | Systemhaus")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Operative Arbeit" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Infrastruktur – Überblick" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Support-Postfach" })).toBeVisible();
    expect(screen.getAllByText("Quelle: synthetische Demo-Daten").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("Keine Gründe oder Gesundheitsdaten")).toBeVisible();
    expect(screen.getByText("Nur Mengenansicht. Keine Inhaltsanzeige.")).toBeVisible();
  });

  it("renders the approved wallboard information set without dark metric tiles", () => {
    const { container } = render(
      <KioskView
        state={ready(snapshot(WALLBOARD_DOMAINS))}
        securityStatus="valid"
        onLogout={() => undefined}
      />,
    );

    const operations = screen.getByRole("heading", { name: "Operative Arbeit" }).closest("section");
    expect(operations).not.toBeNull();
    expect(
      within(operations!).getByRole("heading", { name: "Urlaub (Mitarbeiter)" }),
    ).toBeVisible();
    expect(within(operations!).getByText("Diese Woche im Urlaub")).toBeVisible();
    expect(within(operations!).getByText("Nächste Woche im Urlaub")).toBeVisible();
    expect(within(operations!).getByText("Abrechenbarer Anteil")).toBeVisible();
    expect(within(operations!).getByText("82 %")).toBeVisible();

    const infrastructure = screen
      .getByRole("heading", { name: "Infrastruktur – Überblick" })
      .closest("section");
    expect(infrastructure).not.toBeNull();
    for (const label of ["Server", "Backup", "Netzwerk", "Firewall", "Internet", "Cloud"]) {
      expect(within(infrastructure!).getByText(label)).toBeVisible();
    }

    const support = screen.getByRole("heading", { name: "Support-Postfach" }).closest("section");
    expect(support).not.toBeNull();
    for (const label of ["Posteingang gesamt", "Heute", "Gestern", "Älter"]) {
      expect(within(support!).getByText(label)).toBeVisible();
    }

    expect(container.querySelector('[class*="bg-background"]')).not.toBeInTheDocument();
  });

  it("keeps ordinary quantities neutral and reserves emphasis for operational risk", () => {
    render(
      <KioskView
        state={ready(snapshot(WALLBOARD_DOMAINS))}
        securityStatus="valid"
        onLogout={() => undefined}
      />,
    );

    const support = screen.getByRole("region", { name: "Support-Postfach" });
    expect(within(support).getByText("Posteingang gesamt").closest("div")).toHaveAttribute(
      "data-emphasis",
      "neutral",
    );
    expect(within(support).getByText("Heute").closest("div")).toHaveAttribute(
      "data-emphasis",
      "neutral",
    );
    expect(within(support).getByText("Gestern").closest("div")).toHaveAttribute(
      "data-emphasis",
      "neutral",
    );
    expect(within(support).getByText("Älter").closest("div")).toHaveAttribute(
      "data-emphasis",
      "warning",
    );

    const wallboard = screen.getByRole("region", { name: "Kiosk-Domänen" });
    expect(wallboard).toHaveAttribute("data-layout", "three-column");
  });

  it("shows the approved time-based German greeting", () => {
    vi.useFakeTimers();
    try {
      for (const [hour, greeting] of [
        [8, "Guten Morgen"],
        [14, "Guten Tag"],
        [20, "Guten Abend"],
      ] as const) {
        vi.setSystemTime(new Date(2026, 8, 17, hour, 0, 0));
        const { unmount } = render(
          <KioskView state={ready()} securityStatus="valid" onLogout={() => undefined} />,
        );
        expect(screen.getByText(greeting)).toBeVisible();
        unmount();
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the Systemhaus wordmark, German date and light wallboard surface", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 17, 8, 0, 0));
    try {
      const { container } = render(
        <KioskView state={ready()} securityStatus="valid" onLogout={() => undefined} />,
      );

      expect(screen.getByText("SYSING / SYSTEMHAUS")).toBeVisible();
      expect(screen.getByText("Donnerstag, 17. September 2026")).toBeVisible();
      expect(container.querySelector("main")).toHaveClass("bg-slate-50");
    } finally {
      vi.useRealTimers();
    }
  });

  it("formats management metrics with German grouping", () => {
    const domains = DOMAINS.map((domain) =>
      domain.id === "projects"
        ? {
            ...domain,
            metrics: [{ label: "Aktiv", value: 1234, level: "ok" as const }],
          }
        : domain,
    );

    render(
      <KioskView
        state={ready(snapshot(domains))}
        securityStatus="valid"
        onLogout={() => undefined}
      />,
    );

    expect(screen.getByText("1.234")).toBeVisible();
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
        ? {
            ...domain,
            level: "unknown" as const,
            metrics: [{ label: "Datenstand", value: null, level: "unknown" as const }],
          }
        : domain,
    );
    render(
      <KioskView
        state={ready(snapshot(domains))}
        securityStatus="valid"
        onLogout={() => undefined}
      />,
    );
    expect(screen.getAllByText("UNBEKANNT")).toHaveLength(2);
    expect(screen.getByText("—")).toBeVisible();
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
        state={{
          status: "error",
          snapshot: null,
          refreshError: "Aktualisierung fehlgeschlagen",
          lastRefreshedAt: null,
        }}
        securityStatus="valid"
        onLogout={() => undefined}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Kiosk-Daten konnten nicht geladen werden");

    rerender(
      <KioskView
        state={ready(snapshot(), "Aktualisierung fehlgeschlagen")}
        securityStatus="valid"
        onLogout={() => undefined}
      />,
    );
    expect(screen.getByText("Aktualisierung fehlgeschlagen")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Projekte" })).toBeVisible();
  });

  it("blocks domain data while continuous security validation is unavailable", () => {
    render(<KioskView state={ready()} securityStatus="unavailable" onLogout={() => undefined} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Sicherheitsprüfung derzeit nicht verfügbar",
    );
    expect(screen.queryByRole("heading", { name: "Projekte" })).not.toBeInTheDocument();
  });
});
