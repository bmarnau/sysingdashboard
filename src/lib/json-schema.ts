/**
 * JSON-Schnittstellen-Schema v1.0.0
 *
 * Versionierte Struktur für JSON-Export, Import und JSON-basierte Backups.
 * Stufe 1 liefert hier nur die TS-Typen + Zod-Schemas; der Import-Pfad
 * (Vorschau, Konfliktdialog, Mapping) folgt in Stufe 2 und konsumiert
 * dieselben Schemas.
 *
 * Brückenfelder: `Project.customerId` und `Activity.engineerId` sind im
 * Dashboard heute optional und werden nur vom Import/Export-Layer befüllt.
 * Eine echte `Customer`-Entität existiert nicht — Kunden werden beim Export
 * aus eindeutigen `project.client`-Werten synthetisiert.
 */

import { z } from "zod";

export const JSON_SCHEMA_VERSION = "1.0.0";

/* ----------------------------- Primitive Schemas ---------------------------- */

const isoDateTime = z.string().min(1);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "YYYY-MM-DD erwartet");

/* --------------------------------- Entities --------------------------------- */

export const UserProfileSchema = z.object({
  id: z.string().min(1),
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string(),
  email: z.string(),
  phone: z.string().optional().default(""),
  role: z.string(),
  status: z.string(),
  profileImage: z.string().optional(),
  mfaEnabled: z.boolean().optional().default(false),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});
export type UserProfileExport = z.infer<typeof UserProfileSchema>;

export const CustomerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  synthetic: z.boolean().optional(),
});
export type CustomerExport = z.infer<typeof CustomerSchema>;

export const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  client: z.string(),
  customerId: z.string().optional(),
  description: z.string().optional(),
  start: z.string().optional(),
  deadline: z.string().optional(),
  lead: z.string().optional(),
  team: z.array(z.string()).optional(),
  budget: z.number().optional(),
  status: z.string(),
});
export type ProjectExport = z.infer<typeof ProjectSchema>;

export const WorkPackageSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  projectId: z.string().nullable().optional(),
  client: z.string().optional(),
  status: z.string(),
  priority: z.string(),
  due: z.string().optional(),
  estimated: z.number().optional(),
  assignee: z.string().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
});
export type WorkPackageExport = z.infer<typeof WorkPackageSchema>;

export const ActivitySchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  workPackageId: z.string().nullable().optional(),
  engineerId: z.string().optional(),
  client: z.string().optional(),
  date: isoDate,
  time: z.string().optional(),
  duration: z.number(),
  hourlyRate: z.number(),
  billable: z.boolean(),
  billingStatus: z.string(),
  description: z.string().optional(),
});
export type ActivityExport = z.infer<typeof ActivitySchema>;

/**
 * `TimeEntry` ist die kanonische Form einer Zeitbuchung im JSON-Schema.
 * In Stufe 1 ist sie eine 1:1-Projektion aus `Activity` und damit redundant
 * — Stufe 2 entscheidet, welche Quelle beim Import gewinnt (Vorschlag:
 * `timeEntries`, sofern vorhanden, sonst Fallback auf `activities`).
 */
export const TimeEntrySchema = z.object({
  id: z.string().min(1),
  activityId: z.string(),
  engineerId: z.string().optional(),
  date: isoDate,
  durationHours: z.number(),
  billable: z.boolean(),
  billingStatus: z.string().optional(),
  hourlyRate: z.number().optional(),
  description: z.string().optional(),
});
export type TimeEntryExport = z.infer<typeof TimeEntrySchema>;

export const TargetTimeModelSchema = z.object({
  id: z.string().min(1),
  engineerId: z.string().optional(),
  validFrom: z.string(),
  validUntil: z.string().nullable().optional(),
  targetTimeBase: z.string(),
  monthlyTargetHours: z.number().optional(),
  weeklyTargetHours: z.number().optional(),
  workloadPercent: z.number().optional(),
  description: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type TargetTimeModelExport = z.infer<typeof TargetTimeModelSchema>;

/**
 * Frei strukturierte Einstellungs-Bag — pro Storage-Key ein Eintrag.
 * Sensible Felder werden vorab durch `sanitizeSettings()` entfernt.
 */
export const DashboardSettingsSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});
export type DashboardSettingsExport = z.infer<typeof DashboardSettingsSchema>;

/* --------------------------------- Envelope --------------------------------- */

export const ExportTypeSchema = z.enum(["full", "partial"]);
export type ExportType = z.infer<typeof ExportTypeSchema>;

export const ExportScopeSchema = z.enum([
  "users",
  "customers",
  "projects",
  "workpackages",
  "activities",
  "timeentries",
  "settings",
  "targettime",
]);
export type ExportScope = z.infer<typeof ExportScopeSchema>;

export const DashboardJsonExportSchema = z.object({
  schemaVersion: z.string().min(1),
  exportType: ExportTypeSchema,
  exportedAt: isoDateTime,
  exportedBy: z.string(),
  dashboardVersion: z.string(),
  scopes: z.array(ExportScopeSchema).optional(),

  users: z.array(UserProfileSchema).optional(),
  customers: z.array(CustomerSchema).optional(),
  projects: z.array(ProjectSchema).optional(),
  workPackages: z.array(WorkPackageSchema).optional(),
  activities: z.array(ActivitySchema).optional(),
  timeEntries: z.array(TimeEntrySchema).optional(),
  targetTimeModels: z.array(TargetTimeModelSchema).optional(),
  settings: z.array(DashboardSettingsSchema).optional(),

  manualMeta: z
    .object({
      documentationVersion: z.string(),
      topicCount: z.number().int().nonnegative(),
    })
    .optional(),
});
export type DashboardJsonExport = z.infer<typeof DashboardJsonExportSchema>;

/* -------------------------- Sicherheits-Denylist ---------------------------- */

/**
 * Identisch zu BackupService — wird zusätzlich auf Feldnamen von Objekten
 * angewendet, damit z. B. `mfaSecret`, `passwordHash` o. Ä. nie exportiert
 * werden.
 */
export const SENSITIVE_FIELD_SUBSTRINGS = [
  "password",
  "passwd",
  "secret",
  "token",
  "api_key",
  "apikey",
  "api-key",
  "private_key",
  "privatekey",
  "credential",
  "auth_token",
  "access_token",
  "refresh_token",
  "bearer",
  // MFA/OTP nur in Kombination mit secret/code/seed — `mfaEnabled` (Boolean-Flag)
  // ist KEIN Secret und muss exportierbar bleiben.
  "mfa_secret",
  "mfasecret",
  "otp_secret",
  "otpsecret",
  "recovery_code",
];

export function isSensitiveFieldName(name: string): boolean {
  const n = name.toLowerCase();
  return SENSITIVE_FIELD_SUBSTRINGS.some((s) => n.includes(s));
}

/** Tiefenkopie ohne sensible Felder. */
export function stripSensitiveFields<T>(input: T): T {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) {
    return input.map((v) => stripSensitiveFields(v)) as unknown as T;
  }
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (isSensitiveFieldName(k)) continue;
      out[k] = stripSensitiveFields(v);
    }
    return out as T;
  }
  return input;
}
