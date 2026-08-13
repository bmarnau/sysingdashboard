/**
 * CSV-Renderer: verdichtet alle Tabellen- und Kennzahlabschnitte in eine
 * Datei. Trennzeichen ist das Semikolon (Excel/DE), Zeichensatz UTF-8 mit BOM.
 */

import type { ReportDocument, ReportRunMetadata } from "../types";

function escapeCell(value: string | number): string {
  const text = String(value ?? "");
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildReportCsv(document: ReportDocument, metadata: ReportRunMetadata): string {
  const lines: string[] = [];
  lines.push(["Bericht", document.title].map(escapeCell).join(";"));
  lines.push(["Berichtskennung", metadata.reportId].map(escapeCell).join(";"));
  lines.push(["Version", metadata.reportVersion].map(escapeCell).join(";"));
  lines.push(["Erstellt am", metadata.createdAt].map(escapeCell).join(";"));
  lines.push(["Erstellt von", metadata.createdBy].map(escapeCell).join(";"));
  for (const entry of document.meta) {
    lines.push([entry.label, entry.value].map(escapeCell).join(";"));
  }
  lines.push("");

  for (const section of document.sections) {
    if (section.kind === "table") {
      lines.push(escapeCell(section.title));
      lines.push(section.columns.map((c) => escapeCell(c.label)).join(";"));
      if (section.rows.length === 0) {
        lines.push(escapeCell(section.emptyText ?? "Keine Daten"));
      } else {
        for (const row of section.rows) lines.push(row.map(escapeCell).join(";"));
      }
      lines.push("");
    } else if (section.kind === "kpi") {
      lines.push(escapeCell(section.title));
      lines.push(["Kennzahl", "Wert"].join(";"));
      for (const item of section.items) {
        lines.push([item.label, item.value].map(escapeCell).join(";"));
      }
      lines.push("");
    } else {
      if (section.title) lines.push(escapeCell(section.title));
      for (const paragraph of section.paragraphs) lines.push(escapeCell(paragraph));
      lines.push("");
    }
  }
  return lines.join("\r\n");
}

export function renderCsv(document: ReportDocument, metadata: ReportRunMetadata): Blob {
  return new Blob(["\uFEFF", buildReportCsv(document, metadata)], {
    type: "text/csv;charset=utf-8",
  });
}
