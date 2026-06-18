/**
 * JsonSchemaValidationService
 *
 * Validiert ein JSON-Exportdokument gegen das versionierte Schema und
 * prüft anschließend referenzielle Integrität (project→customer,
 * workPackage→project, activity→workPackage, timeEntry→activity/engineer).
 *
 * Stufe 1: Verwendung durch Beispieldatei-Tests und den Export-„Prüfen"-
 * Button. Stufe 2 (Import) ruft denselben Service vor der Vorschau auf.
 */

import {
  DashboardJsonExportSchema,
  JSON_SCHEMA_VERSION,
  type DashboardJsonExport,
} from "@/lib/json-schema";

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  severity: ValidationSeverity;
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  schemaValid: boolean;
  issues: ValidationIssue[];
  /** Zählt Entitäten — nützlich für die Import-Vorschau. */
  counts: Record<string, number>;
  /** Parsed-Document — nur gesetzt, wenn das Schema gültig war. */
  document?: DashboardJsonExport;
}

function pushUnique(arr: ValidationIssue[], issue: ValidationIssue) {
  if (!arr.some((i) => i.path === issue.path && i.message === issue.message)) {
    arr.push(issue);
  }
}

export const JsonSchemaValidationService = {
  validate(json: unknown): ValidationResult {
    const issues: ValidationIssue[] = [];
    const counts: Record<string, number> = {};

    const parsed = DashboardJsonExportSchema.safeParse(json);
    if (!parsed.success) {
      for (const e of parsed.error.issues) {
        issues.push({
          severity: "error",
          path: e.path.join(".") || "(root)",
          message: e.message,
        });
      }
      return { ok: false, schemaValid: false, issues, counts };
    }

    const doc = parsed.data;

    // Schema-Versions-Hinweis (kein Fehler, nur Warnung — Forward-Compat)
    if (doc.schemaVersion !== JSON_SCHEMA_VERSION) {
      pushUnique(issues, {
        severity: "warning",
        path: "schemaVersion",
        message: `Schema-Version ${doc.schemaVersion} weicht von der aktuellen ${JSON_SCHEMA_VERSION} ab.`,
      });
    }

    counts.users = doc.users?.length ?? 0;
    counts.customers = doc.customers?.length ?? 0;
    counts.projects = doc.projects?.length ?? 0;
    counts.workPackages = doc.workPackages?.length ?? 0;
    counts.activities = doc.activities?.length ?? 0;
    counts.timeEntries = doc.timeEntries?.length ?? 0;
    counts.targetTimeModels = doc.targetTimeModels?.length ?? 0;
    counts.settings = doc.settings?.length ?? 0;

    const customerIds = new Set((doc.customers ?? []).map((c) => c.id));
    const projectIds = new Set((doc.projects ?? []).map((p) => p.id));
    const wpIds = new Set((doc.workPackages ?? []).map((w) => w.id));
    const activityIds = new Set((doc.activities ?? []).map((a) => a.id));
    const userIds = new Set((doc.users ?? []).map((u) => u.id));

    // project → customer
    for (const p of doc.projects ?? []) {
      if (p.customerId && customerIds.size > 0 && !customerIds.has(p.customerId)) {
        pushUnique(issues, {
          severity: "warning",
          path: `projects[${p.id}].customerId`,
          message: `Unbekannte Kunden-Referenz "${p.customerId}".`,
        });
      }
    }
    // workPackage → project
    for (const w of doc.workPackages ?? []) {
      if (w.projectId && projectIds.size > 0 && !projectIds.has(w.projectId)) {
        pushUnique(issues, {
          severity: "warning",
          path: `workPackages[${w.id}].projectId`,
          message: `Unbekannte Projekt-Referenz "${w.projectId}".`,
        });
      }
    }
    // activity → workPackage
    for (const a of doc.activities ?? []) {
      if (a.workPackageId && wpIds.size > 0 && !wpIds.has(a.workPackageId)) {
        pushUnique(issues, {
          severity: "warning",
          path: `activities[${a.id}].workPackageId`,
          message: `Unbekannte Arbeitspaket-Referenz "${a.workPackageId}".`,
        });
      }
      if (a.engineerId && userIds.size > 0 && !userIds.has(a.engineerId)) {
        pushUnique(issues, {
          severity: "warning",
          path: `activities[${a.id}].engineerId`,
          message: `Unbekannter Benutzer "${a.engineerId}".`,
        });
      }
    }
    // timeEntry → activity / engineer
    for (const t of doc.timeEntries ?? []) {
      if (activityIds.size > 0 && !activityIds.has(t.activityId)) {
        pushUnique(issues, {
          severity: "warning",
          path: `timeEntries[${t.id}].activityId`,
          message: `Unbekannte Tätigkeit "${t.activityId}".`,
        });
      }
      if (t.engineerId && userIds.size > 0 && !userIds.has(t.engineerId)) {
        pushUnique(issues, {
          severity: "warning",
          path: `timeEntries[${t.id}].engineerId`,
          message: `Unbekannter Benutzer "${t.engineerId}".`,
        });
      }
    }

    const hasErrors = issues.some((i) => i.severity === "error");
    return { ok: !hasErrors, schemaValid: true, issues, counts, document: doc };
  },
};
