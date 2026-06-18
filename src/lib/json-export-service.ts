/**
 * JsonExportService
 *
 * Erzeugt JSON-Exporte gemäß Schema v1 (siehe `json-schema.ts`).
 * Liefert immer ein `Blob` + Dateiname; UI entscheidet, ob Browser-Download
 * und/oder Eintrag im Download-Center erfolgt.
 *
 * Datenquelle: ausschließlich `localStorage` (gleich wie BackupService).
 * Sensible Felder werden vor der Serialisierung durch `stripSensitiveFields`
 * entfernt.
 *
 * Hinweise / bewusste Kompromisse:
 *  - `Customer` ist im Dashboard keine eigene Entität. Beim Export werden
 *    Kunden aus eindeutigen `project.client`-Werten synthetisiert (stabile
 *    ID `cust-<slug>`); `project.customerId` wird zusätzlich befüllt.
 *  - `timeEntries` ist eine 1:1-Projektion aus `activities`. Beide werden
 *    redundant exportiert; Stufe 2 (Import) muss eine kanonische Quelle
 *    wählen — Vorschlag: `timeEntries`, sonst Fallback auf `activities`.
 */

import {
  DashboardJsonExportSchema,
  JSON_SCHEMA_VERSION,
  stripSensitiveFields,
  type CustomerExport,
  type DashboardJsonExport,
  type ExportScope,
  type ExportType,
  type TimeEntryExport,
} from "@/lib/json-schema";
import {
  UserManagementService,
  type UserProfile,
} from "@/lib/user-management";
import { EngineerTargetTimeService } from "@/lib/engineer-target-time";
import {
  dashboardData,
  type Activity,
  type Project,
  type WorkPackage,
} from "@/lib/dashboard-data";
import {
  DASHBOARD_VERSION,
  DOCUMENTATION_VERSION,
  HelpDocumentationService,
} from "@/lib/help-documentation";

/* ------------------------------- Optionen ------------------------------- */

export interface ExportOptions {
  /** Wenn gesetzt, wird `exportedBy` aus dem aktiven Benutzer abgeleitet. */
  exportedBy?: string;
  includeUsers?: boolean;
  includeSettings?: boolean;
  includeTimeEntries?: boolean;
  includeManualMeta?: boolean;
}

const DEFAULT_OPTIONS: Required<ExportOptions> = {
  exportedBy: "system",
  includeUsers: true,
  includeSettings: true,
  includeTimeEntries: true,
  includeManualMeta: true,
};

/* ----------------------------- Hilfsfunktionen --------------------------- */

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function buildJsonFileName(type: ExportType, scope?: ExportScope, date = new Date()): string {
  const stamp = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}_${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
  if (type === "full") return `dashboard-backup_${stamp}.json`;
  return `dashboard-${scope ?? "partial"}_${stamp}.json`;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "kunde";
}

function loadDashboardPersisted(): {
  projects: Project[];
  workPackages: WorkPackage[];
  activities: Activity[];
} {
  const key = UserManagementService.userScopedKey("northbit-dashboard-v2");
  if (typeof window === "undefined") {
    return {
      projects: dashboardData.projects,
      workPackages: dashboardData.workPackages,
      activities: dashboardData.activities,
    };
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        projects: parsed.projects ?? dashboardData.projects,
        workPackages: parsed.workPackages ?? dashboardData.workPackages,
        activities: parsed.activities ?? dashboardData.activities,
      };
    }
  } catch {
    /* ignore */
  }
  return {
    projects: dashboardData.projects,
    workPackages: dashboardData.workPackages,
    activities: dashboardData.activities,
  };
}

/** Sammelt alle Dashboard-Einstellungs-Keys aus dem localStorage. */
function collectSettings(): Array<{ key: string; value: unknown }> {
  if (typeof window === "undefined") return [];
  const out: Array<{ key: string; value: unknown }> = [];
  const settingKeySubstrings = [
    "viewmode",
    "period",
    "perf-report",
    "perf-preset",
    "perf-custom",
    "export-preset",
    "locale",
  ];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k) continue;
    const lk = k.toLowerCase();
    if (!settingKeySubstrings.some((s) => lk.includes(s))) continue;
    try {
      const raw = window.localStorage.getItem(k);
      if (raw == null) continue;
      try {
        out.push({ key: k, value: JSON.parse(raw) });
      } catch {
        out.push({ key: k, value: raw });
      }
    } catch {
      /* ignore */
    }
  }
  return out;
}

/* ---------------------------- Daten-Pipelines ---------------------------- */

function buildCustomers(projects: Project[]): { customers: CustomerExport[]; lookup: Map<string, string> } {
  const lookup = new Map<string, string>();
  const customers: CustomerExport[] = [];
  for (const p of projects) {
    const name = (p.client ?? "").trim();
    if (!name) continue;
    if (lookup.has(name)) continue;
    const id = `cust-${slugify(name)}`;
    lookup.set(name, id);
    customers.push({ id, name, synthetic: true });
  }
  return { customers, lookup };
}

function projectsWithCustomerId(projects: Project[], lookup: Map<string, string>): Project[] {
  return projects.map((p) => {
    const id = lookup.get((p.client ?? "").trim());
    return id ? { ...p, customerId: id } : { ...p };
  });
}

function activitiesToTimeEntries(activities: Activity[], engineerId?: string): TimeEntryExport[] {
  return activities.map((a) => ({
    id: `te-${a.id}`,
    activityId: a.id,
    engineerId: a.engineerId ?? engineerId,
    date: a.date,
    durationHours: a.duration,
    billable: a.billable,
    billingStatus: a.billingStatus,
    hourlyRate: a.hourlyRate,
    description: a.description,
  }));
}

function sanitizeUsers(users: UserProfile[]): UserProfile[] {
  // stripSensitiveFields entfernt z. B. evtl. zukünftige `passwordHash`/`mfaSecret`-Felder.
  return stripSensitiveFields(users) as UserProfile[];
}

function buildEnvelopeBase(opts: Required<ExportOptions>, type: ExportType, scopes?: ExportScope[]) {
  return {
    schemaVersion: JSON_SCHEMA_VERSION,
    exportType: type,
    exportedAt: new Date().toISOString(),
    exportedBy: opts.exportedBy,
    dashboardVersion: DASHBOARD_VERSION,
    scopes,
    manualMeta: opts.includeManualMeta
      ? {
          documentationVersion: DOCUMENTATION_VERSION,
          topicCount: HelpDocumentationService.getAllTopics().length,
        }
      : undefined,
  } satisfies Partial<DashboardJsonExport>;
}

/* ------------------------------- Public API ------------------------------ */

export interface JsonExportResult {
  blob: Blob;
  fileName: string;
  document: DashboardJsonExport;
  byteLength: number;
}

function finalizeExport(doc: DashboardJsonExport, type: ExportType, scope?: ExportScope): JsonExportResult {
  // Final-Sweep: nochmals durch stripSensitiveFields (Defense in depth).
  const safe = stripSensitiveFields(doc) as DashboardJsonExport;
  // Schema-Selbsttest — wirft, falls Drift entstanden ist (z. B. neue Felder).
  DashboardJsonExportSchema.parse(safe);
  const text = JSON.stringify(safe, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  return {
    blob,
    fileName: buildJsonFileName(type, scope),
    document: safe,
    byteLength: blob.size,
  };
}

export const JsonExportService = {
  /** Voll-Export aller Bereiche. */
  exportFullJson(options: ExportOptions = {}): JsonExportResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const { projects, workPackages, activities } = loadDashboardPersisted();
    const { customers, lookup } = buildCustomers(projects);
    const projectsWithIds = projectsWithCustomerId(projects, lookup);
    const users = opts.includeUsers ? sanitizeUsers(UserManagementService.loadUsers()) : undefined;
    const targetTimeModels = EngineerTargetTimeService.loadTargetTimeModels();
    const settings = opts.includeSettings ? collectSettings() : undefined;
    const timeEntries = opts.includeTimeEntries ? activitiesToTimeEntries(activities) : undefined;

    const doc: DashboardJsonExport = {
      ...buildEnvelopeBase(opts, "full"),
      users,
      customers,
      projects: projectsWithIds,
      workPackages,
      activities,
      timeEntries,
      targetTimeModels: targetTimeModels as DashboardJsonExport["targetTimeModels"],
      settings,
    };

    return finalizeExport(doc, "full");
  },

  /** Teil-Export einer einzelnen Domäne. */
  exportPartialJson(scope: ExportScope, options: ExportOptions = {}): JsonExportResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const { projects, workPackages, activities } = loadDashboardPersisted();
    const { customers, lookup } = buildCustomers(projects);
    const projectsWithIds = projectsWithCustomerId(projects, lookup);

    const base = buildEnvelopeBase(opts, "partial", [scope]);
    const doc: DashboardJsonExport = { ...base };

    switch (scope) {
      case "users":
        doc.users = sanitizeUsers(UserManagementService.loadUsers());
        break;
      case "customers":
        doc.customers = customers;
        break;
      case "projects":
        doc.customers = customers;
        doc.projects = projectsWithIds;
        break;
      case "workpackages":
        doc.projects = projectsWithIds;
        doc.workPackages = workPackages;
        break;
      case "activities":
        doc.workPackages = workPackages;
        doc.activities = activities;
        break;
      case "timeentries":
        doc.activities = activities;
        doc.timeEntries = activitiesToTimeEntries(activities);
        break;
      case "targettime":
        doc.targetTimeModels =
          EngineerTargetTimeService.loadTargetTimeModels() as DashboardJsonExport["targetTimeModels"];
        break;
      case "settings":
        doc.settings = collectSettings();
        break;
    }

    return finalizeExport(doc, "partial", scope);
  },

  buildFileName: buildJsonFileName,
};
