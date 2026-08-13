/**
 * Zentrale Reporting-Fassade.
 *
 * Die UI kennt ausschließlich diese Datei: Bericht wählen, Daten übergeben,
 * Format wählen. Template-Auflösung, Metadaten, Dateiname und Renderer sind
 * gekapselt und damit austauschbar (ADR-0028).
 */

import { DASHBOARD_VERSION } from "@/lib/help-documentation";
import { can, type Permission } from "@/lib/rbac/permissions";
import type { UserProfile } from "@/lib/rbac/types";
import { buildReportFileName } from "./filename";
import { getReport, listReports } from "./registry";
import { resolveTemplate } from "./templates";
import { renderCsv } from "./renderers/csv";
import { renderDocx } from "./renderers/docx";
import { renderJson } from "./renderers/json";
import { renderPdf } from "./renderers/pdf";
import { renderPrint } from "./renderers/print";
import type {
  RenderedReport,
  ReportContext,
  ReportDefinition,
  ReportFormat,
  ReportRunMetadata,
} from "./types";

const MIME: Record<ReportFormat, string> = {
  pdf: "application/pdf",
  print: "text/html;charset=utf-8",
  json: "application/json",
  csv: "text/csv;charset=utf-8",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** Berichte, die der aktive Benutzer aufrufen darf. */
export function listAvailableReports(user: UserProfile | null): ReportDefinition<never>[] {
  return listReports().filter(
    (definition) =>
      definition.permission === null || can(user, definition.permission as Permission),
  );
}

export interface RenderRequest<TInput> {
  reportId: string;
  format: ReportFormat;
  input: TInput;
  context: ReportContext;
}

export async function renderReport<TInput>(
  request: RenderRequest<TInput>,
): Promise<RenderedReport> {
  const definition = getReport(request.reportId) as ReportDefinition<TInput> | undefined;
  if (!definition) throw new Error(`Unbekannter Bericht: ${request.reportId}`);
  if (!definition.formats.includes(request.format)) {
    throw new Error(`Format ${request.format} ist für ${definition.reportId} nicht freigegeben`);
  }

  const template = await resolveTemplate(definition.templateId);
  const document = definition.build(request.input, request.context);

  const metadata: ReportRunMetadata = {
    reportId: definition.reportId,
    reportVersion: definition.version,
    title: definition.title,
    createdAt: request.context.generatedAt.toISOString(),
    createdBy: request.context.actor.displayName,
    format: request.format,
    templateId: template.id,
    templateSource: template.source,
    dashboardVersion: DASHBOARD_VERSION,
    documentId: definition.documentId,
    period: request.context.period ?? "",
  };

  const fileName = buildReportFileName({
    definition,
    format: request.format,
    now: request.context.generatedAt,
    period: request.context.period,
  });

  let blob: Blob;
  let html: string | undefined;
  switch (request.format) {
    case "pdf":
      blob = renderPdf(document, metadata, template).blob;
      break;
    case "print": {
      const printed = renderPrint(document, metadata, template);
      blob = printed.blob;
      html = printed.html;
      break;
    }
    case "json":
      blob = renderJson(document, metadata);
      break;
    case "csv":
      blob = renderCsv(document, metadata);
      break;
    case "docx":
      blob = await renderDocx(document, metadata, template);
      break;
    default:
      throw new Error(`Renderer fehlt für Format ${request.format}`);
  }

  return { fileName, mimeType: MIME[request.format], format: request.format, blob, html, document, metadata };
}
