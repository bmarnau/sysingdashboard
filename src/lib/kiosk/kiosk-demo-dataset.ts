import type { KioskDomainSnapshot } from "@/lib/kiosk/kiosk-contract";

export const KIOSK_DEMO_DATASET_VERSION = "1.0.0";

export interface KioskDemoDataset {
  version: string;
  loadedAt: string;
  domains: KioskDomainSnapshot[];
}

const BASELINE_DOMAINS: readonly KioskDomainSnapshot[] = [
  {
    id: "projects",
    title: "Projekte",
    level: "warning",
    metrics: [
      { label: "Aktiv", value: 12, level: "ok" },
      { label: "Auffällig", value: 2, level: "warning" },
    ],
  },
  {
    id: "workPackages",
    title: "Arbeitspakete",
    level: "warning",
    metrics: [
      { label: "Offen", value: 34, level: "ok" },
      { label: "Überfällig", value: 4, level: "warning" },
    ],
  },
  {
    id: "activities",
    title: "Tätigkeiten",
    level: "ok",
    metrics: [{ label: "Heute offen", value: 18, level: "ok" }],
  },
  {
    id: "availability",
    title: "Verfügbarkeit",
    level: "ok",
    metrics: [{ label: "Abwesend heute", value: 2, level: "ok" }],
  },
  {
    id: "infrastructure",
    title: "Infrastruktur",
    level: "critical",
    metrics: [
      { label: "Warnung", value: 3, level: "warning" },
      { label: "Kritisch", value: 1, level: "critical" },
    ],
  },
  {
    id: "support",
    title: "Support-Postfach",
    level: "warning",
    metrics: [
      { label: "Heute", value: 11, level: "ok" },
      { label: "Älter", value: 5, level: "warning" },
    ],
  },
];

function cloneDomains(): KioskDomainSnapshot[] {
  return BASELINE_DOMAINS.map((domain) => ({
    ...domain,
    metrics: domain.metrics.map((metric) => ({ ...metric })),
  }));
}

export function createKioskDemoDataset(now = () => new Date()): KioskDemoDataset {
  return {
    version: KIOSK_DEMO_DATASET_VERSION,
    loadedAt: now().toISOString(),
    domains: cloneDomains(),
  };
}
