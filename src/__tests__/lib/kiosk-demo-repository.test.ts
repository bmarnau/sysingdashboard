import { beforeEach, describe, expect, it } from "vitest";
import {
  KIOSK_DEMO_DATASET_VERSION,
  KIOSK_DEMO_STORAGE_KEY,
  loadKioskDemoDataset,
  readKioskDemoDataset,
  removeKioskDemoDataset,
} from "@/lib/kiosk/kiosk-demo-repository";

describe("kiosk demo repository", () => {
  beforeEach(() => window.localStorage.clear());

  it("is explicitly not loaded before an administrator seeds it", () => {
    expect(readKioskDemoDataset()).toBeNull();
  });

  it("loads a versioned synthetic six-domain dataset", () => {
    const loaded = loadKioskDemoDataset();

    expect(loaded.version).toBe(KIOSK_DEMO_DATASET_VERSION);
    expect(loaded.domains).toHaveLength(6);
    expect(window.localStorage.getItem(KIOSK_DEMO_STORAGE_KEY)).toContain(
      KIOSK_DEMO_DATASET_VERSION,
    );
  });

  it("reloads idempotently to the canonical baseline", () => {
    const first = loadKioskDemoDataset();
    window.localStorage.setItem(KIOSK_DEMO_STORAGE_KEY, JSON.stringify({ ...first, domains: [] }));

    const reloaded = loadKioskDemoDataset();
    expect(reloaded.domains).toHaveLength(6);
    expect(readKioskDemoDataset()).toEqual(reloaded);
  });

  it("removes the dataset completely", () => {
    loadKioskDemoDataset();
    removeKioskDemoDataset();
    expect(readKioskDemoDataset()).toBeNull();
    expect(window.localStorage.getItem(KIOSK_DEMO_STORAGE_KEY)).toBeNull();
  });

  it("uses a device-wide key rather than a user-scoped key", () => {
    expect(KIOSK_DEMO_STORAGE_KEY).toBe("northbit-kiosk-demo-dataset-v1");
    expect(KIOSK_DEMO_STORAGE_KEY).not.toContain("::");
  });
});
