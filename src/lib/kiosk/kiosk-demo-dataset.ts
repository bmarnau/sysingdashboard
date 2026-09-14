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
      { label: "Aktive Projekte", value: 8, level: "ok" },
      { label: "Mit Terminrisiko", value: 1, level: "warning" },
    ],
    note: "Synthetischer Demo-Stand",
  },
  {
    id: "workPackages",
    title: "Arbeitspakete",
    level: "warning",
    metrics: [
      { label: "Offene Arbeitspakete", value: 24, level: "ok" },
      { label: "Ueberfaellig", value: 3, level: "warning" },
    ],
    note: "Synthetischer Demo-Stand",
  },
  {
    id: "activities",
    title: "Taetigkeiten",
    level: "ok",
    metrics: [
      { label: "Stunden im Demo-Zeitraum", value: 126.5, level: "ok" },
      { label: "Billable-Anteil in Prozent", value: 82, level: "ok" },
    ],
    note: "Nur aggregierte synthetische Werte",
  },
  {
    id: "availability",
    title: "Verfuegbarkeit",
    level: "warning",
    metrics: [
      { label: "Verfuegbar", value: 9, level: "ok" },
      { label: "Nicht verfuegbar", value: 2, level: "warning" },
    ],
    note: "Keine Gruende oder Gesundheitsdaten",
  },
  {
    id: "infrastructure",
    title: "Infrastruktur",
    level: "critical",
    metrics: [
      { label: "Ueberwachte Systeme", value: 42, level: "ok" },
      { label: "Kritische Meldungen", value: 1, level: "critical" },
    ],
    note: "Keine produktiven Hostnamen oder IP-Adressen",
  },
  {
    id: "support",
    title: "Support-Postfach",
    level: "warning",
    metrics: [
      { label: "Offene Nachrichten", value: 17, level: "warning" },
      { label: "Aelter als 24 Stunden", value: 4, level: "warning" },
    ],
    note: "Nur Mengen und Alter, keine Mailinhalte",
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
