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
      { label: "Im Plan", value: 83, level: "ok", unit: "%" },
      { label: "Mit Terminrisiko", value: 1, level: "warning" },
      { label: "Kritisch", value: 0, level: "critical" },
    ],
    note: "Synthetischer Demo-Stand",
  },
  {
    id: "workPackages",
    title: "Arbeitspakete",
    level: "warning",
    metrics: [
      { label: "Offene Arbeitspakete", value: 24, level: "ok" },
      { label: "Im Plan", value: 75, level: "ok", unit: "%" },
      { label: "Mit Risiken", value: 4, level: "warning" },
      { label: "Überfällig", value: 3, level: "warning" },
    ],
    note: "Synthetischer Demo-Stand",
  },
  {
    id: "activities",
    title: "Tätigkeiten",
    level: "ok",
    metrics: [
      { label: "Stunden im Demo-Zeitraum", value: 126.5, level: "ok", unit: "h" },
      { label: "Abrechenbarer Anteil", value: 82, level: "ok", unit: "%" },
    ],
    note: "Nur aggregierte synthetische Werte",
  },
  {
    id: "availability",
    title: "Urlaub (Mitarbeiter)",
    level: "ok",
    metrics: [
      { label: "Diese Woche im Urlaub", value: 4, level: "ok" },
      { label: "Nächste Woche im Urlaub", value: 6, level: "ok" },
    ],
    note: "Keine Gründe oder Gesundheitsdaten",
  },
  {
    id: "infrastructure",
    title: "Infrastruktur",
    level: "critical",
    metrics: [
      { label: "OK", value: 131, level: "ok" },
      { label: "Warnung", value: 8, level: "warning" },
      { label: "Kritisch", value: 3, level: "critical" },
      { label: "Verfügbar", value: 9, level: "ok" },
      { label: "Nicht verfügbar", value: 2, level: "critical" },
    ],
    rows: [
      { label: "Server", breakdown: { ok: 28, warning: 2, critical: 1 } },
      { label: "Backup", breakdown: { ok: 18, warning: 1, critical: 0 } },
      { label: "Netzwerk", breakdown: { ok: 32, warning: 2, critical: 1 } },
      { label: "Firewall", breakdown: { ok: 12, warning: 1, critical: 0 } },
      { label: "Internet", breakdown: { ok: 16, warning: 1, critical: 1 } },
      { label: "Cloud", breakdown: { ok: 25, warning: 1, critical: 0 } },
    ],
    note: "Keine produktiven Hostnamen oder IP-Adressen. Nur aggregierte Demo-Statusdaten.",
  },
  {
    id: "support",
    title: "Support-Postfach",
    level: "warning",
    metrics: [
      {
        label: "Posteingang gesamt",
        value: 87,
        level: "warning",
        trend: [61, 68, 72, 70, 79, 83, 87],
      },
      { label: "Heute", value: 12, level: "ok", trend: [8, 11, 9, 14, 12, 16, 12] },
      { label: "Gestern", value: 18, level: "ok", trend: [13, 16, 12, 17, 15, 14, 18] },
      { label: "Älter", value: 57, level: "warning", trend: [39, 43, 46, 48, 51, 54, 57] },
    ],
    note: "Nur Mengen und Alter, keine Mailinhalte",
  },
];

function cloneDomains(): KioskDomainSnapshot[] {
  return BASELINE_DOMAINS.map((domain) => ({
    ...domain,
    metrics: domain.metrics.map((metric) => ({
      ...metric,
      trend: metric.trend ? [...metric.trend] : undefined,
    })),
    rows: domain.rows?.map((row) => ({ ...row, breakdown: { ...row.breakdown } })),
  }));
}

export function createKioskDemoDataset(now = () => new Date()): KioskDemoDataset {
  return {
    version: KIOSK_DEMO_DATASET_VERSION,
    loadedAt: now().toISOString(),
    domains: cloneDomains(),
  };
}
