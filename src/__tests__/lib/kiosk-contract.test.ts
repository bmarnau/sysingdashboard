import { describe, expect, it } from "vitest";
import {
  KIOSK_DOMAIN_IDS,
  KIOSK_REFRESH_MS,
  type KioskDomainSnapshot,
  type KioskSnapshot,
} from "@/lib/kiosk/kiosk-contract";

describe("kiosk contract", () => {
  it("defines the fixed kiosk refresh and six domains", () => {
    expect(KIOSK_REFRESH_MS).toBe(60_000);
    expect(KIOSK_DOMAIN_IDS).toEqual([
      "projects",
      "workPackages",
      "activities",
      "availability",
      "infrastructure",
      "support",
    ]);
  });

  it("supports demo, hybrid and internal snapshots with explicit per-domain source metadata", () => {
    const domain: KioskDomainSnapshot = {
      id: "projects",
      title: "Projekte",
      level: "ok",
      metrics: [],
      sourceKind: "internal",
      observedAt: "2026-09-18T08:00:00.000Z",
    };
    const snapshot: KioskSnapshot = {
      mode: "hybrid",
      datasetState: "loaded",
      datasetVersion: "1.0.0",
      generatedAt: "2026-09-18T08:01:00.000Z",
      observedAt: "2026-09-18T08:00:00.000Z",
      domains: [domain],
    };

    expect(snapshot.mode).toBe("hybrid");
    expect(snapshot.domains[0]?.sourceKind).toBe("internal");
    expect(snapshot.domains[0]?.observedAt).toBe("2026-09-18T08:00:00.000Z");
  });
});
