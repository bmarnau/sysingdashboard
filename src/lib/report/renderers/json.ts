/** JSON-Renderer: versionierter, maschinenlesbarer Datenvertrag. */

import type { ReportDocument, ReportRunMetadata } from "../types";

export const REPORT_JSON_CONTRACT_VERSION = "1.0.0";

export interface ReportJsonPayload {
  contractVersion: string;
  metadata: ReportRunMetadata;
  document: ReportDocument;
}

export function buildReportJson(
  document: ReportDocument,
  metadata: ReportRunMetadata,
): ReportJsonPayload {
  return { contractVersion: REPORT_JSON_CONTRACT_VERSION, metadata, document };
}

export function renderJson(document: ReportDocument, metadata: ReportRunMetadata): Blob {
  return new Blob([JSON.stringify(buildReportJson(document, metadata), null, 2)], {
    type: "application/json",
  });
}
