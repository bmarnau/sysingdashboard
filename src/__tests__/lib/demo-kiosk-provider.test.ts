import { beforeEach, describe, expect, it } from "vitest";
import { createDemoKioskDataProvider } from "@/lib/kiosk/demo-kiosk-provider";
import { loadKioskDemoDataset } from "@/lib/kiosk/kiosk-demo-repository";

const NOW = new Date("2026-09-14T06:00:00.000Z");

describe("DemoKioskDataProvider", () => {
  beforeEach(() => window.localStorage.clear());

  it("reports not_loaded until the device dataset is prepared", async () => {
    const provider = createDemoKioskDataProvider({ scenario: "default", now: () => NOW });
    const snapshot = await provider.getSnapshot();
    expect(snapshot.datasetState).toBe("not_loaded");
    expect(snapshot.domains).toEqual([]);
  });

  it("returns the loaded versioned baseline deterministically", async () => {
    loadKioskDemoDataset(() => NOW);
    const provider = createDemoKioskDataProvider({ scenario: "default", now: () => NOW });
    const snapshot = await provider.getSnapshot();
    expect(snapshot.mode).toBe("demo");
    expect(snapshot.datasetState).toBe("loaded");
    expect(snapshot.datasetVersion).toBe("1.0.0");
    expect(snapshot.generatedAt).toBe(NOW.toISOString());
    expect(snapshot.domains).toHaveLength(6);
  });

  it("renders empty and unknown as explicit semantics", async () => {
    loadKioskDemoDataset(() => NOW);
    const empty = await createDemoKioskDataProvider({ scenario: "empty", now: () => NOW }).getSnapshot();
    expect(empty.domains).toHaveLength(6);
    expect(empty.domains.every((domain) => domain.metrics.length === 0)).toBe(true);

    const unknown = await createDemoKioskDataProvider({
      scenario: "unknown",
      now: () => NOW,
    }).getSnapshot();
    expect(unknown.domains.some((domain) => domain.level === "unknown")).toBe(true);
    expect(
      unknown.domains.some((domain) => domain.metrics.some((metric) => metric.value === null)),
    ).toBe(true);
  });

  it("supports forced preview not_loaded and controlled error", async () => {
    loadKioskDemoDataset(() => NOW);
    const notLoaded = await createDemoKioskDataProvider({
      scenario: "not_loaded",
      now: () => NOW,
    }).getSnapshot();
    expect(notLoaded.datasetState).toBe("not_loaded");

    await expect(
      createDemoKioskDataProvider({ scenario: "error", now: () => NOW }).getSnapshot(),
    ).rejects.toThrow("demo_kiosk_provider_error");
  });
});
