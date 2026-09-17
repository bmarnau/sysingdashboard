import type {
  DemoKioskScenario,
  KioskDataProvider,
  KioskDomainSnapshot,
  KioskSnapshot,
} from "@/lib/kiosk/kiosk-contract";
import { KIOSK_DEMO_DATASET_VERSION } from "@/lib/kiosk/kiosk-demo-dataset";
import { readKioskDemoDataset } from "@/lib/kiosk/kiosk-demo-repository";

export interface DemoKioskProviderOptions {
  scenario: DemoKioskScenario;
  now?: () => Date;
}

function cloneDomains(domains: readonly KioskDomainSnapshot[]): KioskDomainSnapshot[] {
  return domains.map((domain) => ({
    ...domain,
    metrics: domain.metrics.map((metric) => ({ ...metric })),
    rows: domain.rows?.map((row) => ({ ...row, breakdown: { ...row.breakdown } })),
  }));
}

function emptyDomains(domains: readonly KioskDomainSnapshot[]): KioskDomainSnapshot[] {
  return domains.map((domain) => ({
    ...domain,
    level: "unknown",
    metrics: [],
    note: "Keine Demo-Daten für diesen Bereich",
  }));
}

function unknownDomains(domains: readonly KioskDomainSnapshot[]): KioskDomainSnapshot[] {
  const copy = cloneDomains(domains);
  const target = copy.find((domain) => domain.id === "infrastructure") ?? copy[0];
  if (target) {
    target.level = "unknown";
    target.metrics = [{ label: "Datenstand", value: null, level: "unknown" }];
    target.note = "Datenstand unbekannt";
  }
  return copy;
}

function notLoadedSnapshot(now: Date): KioskSnapshot {
  const timestamp = now.toISOString();
  return {
    mode: "demo",
    datasetState: "not_loaded",
    datasetVersion: KIOSK_DEMO_DATASET_VERSION,
    generatedAt: timestamp,
    observedAt: timestamp,
    domains: [],
  };
}

export function createDemoKioskDataProvider({
  scenario,
  now = () => new Date(),
}: DemoKioskProviderOptions): KioskDataProvider {
  return {
    async getSnapshot() {
      if (scenario === "error") throw new Error("demo_kiosk_provider_error");

      const timestamp = now();
      if (scenario === "not_loaded") return notLoadedSnapshot(timestamp);

      const dataset = readKioskDemoDataset();
      if (!dataset) return notLoadedSnapshot(timestamp);

      let domains = cloneDomains(dataset.domains);
      if (scenario === "empty") domains = emptyDomains(dataset.domains);
      if (scenario === "unknown") domains = unknownDomains(dataset.domains);

      return {
        mode: "demo",
        datasetState: "loaded",
        datasetVersion: dataset.version,
        generatedAt: timestamp.toISOString(),
        observedAt: dataset.loadedAt,
        domains,
      } satisfies KioskSnapshot;
    },
  };
}
