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
export type KioskSourceKind = "demo" | "internal" | "unavailable";
export type KioskMode = "demo" | "hybrid" | "internal";
export type KioskDatasetState = "loaded" | "not_loaded";
export type DemoKioskScenario = "default" | "empty" | "unknown" | "error" | "not_loaded";

export interface KioskMetric {
  value: number | null;
  label: string;
  level: KioskLevel;
  unit?: string;
  trend?: number[];
}

export interface KioskStatusBreakdown {
  ok: number;
  warning: number;
  critical: number;
}

export interface KioskStatusBreakdownRow {
  label: string;
  breakdown: KioskStatusBreakdown;
}

export interface KioskDomainSnapshot {
  id: KioskDomainId;
  title: string;
  level: KioskLevel;
  metrics: KioskMetric[];
  note?: string;
  rows?: KioskStatusBreakdownRow[];
  sourceKind?: KioskSourceKind;
  observedAt?: string | null;
}

export interface KioskSnapshot {
  mode: KioskMode;
  datasetState: KioskDatasetState;
  datasetVersion: string;
  generatedAt: string;
  observedAt: string;
  domains: KioskDomainSnapshot[];
}

export interface KioskDataProvider {
  getSnapshot(): Promise<KioskSnapshot>;
}
