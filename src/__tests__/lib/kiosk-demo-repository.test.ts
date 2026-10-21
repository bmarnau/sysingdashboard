import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  KIOSK_DEMO_DATASET_VERSION,
  KIOSK_DEMO_STORAGE_KEY,
  loadKioskDemoDataset,
  readKioskDemoDataset,
  removeKioskDemoDataset,
} from "@/lib/kiosk/kiosk-demo-repository";
import { createKioskDemoDataset } from "@/lib/kiosk/kiosk-demo-dataset";
import type { KioskDomainSnapshot } from "@/lib/kiosk/kiosk-contract";

interface KioskDemoReference {
  snapshot: {
    datasetVersion: string;
    domains: Array<Record<string, unknown>>;
  };
}

function referenceShape(domains: KioskDomainSnapshot[]): Array<Record<string, unknown>> {
  return domains.map((domain) => {
    const serialized = JSON.parse(JSON.stringify(domain)) as Record<string, unknown>;
    delete serialized.sourceKind;
    delete serialized.observedAt;
    return serialized;
  });
}

function readReferenceDataset(): KioskDemoReference {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), "docs/examples/kiosk-demo-dataset-v1.json"), "utf8"),
  ) as KioskDemoReference;
}

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

  it("matches the versioned JSON reference dataset", () => {
    const reference = readReferenceDataset();
    const runtime = createKioskDemoDataset();

    expect(runtime.version).toBe(reference.snapshot.datasetVersion);
    expect(referenceShape(runtime.domains)).toEqual(reference.snapshot.domains);
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

  it("discards stored demo data from an older dataset version (stale infrastructure labels)", () => {
    // Geräte, die den frühen Datensatz geladen haben, speichern ihn unter derselben
    // Version "1.0.0", aber mit alten Infrastruktur-Bezeichnungen. Die Wallboard-Ansicht
    // erwartet OK/Warnung/Kritisch; ohne Versionswechsel blieb die Spalte leer.
    window.localStorage.setItem(
      KIOSK_DEMO_STORAGE_KEY,
      JSON.stringify({
        version: "1.0.0",
        loadedAt: "2026-09-14T08:00:00.000Z",
        domains: [
          {
            id: "infrastructure",
            title: "Infrastruktur",
            level: "ok",
            metrics: [{ label: "Ueberwachte Systeme", value: 42, level: "ok" }],
          },
        ],
      }),
    );

    expect(readKioskDemoDataset()).toBeNull();
  });

  it("publishes the infrastructure status labels the wallboard filters on", () => {
    const infrastructure = loadKioskDemoDataset().domains.find(
      (domain) => domain.id === "infrastructure",
    );

    const labels = infrastructure?.metrics.map((metric) => metric.label) ?? [];
    expect(labels).toEqual(expect.arrayContaining(["OK", "Warnung", "Kritisch"]));
  });

  it("uses a device-wide key rather than a user-scoped key", () => {
    expect(KIOSK_DEMO_STORAGE_KEY).toBe("northbit-kiosk-demo-dataset-v1");
    expect(KIOSK_DEMO_STORAGE_KEY).not.toContain("::");
  });
});
