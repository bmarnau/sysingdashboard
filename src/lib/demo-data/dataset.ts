/**
 * Reproduzierbarer Systemhaus-Demo-Datensatz (Sprint 09A).
 *
 * Vollständig fiktiv: keine realen Kunden, Personen oder Preise. Alle IDs
 * tragen das Präfix `demo-`, damit der Bestand jederzeit vollständig und
 * ohne Risiko für echte Daten entfernt werden kann.
 */

import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";

export const DEMO_PREFIX = "demo-";
export const DEMO_DATASET_VERSION = "2.0.0";

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
    lead: "Demo Projektleitung",
    team: ["Demo Technik 1", "Demo Technik 2"],
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
    lead: "Demo Projektleitung",
    team: ["Demo Consulting"],
    budget: 58000,
    status: "at_risk",
  },
  {
    id: "demo-prj-backup",
    name: "Backup- und Wiederanlaufkonzept",
    client: "Beispiel Produktion AG (fiktiv)",
    customerId: "demo-cust-produktion",
    description: "Aufbau eines geprüften Wiederanlaufs mit dokumentierten Wiederherstellungstests.",
    start: day(-20),
    deadline: day(70),
    lead: "Demo Servicedesk",
    team: ["Demo Technik 1"],
    budget: 34000,
    status: "delayed",
  },
];

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
    assignee: "Demo Technik 1",
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
    assignee: "Demo Technik 2",
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
    assignee: "Demo Consulting",
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
    assignee: "Demo Consulting",
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
    assignee: "Demo Technik 1",
    tags: ["backup", "nachweis"],
  },
];

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
];

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
