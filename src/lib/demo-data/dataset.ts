/**
 * Reproduzierbarer Systemhaus-Demo-Datensatz (Sprint 09A).
 *
 * Vollständig fiktiv: keine realen Kunden, Personen oder Preise. Alle IDs
 * tragen das Präfix `demo-`, damit der Bestand jederzeit vollständig und
 * ohne Risiko für echte Daten entfernt werden kann.
 */

import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";

export const DEMO_PREFIX = "demo-";
export const DEMO_DATASET_VERSION = "2.2.0";

export const isDemoId = (id: string): boolean => id.startsWith(DEMO_PREFIX);

/**
 * Stichtag des Datensatzes. Standard ist der aktuelle Tag, damit die
 * Abnahmefälle ihre fachliche Bedeutung behalten ("im Plan" bleibt in der
 * Zukunft, "überfällig" in der Vergangenheit). Für reproduzierbare Läufe kann
 * ein fester Stichtag gesetzt werden; der verwendete Wert wird mit dem
 * Datensatz ausgegeben und gehört in den Abnahmebericht.
 */
let baseDate: string = new Date().toISOString().slice(0, 10);

export function setDemoBaseDate(date: string): void {
  baseDate = date;
}

export function getDemoBaseDate(): string {
  return baseDate;
}

function day(offset: number): string {
  const base = new Date(`${baseDate}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + offset);
  return base.toISOString().slice(0, 10);
}

interface ExtraWorkPackage {
  key: string;
  title: string;
  projectId: string | null;
  client: string;
  status: WorkPackage["status"];
  priority: WorkPackage["priority"];
  /** Tagesversatz zum Stichtag; `null` = kein Fälligkeitsdatum. */
  dueOffset: number | null;
  estimated: number;
  assignee: string;
  tags: string[];
}

const VERWALTUNG = "Musterstadt Verwaltung (fiktiv)";
const HANDEL = "Beispiel Handel GmbH (fiktiv)";
const PRODUKTION = "Beispiel Produktion AG (fiktiv)";
const LOGISTIK = "Beispiel Logistik KG (fiktiv)";
const ALEX = "Demo Alex Systemtechnik";
const SAM = "Demo Sam Infrastruktur";
const PETRA = "Demo Petra Projektleitung";
const GEORG = "Demo Georg Geschäftsführung";
const BERND = "Demo Bernd Systemadministration";

/**
 * Erweiterung 2.2.0 (TD-01 Stufe a): Arbeitspakete mit gezielten Randfällen für
 * „An Team veröffentlichen“ — Fälligkeit vergangen / heute / zukünftig / leer,
 * Arbeitspakete ohne Projekt und ein lokaler Kunde ohne Zuordnung (Logistik).
 */
const EXTRA_WORK_PACKAGES: readonly ExtraWorkPackage[] = [
  {
    key: "netz-doku",
    title: "Netzdokumentation und Abnahme",
    projectId: "demo-prj-netzwerk",
    client: VERWALTUNG,
    status: "offen",
    priority: "mittel",
    dueOffset: 40,
    estimated: 16,
    assignee: ALEX,
    tags: ["netzwerk", "doku"],
  },
  {
    key: "m365-schulung",
    title: "Anwenderschulung Pilotgruppe",
    projectId: "demo-prj-m365",
    client: HANDEL,
    status: "in_arbeit",
    priority: "mittel",
    dueOffset: 0,
    estimated: 20,
    assignee: SAM,
    tags: ["m365", "schulung"],
  },
  {
    key: "backup-konzept",
    title: "Wiederanlaufkonzept Entwurf",
    projectId: "demo-prj-backup",
    client: PRODUKTION,
    status: "in_arbeit",
    priority: "hoch",
    dueOffset: 14,
    estimated: 28,
    assignee: SAM,
    tags: ["backup", "konzept"],
  },
  {
    key: "fil-design",
    title: "SD-WAN-Design und Sizing",
    projectId: "demo-prj-filialen",
    client: HANDEL,
    status: "erledigt",
    priority: "hoch",
    dueOffset: -20,
    estimated: 36,
    assignee: ALEX,
    tags: ["netzwerk", "konzept"],
  },
  {
    key: "fil-pilot",
    title: "Pilotfiliale anbinden",
    projectId: "demo-prj-filialen",
    client: HANDEL,
    status: "erledigt",
    priority: "kritisch",
    dueOffset: -7,
    estimated: 30,
    assignee: ALEX,
    tags: ["netzwerk", "rollout"],
  },
  {
    key: "fil-rollout",
    title: "Rollout Filialen 2 bis 4",
    projectId: "demo-prj-filialen",
    client: HANDEL,
    status: "in_arbeit",
    priority: "hoch",
    dueOffset: 21,
    estimated: 72,
    assignee: SAM,
    tags: ["netzwerk", "rollout"],
  },
  {
    key: "fil-firewall",
    title: "Zentrale Firewall-Richtlinie",
    projectId: "demo-prj-filialen",
    client: HANDEL,
    status: "wartend",
    priority: "hoch",
    dueOffset: -2,
    estimated: 24,
    assignee: ALEX,
    tags: ["security"],
  },
  {
    key: "fil-monitoring",
    title: "Monitoring und Alarmierung",
    projectId: "demo-prj-filialen",
    client: HANDEL,
    status: "offen",
    priority: "niedrig",
    dueOffset: null,
    estimated: 18,
    assignee: SAM,
    tags: ["betrieb"],
  },
  {
    key: "virt-analyse",
    title: "Lastanalyse Bestandsserver",
    projectId: "demo-prj-virtualisierung",
    client: PRODUKTION,
    status: "erledigt",
    priority: "mittel",
    dueOffset: -45,
    estimated: 32,
    assignee: SAM,
    tags: ["analyse"],
  },
  {
    key: "virt-cluster",
    title: "Cluster-Aufbau und Härtung",
    projectId: "demo-prj-virtualisierung",
    client: PRODUKTION,
    status: "in_arbeit",
    priority: "kritisch",
    dueOffset: 3,
    estimated: 96,
    assignee: BERND,
    tags: ["virtualisierung", "security"],
  },
  {
    key: "virt-migration",
    title: "Migration Produktivserver",
    projectId: "demo-prj-virtualisierung",
    client: PRODUKTION,
    status: "wartend",
    priority: "kritisch",
    dueOffset: -5,
    estimated: 120,
    assignee: SAM,
    tags: ["migration"],
  },
  {
    key: "virt-storage",
    title: "Storage-Anbindung und Failover-Test",
    projectId: "demo-prj-virtualisierung",
    client: PRODUKTION,
    status: "offen",
    priority: "hoch",
    dueOffset: 10,
    estimated: 40,
    assignee: BERND,
    tags: ["storage", "nachweis"],
  },
  {
    key: "virt-betrieb",
    title: "Betriebshandbuch",
    projectId: "demo-prj-virtualisierung",
    client: PRODUKTION,
    status: "offen",
    priority: "niedrig",
    dueOffset: null,
    estimated: 14,
    assignee: BERND,
    tags: ["doku"],
  },
  {
    key: "lager-survey",
    title: "Funkausleuchtung Hochregallager",
    projectId: "demo-prj-lager-wlan",
    client: LOGISTIK,
    status: "erledigt",
    priority: "hoch",
    dueOffset: -12,
    estimated: 22,
    assignee: ALEX,
    tags: ["wlan", "analyse"],
  },
  {
    key: "lager-ap",
    title: "Access-Points montieren",
    projectId: "demo-prj-lager-wlan",
    client: LOGISTIK,
    status: "in_arbeit",
    priority: "hoch",
    dueOffset: 25,
    estimated: 48,
    assignee: ALEX,
    tags: ["wlan", "rollout"],
  },
  {
    key: "lager-scanner",
    title: "Scanner-Integration",
    projectId: "demo-prj-lager-wlan",
    client: LOGISTIK,
    status: "offen",
    priority: "mittel",
    dueOffset: 45,
    estimated: 34,
    assignee: SAM,
    tags: ["integration"],
  },
  {
    key: "lager-abnahme",
    title: "Abnahmemessung",
    projectId: "demo-prj-lager-wlan",
    client: LOGISTIK,
    status: "offen",
    priority: "mittel",
    dueOffset: null,
    estimated: 12,
    assignee: ALEX,
    tags: ["nachweis"],
  },
  {
    key: "frei-admin",
    title: "Pflege Administrationskonten (ohne Projekt)",
    projectId: null,
    client: PRODUKTION,
    status: "in_arbeit",
    priority: "mittel",
    dueOffset: 0,
    estimated: 8,
    assignee: BERND,
    tags: ["betrieb", "governance"],
  },
  {
    key: "frei-vertrieb",
    title: "Angebotsunterstützung (ohne Projekt)",
    projectId: null,
    client: VERWALTUNG,
    status: "wartend",
    priority: "niedrig",
    dueOffset: -4,
    estimated: 6,
    assignee: PETRA,
    tags: ["vertrieb"],
  },
];

function extraWorkPackageId(key: string): string {
  return `demo-wp-${key}`;
}

/** Anzahl Tätigkeiten je Status; offene Pakete haben nur Vorbereitungsaufwand. */
const ACTIVITIES_PER_STATUS: Record<WorkPackage["status"], number> = {
  erledigt: 3,
  in_arbeit: 3,
  wartend: 3,
  offen: 2,
};

const RATE_BY_CLIENT: Record<string, number> = {
  [VERWALTUNG]: 105,
  [HANDEL]: 120,
  [PRODUKTION]: 98,
  [LOGISTIK]: 110,
};

const STEP_TITLES = ["Vorbereitung", "Durchführung", "Abstimmung"] as const;

function buildProjects(): Project[] {
  return [
    {
      id: "demo-prj-netzwerk",
      name: "Netzwerkmodernisierung Verwaltungsstandort",
      client: "Musterstadt Verwaltung (fiktiv)",
      customerId: "demo-cust-verwaltung",
      description: "Ablösung veralteter Switches, Segmentierung und WLAN-Ausbau in zwei Gebäuden.",
      start: day(-40),
      deadline: day(45),
      lead: "Demo Petra Projektleitung",
      team: ["Demo Alex Systemtechnik"],
      budget: 96000,
      status: "on_track",
    },
    {
      id: "demo-prj-m365",
      name: "Microsoft-365-Migration",
      client: "Beispiel Handel GmbH (fiktiv)",
      customerId: "demo-cust-handel",
      description: "Migration von Datei- und Mailablage inklusive Berechtigungskonzept.",
      start: day(-70),
      deadline: day(12),
      lead: "Demo Petra Projektleitung",
      team: ["Demo Sam Infrastruktur"],
      budget: 58000,
      status: "at_risk",
    },
    {
      id: "demo-prj-backup",
      name: "Backup- und Wiederanlaufkonzept",
      client: "Beispiel Produktion AG (fiktiv)",
      customerId: "demo-cust-produktion",
      description:
        "Aufbau eines geprüften Wiederanlaufs mit dokumentierten Wiederherstellungstests.",
      start: day(-20),
      deadline: day(70),
      lead: "Demo Georg Geschäftsführung",
      team: ["Demo Sam Infrastruktur"],
      budget: 34000,
      status: "delayed",
    },
    {
      id: "demo-prj-filialen",
      name: "Standortvernetzung Filialen",
      client: "Beispiel Handel GmbH (fiktiv)",
      customerId: "demo-cust-handel",
      description: "Anbindung von vier Filialen per SD-WAN mit zentraler Firewall-Richtlinie.",
      start: day(-55),
      deadline: day(30),
      lead: "Demo Petra Projektleitung",
      team: ["Demo Alex Systemtechnik", "Demo Sam Infrastruktur"],
      budget: 74000,
      status: "on_track",
    },
    {
      id: "demo-prj-virtualisierung",
      name: "Servervirtualisierung Rechenzentrum",
      client: "Beispiel Produktion AG (fiktiv)",
      customerId: "demo-cust-produktion",
      description:
        "Konsolidierung physischer Server auf eine redundante Virtualisierungsplattform.",
      start: day(-90),
      deadline: day(5),
      lead: "Demo Bernd Systemadministration",
      team: ["Demo Sam Infrastruktur", "Demo Alex Systemtechnik"],
      budget: 128000,
      status: "at_risk",
    },
    {
      id: "demo-prj-lager-wlan",
      name: "Lager-WLAN und Scanner-Anbindung",
      client: "Beispiel Logistik KG (fiktiv)",
      customerId: "demo-cust-logistik",
      description: "Flächendeckendes WLAN im Hochregallager und Anbindung mobiler Scanner.",
      start: day(-30),
      deadline: day(60),
      lead: "Demo Georg Geschäftsführung",
      team: ["Demo Alex Systemtechnik"],
      budget: 41000,
      status: "delayed",
    },
  ];
}

function buildWorkPackages(): WorkPackage[] {
  return [
    {
      id: "demo-wp-netz-planung",
      title: "Netzplanung und Segmentierung",
      projectId: "demo-prj-netzwerk",
      client: "Musterstadt Verwaltung (fiktiv)",
      status: "erledigt",
      priority: "hoch",
      due: day(-10),
      estimated: 40,
      assignee: "Demo Alex Systemtechnik",
      tags: ["netzwerk", "konzept"],
    },
    {
      id: "demo-wp-netz-rollout",
      title: "Switch-Rollout Gebäude B",
      projectId: "demo-prj-netzwerk",
      client: "Musterstadt Verwaltung (fiktiv)",
      status: "in_arbeit",
      priority: "kritisch",
      due: day(9),
      estimated: 64,
      assignee: "Demo Alex Systemtechnik",
      tags: ["netzwerk", "rollout"],
    },
    {
      id: "demo-wp-m365-berechtigungen",
      title: "Berechtigungskonzept und Freigaben",
      projectId: "demo-prj-m365",
      client: "Beispiel Handel GmbH (fiktiv)",
      status: "wartend",
      priority: "hoch",
      due: day(-3),
      estimated: 32,
      assignee: "Demo Sam Infrastruktur",
      tags: ["m365", "governance"],
    },
    {
      id: "demo-wp-m365-migration",
      title: "Datenmigration Fachbereiche",
      projectId: "demo-prj-m365",
      client: "Beispiel Handel GmbH (fiktiv)",
      status: "offen",
      priority: "mittel",
      due: day(18),
      estimated: 80,
      assignee: "Demo Sam Infrastruktur",
      tags: ["m365", "migration"],
    },
    {
      id: "demo-wp-backup-test",
      title: "Wiederherstellungstest Fachverfahren",
      projectId: "demo-prj-backup",
      client: "Beispiel Produktion AG (fiktiv)",
      status: "offen",
      priority: "kritisch",
      due: day(-6),
      estimated: 24,
      assignee: "Demo Sam Infrastruktur",
      tags: ["backup", "nachweis"],
    },
    ...EXTRA_WORK_PACKAGES.map(
      (extra): WorkPackage => ({
        id: extraWorkPackageId(extra.key),
        title: extra.title,
        projectId: extra.projectId,
        client: extra.client,
        status: extra.status,
        priority: extra.priority,
        ...(extra.dueOffset === null ? {} : { due: day(extra.dueOffset) }),
        estimated: extra.estimated,
        assignee: extra.assignee,
        tags: extra.tags,
      }),
    ),
  ];
}

function buildActivities(): Activity[] {
  return [
    {
      id: "demo-act-1",
      title: "Bestandsaufnahme Verteilerräume",
      workPackageId: "demo-wp-netz-planung",
      client: "Musterstadt Verwaltung (fiktiv)",
      date: day(-32),
      time: "08:30",
      duration: 6,
      hourlyRate: 105,
      billable: true,
      billingStatus: "abgerechnet",
      description: "Aufnahme aller aktiven Ports und Dokumentation der Verkabelung.",
    },
    {
      id: "demo-act-2",
      title: "Segmentierungskonzept abgestimmt",
      workPackageId: "demo-wp-netz-planung",
      client: "Musterstadt Verwaltung (fiktiv)",
      date: day(-18),
      time: "13:00",
      duration: 4.5,
      hourlyRate: 105,
      billable: true,
      billingStatus: "abgerechnet",
    },
    {
      id: "demo-act-3",
      title: "Switch-Konfiguration Etage 2",
      workPackageId: "demo-wp-netz-rollout",
      client: "Musterstadt Verwaltung (fiktiv)",
      date: day(-2),
      time: "07:45",
      duration: 8,
      hourlyRate: 105,
      billable: true,
      billingStatus: "offen",
    },
    {
      id: "demo-act-4",
      title: "Abstimmung Berechtigungsrollen",
      workPackageId: "demo-wp-m365-berechtigungen",
      client: "Beispiel Handel GmbH (fiktiv)",
      date: day(-9),
      time: "10:00",
      duration: 3,
      hourlyRate: 120,
      billable: true,
      billingStatus: "offen",
      description: "Freigabe der Fachbereichsleitung steht aus.",
    },
    {
      id: "demo-act-5",
      title: "Testmigration Pilotgruppe",
      workPackageId: "demo-wp-m365-migration",
      client: "Beispiel Handel GmbH (fiktiv)",
      date: day(-5),
      time: "09:15",
      duration: 5,
      hourlyRate: 120,
      billable: true,
      billingStatus: "offen",
    },
    {
      id: "demo-act-6",
      title: "Restore-Probe Datenbank",
      workPackageId: "demo-wp-backup-test",
      client: "Beispiel Produktion AG (fiktiv)",
      date: day(-1),
      time: "16:00",
      duration: 2.5,
      hourlyRate: 98,
      billable: false,
      billingStatus: "nicht_abrechenbar",
      description: "Abbruch wegen fehlender Testumgebung — Wiederholung erforderlich.",
    },
    ...buildExtraActivities(),
  ];
}

/**
 * Deterministisch erzeugte Tätigkeiten zu den erweiterten Arbeitspaketen. Alle
 * liegen vor dem Stichtag. Bewusst ohne `engineerId`: Eine echte Kennung wäre ein
 * Fremdschlüssel auf Konten; erfundene Kennungen würden den Server-Vertrag brechen.
 * Beim Veröffentlichen werden sie daher mit `engineer_missing` übersprungen.
 */
function buildExtraActivities(): Activity[] {
  const activities: Activity[] = [];
  let counter = 7;
  for (const [index, extra] of EXTRA_WORK_PACKAGES.entries()) {
    const count = ACTIVITIES_PER_STATUS[extra.status];
    for (let step = 0; step < count; step += 1) {
      const offset = -(3 + ((index * 5 + step * 9) % 52));
      const hours = 1.5 + ((index + step * 2) % 6);
      const billable = !(extra.tags.includes("doku") || extra.tags.includes("vertrieb"));
      const settled = offset < -28;
      activities.push({
        id: `demo-act-${counter}`,
        title: `${extra.title}: ${STEP_TITLES[step]}`,
        workPackageId: extraWorkPackageId(extra.key),
        client: extra.client,
        date: day(offset),
        time: `${String(8 + ((index + step) % 8)).padStart(2, "0")}:${step % 2 === 0 ? "00" : "30"}`,
        duration: hours,
        hourlyRate: RATE_BY_CLIENT[extra.client] ?? 100,
        billable,
        billingStatus: !billable ? "nicht_abrechenbar" : settled ? "abgerechnet" : "offen",
      });
      counter += 1;
    }
  }
  return activities;
}

export interface DemoDataset {
  version: string;
  baseDate: string;
  projects: Project[];
  workPackages: WorkPackage[];
  activities: Activity[];
}

export function buildDemoDataset(): DemoDataset {
  return {
    version: DEMO_DATASET_VERSION,
    baseDate,
    projects: buildProjects(),
    workPackages: buildWorkPackages(),
    activities: buildActivities(),
  };
}
