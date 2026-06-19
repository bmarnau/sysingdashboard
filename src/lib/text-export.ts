/**
 * Erzeugt Text-Exporte (CSV, JSON, Azure NDJSON) aus den Dashboard-Daten.
 *
 * Ergänzt den bestehenden PDF-Export-Pfad. Liefert Blob + Preview-Text und
 * eine eindeutige Report-ID, die in den Dateinamen einfließt.
 */

import type { Activity, Engineer, Project, WorkPackage } from "@/lib/dashboard-data";
import type { ExportData, ExportFormat } from "@/lib/export-data";

export interface TextExportContext {
  engineer: Engineer;
  projects: Project[];
  workPackages: WorkPackage[];
  activities: Activity[];
  exportData: ExportData;
}

export interface TextExportResult {
  blob: Blob;
  mimeType: string;
  text: string; // vollständiger Inhalt (für Preview & Download identisch)
  reportId: string;
  bytes: number;
}

export function generateReportId(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `REP-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/* ------------------------------ Helpers -------------------------------- */

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",;\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function projectOf(ctx: TextExportContext, a: Activity): Project | undefined {
  if (!a.workPackageId) return undefined;
  const wp = ctx.workPackages.find((w) => w.id === a.workPackageId);
  if (!wp?.projectId) return undefined;
  return ctx.projects.find((p) => p.id === wp.projectId);
}

function workPackageOf(ctx: TextExportContext, a: Activity): WorkPackage | undefined {
  return a.workPackageId ? ctx.workPackages.find((w) => w.id === a.workPackageId) : undefined;
}

function filteredActivityIds(ctx: TextExportContext): Set<string> | null {
  // Falls Gruppierungsbaum activityIds führt, nur diese verwenden.
  const ids = new Set<string>();
  const walk = (nodes: typeof ctx.exportData.groups) => {
    for (const n of nodes) {
      n.activityIds?.forEach((id) => ids.add(id));
      if (n.children.length) walk(n.children);
    }
  };
  walk(ctx.exportData.groups);
  return ids.size === 0 ? null : ids;
}

function selectedActivities(ctx: TextExportContext): Activity[] {
  const ids = filteredActivityIds(ctx);
  const list = ids ? ctx.activities.filter((a) => ids.has(a.id)) : ctx.activities;
  return [...list].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

/* ------------------------------- Builder ------------------------------- */

export function buildJson(ctx: TextExportContext): TextExportResult {
  const reportId = generateReportId();
  const payload = {
    reportId,
    generatedAt: new Date().toISOString(),
    engineer: ctx.engineer,
    configuration: ctx.exportData.configuration,
    summary: ctx.exportData.summary,
    groups: ctx.exportData.groups,
    activities: selectedActivities(ctx),
  };
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  return { blob, mimeType: "application/json", text, reportId, bytes: blob.size };
}

export function buildCsv(ctx: TextExportContext): TextExportResult {
  const reportId = generateReportId();
  const header = [
    "reportId",
    "date",
    "engineer",
    "client",
    "project",
    "workPackage",
    "activity",
    "durationHours",
    "billable",
    "billingStatus",
    "hourlyRate",
    "amountEur",
    "description",
  ];
  const rows = selectedActivities(ctx).map((a) => {
    const p = projectOf(ctx, a);
    const wp = workPackageOf(ctx, a);
    const amount = a.billable ? a.duration * (a.hourlyRate ?? 0) : 0;
    return [
      reportId,
      a.date,
      ctx.engineer.name,
      a.client ?? p?.client ?? wp?.client ?? "",
      p?.name ?? "",
      wp?.title ?? "",
      a.title,
      a.duration,
      a.billable ? "true" : "false",
      a.billingStatus,
      a.hourlyRate ?? 0,
      amount.toFixed(2),
      a.description ?? "",
    ].map(csvEscape).join(";");
  });
  const text = [header.join(";"), ...rows].join("\r\n") + "\r\n";
  const blob = new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" });
  return { blob, mimeType: "text/csv", text, reportId, bytes: blob.size };
}

export function buildAzureTable(ctx: TextExportContext): TextExportResult {
  const reportId = generateReportId();
  const partitionKey = ctx.exportData.configuration.month; // YYYY-MM
  const lines = selectedActivities(ctx).map((a) => {
    const p = projectOf(ctx, a);
    const wp = workPackageOf(ctx, a);
    return JSON.stringify({
      PartitionKey: partitionKey,
      RowKey: a.id,
      ReportId: reportId,
      Date: a.date,
      Engineer: ctx.engineer.name,
      Client: a.client ?? p?.client ?? wp?.client ?? "",
      Project: p?.name ?? "",
      WorkPackage: wp?.title ?? "",
      Activity: a.title,
      DurationHours: a.duration,
      Billable: a.billable,
      BillingStatus: a.billingStatus,
      HourlyRate: a.hourlyRate ?? 0,
      AmountEur: a.billable ? a.duration * (a.hourlyRate ?? 0) : 0,
    });
  });
  const text = lines.join("\n") + (lines.length ? "\n" : "");
  const blob = new Blob([text], { type: "application/x-ndjson" });
  return { blob, mimeType: "application/x-ndjson", text, reportId, bytes: blob.size };
}

export function buildTextExport(format: ExportFormat, ctx: TextExportContext): TextExportResult {
  switch (format) {
    case "json":
      return buildJson(ctx);
    case "csv":
      return buildCsv(ctx);
    case "azure-table":
      return buildAzureTable(ctx);
    default:
      throw new Error(`buildTextExport: Format nicht unterstützt: ${format}`);
  }
}

/** Hängt die Report-ID vor die Dateiendung. */
export function withReportIdInFileName(fileName: string, reportId: string): string {
  if (fileName.includes(reportId)) return fileName;
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return `${fileName}_${reportId}`;
  return `${fileName.slice(0, dot)}_${reportId}${fileName.slice(dot)}`;
}
