/**
 * Vertrag der Reporting-Schicht (Sprint 09A, ADR-0028).
 *
 * Bewusst **providerneutral**: keine React-, Supabase- oder Renderer-Importe.
 * Eine `ReportDefinition` beschreibt einen Bericht deklarativ; das konkrete
 * Ausgabeformat entscheidet erst der Renderer. Damit lassen sich später
 * weitere Renderer (z. B. serverseitiges PDF im Container) ergänzen, ohne die
 * Fachlogik anzufassen.
 */

import type { Permission } from "@/lib/rbac/permissions";

/** Produktiv freigegebene Ausgabeformate des MVP. */
export const REPORT_FORMATS = ["pdf", "print", "json", "csv", "docx"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export const REPORT_FORMAT_LABEL: Record<ReportFormat, string> = {
  pdf: "PDF",
  print: "Druck",
  json: "JSON",
  csv: "CSV",
  docx: "Word",
};

export const REPORT_FORMAT_EXTENSION: Record<ReportFormat, string> = {
  pdf: "pdf",
  print: "html",
  json: "json",
  csv: "csv",
  docx: "docx",
};

/* ----------------------------- Dokumentmodell ---------------------------- */

export interface ReportColumn {
  key: string;
  label: string;
  align?: "left" | "right";
  /** Relatives Breitenmaß (1 = Standard). Renderer dürfen es interpretieren. */
  weight?: number;
}

export interface ReportTableSection {
  kind: "table";
  id: string;
  title: string;
  description?: string;
  columns: ReportColumn[];
  rows: Array<Array<string | number>>;
  emptyText?: string;
}

export interface ReportTextSection {
  kind: "text";
  id: string;
  title?: string;
  paragraphs: string[];
}

export interface ReportKpiSection {
  kind: "kpi";
  id: string;
  title: string;
  items: Array<{ label: string; value: string | number; hint?: string }>;
}

export type ReportSection = ReportTableSection | ReportTextSection | ReportKpiSection;

/** Neutrales Zwischenformat — jeder Renderer liest ausschließlich dieses. */
export interface ReportDocument {
  reportId: string;
  title: string;
  subtitle?: string;
  /** Kopfdaten des Deckblatts (Kunde, Zeitraum, Ersteller, …). */
  meta: Array<{ label: string; value: string }>;
  sections: ReportSection[];
}

/* --------------------------------- Kontext -------------------------------- */

export interface ReportActor {
  id: string | null;
  displayName: string;
  role: string;
}

export interface ReportContext {
  actor: ReportActor;
  generatedAt: Date;
  /** Fachlicher Zeitraum, falls der Bericht einen hat (YYYY-MM oder Freitext). */
  period?: string;
}

/** Erzeugungs- und Nachweismetadaten eines konkreten Laufs. */
export interface ReportRunMetadata {
  reportId: string;
  reportVersion: string;
  title: string;
  createdAt: string;
  createdBy: string;
  format: ReportFormat;
  templateId: string;
  templateSource: string;
  dashboardVersion: string;
  documentId: string;
  period: string;
}

/* ------------------------------- Definition ------------------------------- */

export interface ReportDefinition<TInput = unknown> {
  reportId: string;
  title: string;
  description: string;
  /** SemVer des Berichtsvertrags, nicht des Dashboards. */
  version: string;
  /** Sprechende Kennung der Datenquelle (für Doku und Nachweis). */
  dataSource: string;
  /** Erforderliche Berechtigung; `null` = jede angemeldete Rolle. */
  permission: Permission | null;
  templateId: string;
  formats: readonly ReportFormat[];
  /**
   * Dateinamensschema mit Platzhaltern:
   * `{docId}`, `{reportId}`, `{slug}`, `{version}`, `{period}`, `{timestamp}`.
   */
  fileNamePattern: string;
  /** TDF-Dokumentkennung, z. B. `SYSING-101`. */
  documentId: string;
  metadata?: Record<string, string>;
  /** Reine Abbildung Daten → Dokument. Keine Seiteneffekte. */
  build: (input: TInput, ctx: ReportContext) => ReportDocument;
}

/** Ergebnis eines Renderlaufs. */
export interface RenderedReport {
  fileName: string;
  mimeType: string;
  format: ReportFormat;
  blob: Blob;
  /** Nur bei `print` gesetzt: fertiges HTML für das Druckfenster. */
  html?: string;
  document: ReportDocument;
  metadata: ReportRunMetadata;
}
