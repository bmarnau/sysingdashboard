/**
 * JSON-Schnittstellen-Schema v1.1.0
 *
 * 1.1.0 ergänzt den optionalen Block `avkk` (AVKK-Führungsdaten und
 * Katalogstand). Der Block ist additiv — Dokumente ohne ihn bleiben gültig.
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

export const JSON_SCHEMA_VERSION = "1.1.0";

/* ----------------------------- Primitive Schemas ---------------------------- */

/**
 * Hartlängen für Importpfade — verhindert unbounded Payloads (DoS / Speicher).
 */
const SHORT_ID = 128;
const SHORT_STR = 255;
const LONG_STR = 2000;

const isoDateTime = z.string().min(1).max(64);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "YYYY-MM-DD erwartet");

/* --------------------------------- Entities --------------------------------- */

export const UserProfileSchema = z.object({
  id: z.string().min(1).max(SHORT_ID),
  firstName: z.string().max(SHORT_STR),
  lastName: z.string().max(SHORT_STR),
  displayName: z.string().max(SHORT_STR),
  email: z.string().max(SHORT_STR),
  phone: z.string().max(SHORT_STR).optional().default(""),
  role: z.string().max(SHORT_STR),
  status: z.string().max(SHORT_STR),
  profileImage: z.string().max(LONG_STR).optional(),
  mfaEnabled: z.boolean().optional().default(false),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});
export type UserProfileExport = z.infer<typeof UserProfileSchema>;

export const CustomerSchema = z.object({
  id: z.string().min(1).max(SHORT_ID),
  name: z.string().min(1).max(SHORT_STR),
  synthetic: z.boolean().optional(),
});
export type CustomerExport = z.infer<typeof CustomerSchema>;

export const ProjectSchema = z.object({
  id: z.string().min(1).max(SHORT_ID),
  name: z.string().max(SHORT_STR),
  client: z.string().max(SHORT_STR),
  customerId: z.string().max(SHORT_ID).optional(),
  description: z.string().max(LONG_STR).optional(),
  start: z.string().max(64).optional(),
  deadline: z.string().max(64).optional(),
  lead: z.string().max(SHORT_STR).optional(),
  team: z.array(z.string().max(SHORT_ID)).max(500).optional(),
  budget: z.number().optional(),
  status: z.string().max(SHORT_STR),
});
export type ProjectExport = z.infer<typeof ProjectSchema>;

export const WorkPackageSchema = z.object({
  id: z.string().min(1).max(SHORT_ID),
  title: z.string().max(SHORT_STR),
  projectId: z.string().max(SHORT_ID).nullable().optional(),
  client: z.string().max(SHORT_STR).optional(),
  status: z.string().max(SHORT_STR),
  priority: z.string().max(SHORT_STR),
  due: z.string().max(64).optional(),
  estimated: z.number().optional(),
  assignee: z.string().max(SHORT_STR).optional(),
  tags: z.array(z.string().max(SHORT_STR)).max(100).optional(),
  description: z.string().max(LONG_STR).optional(),
});
export type WorkPackageExport = z.infer<typeof WorkPackageSchema>;

export const ActivitySchema = z.object({
  id: z.string().min(1).max(SHORT_ID),
  title: z.string().max(SHORT_STR),
  workPackageId: z.string().max(SHORT_ID).nullable().optional(),
  engineerId: z.string().max(SHORT_ID).optional(),
  client: z.string().max(SHORT_STR).optional(),
  date: isoDate,
  time: z.string().max(16).optional(),
  duration: z.number(),
  hourlyRate: z.number(),
  billable: z.boolean(),
  billingStatus: z.string().max(SHORT_STR),
  description: z.string().max(LONG_STR).optional(),
});
export type ActivityExport = z.infer<typeof ActivitySchema>;

/**
 * `TimeEntry` ist die kanonische Form einer Zeitbuchung im JSON-Schema.
 * In Stufe 1 ist sie eine 1:1-Projektion aus `Activity` und damit redundant
 * — Stufe 2 entscheidet, welche Quelle beim Import gewinnt (Vorschlag:
 * `timeEntries`, sofern vorhanden, sonst Fallback auf `activities`).
 */
export const TimeEntrySchema = z.object({
  id: z.string().min(1).max(SHORT_ID),
  activityId: z.string().max(SHORT_ID),
  engineerId: z.string().max(SHORT_ID).optional(),
  date: isoDate,
  durationHours: z.number(),
  billable: z.boolean(),
  billingStatus: z.string().max(SHORT_STR).optional(),
  hourlyRate: z.number().optional(),
  description: z.string().max(LONG_STR).optional(),
});
export type TimeEntryExport = z.infer<typeof TimeEntrySchema>;

export const TargetTimeModelSchema = z.object({
  id: z.string().min(1).max(SHORT_ID),
  engineerId: z.string().max(SHORT_ID).optional(),
  validFrom: z.string().max(64),
  validUntil: z.string().max(64).nullable().optional(),
  targetTimeBase: z.string().max(SHORT_STR),
  monthlyTargetHours: z.number().optional(),
  weeklyTargetHours: z.number().optional(),
  workloadPercent: z.number().optional(),
  description: z.string().max(LONG_STR).optional(),
  createdAt: z.string().max(64).optional(),
  updatedAt: z.string().max(64).optional(),
});
export type TargetTimeModelExport = z.infer<typeof TargetTimeModelSchema>;

/**
 * Frei strukturierte Einstellungs-Bag — pro Storage-Key ein Eintrag.
 * Sensible Felder werden vorab durch `sanitizeSettings()` entfernt.
 */
export const DashboardSettingsSchema = z.object({
  key: z.string().min(1).max(SHORT_ID),
  value: z.unknown(),
});
export type DashboardSettingsExport = z.infer<typeof DashboardSettingsSchema>;

/* ----------------------------------- AVKK ----------------------------------- */

/**
 * AVKK-Block (Schema 1.1.0). Enthält ausschließlich IDs, Katalogschlüssel und
 * fachliche Texte — keine Zugangsdaten. Labels sind Momentaufnahmen.
 */
export const AvkkSubjectExportSchema = z.object({
  id: z.string().min(1).max(SHORT_ID),
  subjectType: z.string().max(SHORT_STR),
  subjectId: z.string().max(SHORT_ID),
  titleSnapshot: z.string().max(SHORT_STR),
  status: z.string().max(SHORT_STR),
  version: z.number().int().nonnegative(),
  createdAt: z.string().max(64),
  updatedAt: z.string().max(64),
});

export const AvkkResponsibilityExportSchema = z.object({
  id: z.string().min(1).max(SHORT_ID),
  subjectRef: z.string().min(1).max(SHORT_ID),
  personId: z.string().max(SHORT_ID),
  roleKey: z.string().max(SHORT_STR),
  typeKeys: z.array(z.string().max(SHORT_STR)).max(50),
  note: z.string().max(LONG_STR),
  validFrom: z.string().max(64),
  validTo: z.string().max(64).nullable(),
});

export const AvkkCompetenceExportSchema = z.object({
  id: z.string().min(1).max(SHORT_ID),
  subjectRef: z.string().min(1).max(SHORT_ID),
  dimensionKey: z.string().max(SHORT_STR),
  ratingKey: z.string().max(SHORT_STR),
  supportNeeded: z.boolean(),
  note: z.string().max(LONG_STR),
  supersededAt: z.string().max(64).nullable(),
  createdAt: z.string().max(64),
});

export const AvkkConsequenceExportSchema = z.object({
  id: z.string().min(1).max(SHORT_ID),
  subjectRef: z.string().min(1).max(SHORT_ID),
  areaKey: z.string().max(SHORT_STR),
  severityKey: z.string().max(SHORT_STR),
  scheduleImpactKey: z.string().max(SHORT_STR),
  description: z.string().max(LONG_STR),
  supersededAt: z.string().max(64).nullable(),
});

export const ReferenceValueExportSchema = z.object({
  id: z.string().min(1).max(SHORT_ID),
  catalogKey: z.string().max(SHORT_STR),
  key: z.string().max(SHORT_STR),
  label: z.string().max(SHORT_STR),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  validFrom: z.string().max(64),
  validTo: z.string().max(64).nullable(),
});

export const AvkkExportSchema = z.object({
  payloadVersion: z.number().int().positive(),
  capturedAt: isoDateTime,
  subjects: z.array(AvkkSubjectExportSchema),
  responsibilities: z.array(AvkkResponsibilityExportSchema),
  competences: z.array(AvkkCompetenceExportSchema),
  consequences: z.array(AvkkConsequenceExportSchema),
  catalogRefs: z.array(z.object({ key: z.string().max(SHORT_STR), version: z.number().int() })),
  referenceValues: z.array(ReferenceValueExportSchema),
});
export type AvkkExport = z.infer<typeof AvkkExportSchema>;

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
  "avkk",
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
  avkk: AvkkExportSchema.optional(),

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
