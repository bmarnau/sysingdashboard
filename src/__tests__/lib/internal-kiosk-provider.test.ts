import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInternalReadKioskDataProvider } from "@/lib/kiosk/internal-kiosk-provider";
import type { KioskDataProvider, KioskSnapshot } from "@/lib/kiosk/kiosk-contract";
import type { InternalKioskSnapshotOutcome } from "@/lib/kiosk-runtime/internal-kiosk.functions";

const NOW = new Date("2026-09-19T05:30:00.000Z");

function demoSnapshot(): KioskSnapshot {
  return {
    mode: "demo",
    datasetState: "loaded",
    datasetVersion: "1.0.0",
    generatedAt: NOW.toISOString(),
    observedAt: "2026-09-19T05:00:00.000Z",
    domains: [
      {
        id: "availability",
        title: "Verfügbarkeit",
        level: "ok",
        metrics: [{ label: "Abwesend", value: 2, level: "ok" }],
        sourceKind: "demo",
        observedAt: "2026-09-19T05:00:00.000Z",
      },
      {
        id: "infrastructure",
        title: "Infrastruktur",
        level: "ok",
        metrics: [{ label: "OK", value: 10, level: "ok" }],
        sourceKind: "demo",
        observedAt: "2026-09-19T05:00:00.000Z",
      },
      {
        id: "support",
        title: "Support-Postfach",
        level: "warning",
        metrics: [{ label: "Heute", value: 4, level: "ok" }],
        sourceKind: "demo",
        observedAt: "2026-09-19T05:00:00.000Z",
      },
    ],
  };
}

function demoProvider(snapshot = demoSnapshot()): KioskDataProvider {
  return { getSnapshot: () => Promise.resolve(snapshot) };
}

function internalOk(): InternalKioskSnapshotOutcome {
  return {
    ok: true,
    value: {
      period: { from: "2026-09-01", to: "2026-09-19" },
      observedAt: "2026-09-18T10:00:00.000Z",
      domains: [
        {
          id: "projects",
          title: "Projekte",
          level: "ok",
          metrics: [{ label: "Projekte mit Leistung im Zeitraum", value: 3, level: "ok" }],
          sourceKind: "internal",
          observedAt: "2026-09-18T10:00:00.000Z",
        },
        {
          id: "workPackages",
          title: "Arbeitspakete",
          level: "ok",
          metrics: [{ label: "Arbeitspakete mit Leistung im Zeitraum", value: 5, level: "ok" }],
          sourceKind: "internal",
          observedAt: "2026-09-18T10:00:00.000Z",
        },
        {
          id: "activities",
          title: "Tätigkeiten",
          level: "ok",
          metrics: [{ label: "Gesamtstunden", value: 25, level: "ok", unit: "h" }],
          sourceKind: "internal",
          observedAt: "2026-09-18T10:00:00.000Z",
        },
      ],
    },
  };
}

describe("BSF-KIOSK-02 InternalReadKioskDataProvider", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("combines only approved internal and demo domains into hybrid mode", async () => {
    const readInternal = vi.fn().mockResolvedValue(internalOk());
    const provider = createInternalReadKioskDataProvider({
      systemhouseId: "11111111-1111-4111-8111-111111111111",
      now: () => NOW,
      demoProvider: demoProvider(),
      readInternal,
    });

    const snapshot = await provider.getSnapshot();

    expect(snapshot.mode).toBe("hybrid");
    expect(snapshot.datasetVersion).toBe("sysing.kiosk.hybrid.v1");
    expect(snapshot.domains).toHaveLength(6);
    expect(snapshot.domains.slice(0, 3).every((domain) => domain.sourceKind === "internal")).toBe(
      true,
    );
    expect(snapshot.domains.slice(3).every((domain) => domain.sourceKind === "demo")).toBe(true);
    expect(readInternal).toHaveBeenCalledWith({
      data: { systemhouseId: "11111111-1111-4111-8111-111111111111" },
    });
  });

  it("never substitutes demo project/hour values when the internal read is unavailable", async () => {
    const readInternal = vi.fn().mockResolvedValue({
      ok: false,
      error: "INTERNAL_KIOSK_DATA_UNAVAILABLE",
    } satisfies InternalKioskSnapshotOutcome);

    const snapshot = await createInternalReadKioskDataProvider({
      now: () => NOW,
      demoProvider: demoProvider(),
      readInternal,
    }).getSnapshot();

    for (const id of ["projects", "workPackages", "activities"] as const) {
      const domain = snapshot.domains.find((item) => item.id === id);
      expect(domain?.sourceKind).toBe("unavailable");
      expect(domain?.metrics).toEqual([]);
      expect(domain?.level).toBe("unknown");
    }
    expect(snapshot.domains.find((domain) => domain.id === "infrastructure")?.sourceKind).toBe(
      "demo",
    );
  });

  it("marks missing demo domains unavailable without affecting successful internal data", async () => {
    const notLoaded: KioskSnapshot = {
      ...demoSnapshot(),
      datasetState: "not_loaded",
      domains: [],
    };

    const snapshot = await createInternalReadKioskDataProvider({
      now: () => NOW,
      demoProvider: demoProvider(notLoaded),
      readInternal: vi.fn().mockResolvedValue(internalOk()),
    }).getSnapshot();

    expect(snapshot.domains.find((domain) => domain.id === "projects")?.sourceKind).toBe(
      "internal",
    );
    for (const id of ["availability", "infrastructure", "support"] as const) {
      expect(snapshot.domains.find((domain) => domain.id === id)?.sourceKind).toBe("unavailable");
    }
  });

  it("does not catch authorization failures from the internal server boundary", async () => {
    const provider = createInternalReadKioskDataProvider({
      demoProvider: demoProvider(),
      readInternal: vi
        .fn()
        .mockRejectedValue(new Error("Projektcontrolling für diesen Scope nicht zulässig.")),
    });

    await expect(provider.getSnapshot()).rejects.toThrow(
      "Projektcontrolling für diesen Scope nicht zulässig.",
    );
  });
});
