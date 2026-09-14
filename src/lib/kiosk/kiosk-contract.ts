export const KIOSK_DOMAIN_IDS = [
  "projects",
  "workPackages",
  "activities",
  "availability",
  "infrastructure",
  "support",
] as const;

export const KIOSK_REFRESH_MS = 60_000;

export type KioskDomainId = (typeof KIOSK_DOMAIN_IDS)[number];
export type KioskLevel = "ok" | "warning" | "critical" | "unknown";
export type KioskDatasetState = "loaded" | "not_loaded";
export type DemoKioskScenario = "default" | "empty" | "unknown" | "error" | "not_loaded";

export interface KioskMetric {
  value: number | null;
  label: string;
  level: KioskLevel;
}

export interface KioskDomainSnapshot {
  id: KioskDomainId;
  title: string;
  level: KioskLevel;
  metrics: KioskMetric[];
  note?: string;
}

export interface KioskSnapshot {
  mode: "demo";
  datasetState: KioskDatasetState;
  datasetVersion: string;
  generatedAt: string;
  observedAt: string;
  domains: KioskDomainSnapshot[];
}

export interface KioskDataProvider {
  getSnapshot(): Promise<KioskSnapshot>;
}
