/**
 * Typen und Label-Maps für das Compliance-Dashboard
 * (UI-only Layer über test-report/technical-test-report.json, ADR-0017).
 */
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface Finding {
  id: string;
  severity: Severity;
  category: string;
  area: string;
  title: string;
  description?: string;
  recommendation?: string;
  components?: string[];
  evidence?: { file?: string | null; reportRef?: string | null };
  bucket: string;
  status: string;
  source: "auto" | "manual";
  accepted: boolean;
  effort: string;
  classification?: "confirmed" | "false-positive" | "accepted-debt" | "fixed" | "not-applicable";
  gateRelevant?: boolean;
  rootCause?: string;
  adrRef?: string | null;
}

export interface ReportSection {
  status: string;
  evidence?: string | null;
  note?: string;
}

export interface ReleaseStage {
  proposed: string;
  effective?: string;
  reason: string;
  overridden?: {
    by: string;
    at: string;
    reason: string;
    ticket?: string | null;
  };
}

export interface Report {
  schemaVersion?: string;
  id?: string;
  version?: number;
  parentReportId?: string | null;
  generatedAt: string;
  identity: {
    dashboardVersion: string;
    commit: string;
    buildTime: string | null;
    testTime: string;
    buildTag?: string | null;
    dbMigrationHead?: string | null;
    generatedBy?: string;
    environment: { node: string; platform: string; ci: boolean };
  };
  status: string;
  recommendation: { level: string; reason: string };
  releaseStage?: ReleaseStage;
  sections?: Record<string, ReportSection>;
  integrity?: { algo: string; value: string; fields: string[] };
  summary: {
    total: number;
    openTotal?: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    accepted: number;
    sources: Record<string, { status: string; count: number }>;
  };
  areas: Record<string, { status: string; openCritical: number; openHigh: number }>;
  findings: Finding[];
  diff: {
    new: string[];
    fixed: string[];
    worse: string[];
    same: string[];
    reappeared: string[];
    severityChanged?: Array<{ id: string; from: string; to: string }>;
    gateChanged?: Array<{ id: string; from: boolean; to: boolean }>;
    statusChanged?: Array<{ id: string; from: string; to: string }>;
    securityRegressions?: Array<{ id: string; kind: string; severity?: string; from?: string; to?: string }>;
  } | null;
}


export const STATUS_LABEL: Record<string, string> = {
  passed: "bestanden",
  "passed-with-findings": "mit Findings",
  failed: "fehlgeschlagen",
  blocked: "blockiert",
  "not-run": "nicht ausgeführt",
};

export const REC_LABEL: Record<string, string> = {
  "continue-development": "Entwicklung fortsetzen",
  "pilot-ready": "für Pilot geeignet",
  "restricted-pilot": "nur eingeschränkt pilotfähig",
  "not-pilot": "nicht pilotfähig",
  "not-production": "nicht produktionsfähig",
  "next-phase": "für nächste Phase freigegeben",
};

export const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

export function parseReport(raw: string): Report | null {
  try {
    return JSON.parse(raw) as Report;
  } catch {
    return null;
  }
}

/**
 * Semantisch benannte Tailwind-Klassen pro Schweregrad — nutzt ausschließlich
 * Design-Tokens aus src/styles.css (destructive, warning, muted, accent).
 */
export function severityClasses(sev: Severity): {
  badge: string;
  tile: string;
  dot: string;
  label: string;
} {
  switch (sev) {
    case "CRITICAL":
      return {
        badge: "bg-destructive/15 text-destructive",
        tile: "border-destructive/40 bg-destructive/10",
        dot: "bg-destructive",
        label: "Kritisch",
      };
    case "HIGH":
      return {
        badge: "bg-warning/20 text-warning-foreground",
        tile: "border-warning/40 bg-warning/10",
        dot: "bg-warning",
        label: "Hoch",
      };
    case "MEDIUM":
      return {
        badge: "bg-accent text-accent-foreground",
        tile: "border-border bg-accent/60",
        dot: "bg-accent-foreground/60",
        label: "Mittel",
      };
    case "LOW":
      return {
        badge: "bg-muted text-muted-foreground",
        tile: "border-border bg-muted/50",
        dot: "bg-muted-foreground/60",
        label: "Niedrig",
      };
    default:
      return {
        badge: "bg-secondary text-secondary-foreground",
        tile: "border-border bg-secondary/40",
        dot: "bg-muted-foreground/50",
        label: "Info",
      };
  }
}

export function statusToneClass(status: string): string {
  if (status === "passed") return "text-success";
  if (status === "failed" || status === "blocked") return "text-destructive";
  if (status === "not-run") return "text-muted-foreground";
  return "text-warning";
}
