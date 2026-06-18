/**
 * ExampleFileService
 *
 * Liefert deterministische Beispiel-JSON-Dateien zur Schnittstelle.
 * Inhalte sind bewusst klein, vollständig und referenzkonsistent —
 * sie dienen als Vorlage für Import-Tests und als Doku-Beispiel.
 */

import {
  JSON_SCHEMA_VERSION,
  type DashboardJsonExport,
} from "@/lib/json-schema";

export interface ExampleFile {
  name: string;
  description: string;
  build(): DashboardJsonExport;
}

const FIXED_TIMESTAMP = "2026-06-15T14:30:00.000Z";
const FIXED_USER = "user-001";

function base(exportType: "full" | "partial"): DashboardJsonExport {
  return {
    schemaVersion: JSON_SCHEMA_VERSION,
    exportType,
    exportedAt: FIXED_TIMESTAMP,
    exportedBy: FIXED_USER,
    dashboardVersion: "1.12.0",
    manualMeta: {
      documentationVersion: "1.2.0",
      topicCount: 12,
    },
  };
}

const SAMPLE_USERS = [
  {
    id: "user-001",
    firstName: "Mara",
    lastName: "Beispiel",
    displayName: "Mara Beispiel",
    email: "mara.beispiel@example.com",
    phone: "",
    role: "administrator",
    status: "active",
    mfaEnabled: false,
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
  },
  {
    id: "user-002",
    firstName: "Jonas",
    lastName: "Tester",
    displayName: "Jonas Tester",
    email: "jonas.tester@example.com",
    phone: "",
    role: "engineer",
    status: "active",
    mfaEnabled: false,
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
  },
];

const SAMPLE_CUSTOMERS = [
  { id: "cust-northbit", name: "NorthBit Systems", synthetic: true },
  { id: "cust-acme", name: "Acme Industries", synthetic: true },
];

const SAMPLE_PROJECTS = [
  {
    id: "proj-001",
    name: "Plattform-Migration",
    client: "NorthBit Systems",
    customerId: "cust-northbit",
    status: "on_track",
    start: "2026-01-15",
    deadline: "2026-09-30",
  },
  {
    id: "proj-002",
    name: "ERP-Anbindung",
    client: "Acme Industries",
    customerId: "cust-acme",
    status: "at_risk",
    start: "2026-03-01",
    deadline: "2026-12-15",
  },
];

const SAMPLE_WPS = [
  {
    id: "wp-001",
    title: "Datenbankschema entwerfen",
    projectId: "proj-001",
    status: "in_arbeit",
    priority: "hoch",
    due: "2026-07-01",
    estimated: 24,
  },
  {
    id: "wp-002",
    title: "API-Spezifikation",
    projectId: "proj-002",
    status: "offen",
    priority: "mittel",
    due: "2026-08-15",
    estimated: 16,
  },
];

const SAMPLE_ACTIVITIES = [
  {
    id: "act-001",
    title: "Schema-Workshop",
    workPackageId: "wp-001",
    engineerId: "user-002",
    date: "2026-06-10",
    duration: 4,
    hourlyRate: 120,
    billable: true,
    billingStatus: "offen",
  },
  {
    id: "act-002",
    title: "API-Review",
    workPackageId: "wp-002",
    engineerId: "user-002",
    date: "2026-06-12",
    duration: 2.5,
    hourlyRate: 120,
    billable: true,
    billingStatus: "offen",
  },
];

const SAMPLE_TIME_ENTRIES = SAMPLE_ACTIVITIES.map((a) => ({
  id: `te-${a.id}`,
  activityId: a.id,
  engineerId: a.engineerId,
  date: a.date,
  durationHours: a.duration,
  billable: a.billable,
  billingStatus: a.billingStatus,
  hourlyRate: a.hourlyRate,
}));

const SAMPLE_SETTINGS = [
  { key: "northbit-dashboard-viewmode:user-001", value: "month" },
  { key: "northbit-dashboard-perf-report:user-001", value: "true" },
];

const SAMPLE_TARGET_MODELS = [
  {
    id: "ttm-001",
    engineerId: "user-002",
    targetTimeBase: "monthly",
    monthlyTargetHours: 168,
    workloadPercent: 100,
    validFrom: "2026-01-01",
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
  },
];

const FILES: ExampleFile[] = [
  {
    name: "example-full-export.json",
    description: "Vollständiger Beispiel-Export mit allen Bereichen.",
    build: () => ({
      ...base("full"),
      users: SAMPLE_USERS,
      customers: SAMPLE_CUSTOMERS,
      projects: SAMPLE_PROJECTS,
      workPackages: SAMPLE_WPS,
      activities: SAMPLE_ACTIVITIES,
      timeEntries: SAMPLE_TIME_ENTRIES,
      targetTimeModels: SAMPLE_TARGET_MODELS,
      settings: SAMPLE_SETTINGS,
    }),
  },
  {
    name: "example-users.json",
    description: "Nur Benutzerprofile.",
    build: () => ({ ...base("partial"), scopes: ["users"], users: SAMPLE_USERS }),
  },
  {
    name: "example-projects-workpackages-activities.json",
    description: "Projekte, Arbeitspakete und Tätigkeiten mit gültigen Referenzen.",
    build: () => ({
      ...base("partial"),
      scopes: ["projects", "workpackages", "activities"],
      customers: SAMPLE_CUSTOMERS,
      projects: SAMPLE_PROJECTS,
      workPackages: SAMPLE_WPS,
      activities: SAMPLE_ACTIVITIES,
    }),
  },
  {
    name: "example-timeentries.json",
    description: "Zeitbuchungen mit engineerId und activityId.",
    build: () => ({
      ...base("partial"),
      scopes: ["timeentries"],
      activities: SAMPLE_ACTIVITIES,
      timeEntries: SAMPLE_TIME_ENTRIES,
    }),
  },
  {
    name: "example-settings.json",
    description: "Beispielhafte Dashboard-Einstellungen.",
    build: () => ({ ...base("partial"), scopes: ["settings"], settings: SAMPLE_SETTINGS }),
  },
  {
    name: "example-backup.json",
    description: "Komplett-Export im Backup-Format (identisch zu Full-Export).",
    build: () => ({
      ...base("full"),
      users: SAMPLE_USERS,
      customers: SAMPLE_CUSTOMERS,
      projects: SAMPLE_PROJECTS,
      workPackages: SAMPLE_WPS,
      activities: SAMPLE_ACTIVITIES,
      timeEntries: SAMPLE_TIME_ENTRIES,
      targetTimeModels: SAMPLE_TARGET_MODELS,
      settings: SAMPLE_SETTINGS,
    }),
  },
];

export const ExampleFileService = {
  listFiles(): ExampleFile[] {
    return FILES;
  },
  getFile(name: string): ExampleFile | null {
    return FILES.find((f) => f.name === name) ?? null;
  },
  buildBlob(name: string): { blob: Blob; fileName: string } | null {
    const f = ExampleFileService.getFile(name);
    if (!f) return null;
    const text = JSON.stringify(f.build(), null, 2);
    return { blob: new Blob([text], { type: "application/json" }), fileName: f.name };
  },
};
