/**
 * BSF-KIOSK-02 — Accessibility-Vertrag für Hybrid- und Unavailable-Zustände.
 */
/// <reference types="vitest-axe/extend-expect" />
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import { KioskView } from "@/components/kiosk/KioskView";
import type { KioskSnapshot } from "@/lib/kiosk/kiosk-contract";

const HYBRID: KioskSnapshot = {
  mode: "hybrid",
  datasetState: "loaded",
  datasetVersion: "sysing.kiosk.hybrid.v1",
  generatedAt: "2026-09-19T05:30:00.000Z",
  observedAt: "2026-09-18T10:00:00.000Z",
  period: { from: "2026-09-01", to: "2026-09-19" },
  domains: [
    {
      id: "projects",
      title: "Projekte",
      level: "ok",
      sourceKind: "internal",
      observedAt: "2026-09-18T10:00:00.000Z",
      metrics: [{ label: "Projekte mit Leistung im Zeitraum", value: 3, level: "ok" }],
    },
    {
      id: "workPackages",
      title: "Arbeitspakete",
      level: "unknown",
      sourceKind: "unavailable",
      observedAt: null,
      metrics: [],
      note: "Interne Daten derzeit nicht verfügbar.",
    },
    {
      id: "activities",
      title: "Tätigkeiten",
      level: "ok",
      sourceKind: "internal",
      observedAt: "2026-09-18T10:00:00.000Z",
      metrics: [{ label: "Gesamtstunden", value: 25, level: "ok", unit: "h" }],
    },
    {
      id: "availability",
      title: "Urlaub (Mitarbeiter)",
      level: "ok",
      sourceKind: "demo",
      observedAt: "2026-09-19T05:00:00.000Z",
      metrics: [{ label: "Diese Woche im Urlaub", value: 4, level: "ok" }],
    },
    {
      id: "infrastructure",
      title: "Infrastruktur",
      level: "ok",
      sourceKind: "demo",
      observedAt: "2026-09-19T05:00:00.000Z",
      metrics: [{ label: "OK", value: 131, level: "ok" }],
    },
    {
      id: "support",
      title: "Support-Postfach",
      level: "ok",
      sourceKind: "demo",
      observedAt: "2026-09-19T05:00:00.000Z",
      metrics: [{ label: "Heute", value: 12, level: "ok" }],
    },
  ],
};

describe("BSF-KIOSK-02 hybrid accessibility", () => {
  it("keeps source badges and unavailable states accessible", async () => {
    const { container } = render(
      <KioskView
        state={{
          status: "ready",
          snapshot: HYBRID,
          refreshError: null,
          lastRefreshedAt: HYBRID.generatedAt,
        }}
        securityStatus="valid"
        onLogout={() => undefined}
        showControllingLink
        requestedMode="internal"
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
