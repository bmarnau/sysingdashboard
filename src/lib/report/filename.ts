/**
 * Dateinamensbildung der Reporting-Schicht.
 *
 * Orientiert sich am TDF-Naming: Dokumentkennung, sprechender Titel,
 * Version, Zeitstempel. TDF ist dabei Struktur-Referenz und ausdrücklich
 * keine Laufzeitabhängigkeit.
 */

import { REPORT_FORMAT_EXTENSION, type ReportDefinition, type ReportFormat } from "./types";

export function slugify(value: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function timestamp(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

export interface FileNameInput {
  definition: Pick<
    ReportDefinition,
    "reportId" | "title" | "version" | "fileNamePattern" | "documentId"
  >;
  format: ReportFormat;
  now?: Date;
  period?: string;
}

export function buildReportFileName(input: FileNameInput): string {
  const { definition, format } = input;
  const now = input.now ?? new Date();
  const values: Record<string, string> = {
    docId: definition.documentId,
    reportId: definition.reportId,
    slug: slugify(definition.title),
    version: `V${definition.version}`,
    period: slugify(input.period ?? ""),
    timestamp: timestamp(now),
  };
  const base = definition.fileNamePattern
    .replace(/\{(\w+)\}/g, (_m, key: string) => values[key] ?? "")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${base}.${REPORT_FORMAT_EXTENSION[format]}`;
}
