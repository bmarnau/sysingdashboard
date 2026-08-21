/**
 * PDF-Renderer auf Basis von jsPDF/autoTable.
 *
 * Enthält keine Fachlogik: Er zeichnet ausschließlich das neutrale
 * `ReportDocument` im Layout des aufgelösten Corporate Templates —
 * Deckblatt, Kopf-/Fußzeile, Seitenzahlen, Tabellen mit Umbruch.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportDocument, ReportRunMetadata, ReportTableSection } from "../types";
import type { ReportTemplate } from "../templates/types";

interface AutoTableDoc extends jsPDF {
  lastAutoTable?: { finalY: number };
}

const CONTENT_TOP_OFFSET_MM = 6;
const CONTENT_BOTTOM_MM = 18;
const SECTION_GAP_MM = 8;
const MIN_SECTION_START_MM = 28;

function drawHeader(doc: jsPDF, template: ReportTemplate, metadata: ReportRunMetadata) {
  const margin = template.page.marginMm;
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFont(template.brand.fontFamily, "bold");
  doc.setFontSize(10);
  doc.setTextColor(...template.brand.primary);
  doc.text(template.organization, margin, margin - 6);
  if (template.header.showDocumentId) {
    doc.setFont(template.brand.fontFamily, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...template.brand.muted);
    doc.text(`${metadata.documentId} · V${metadata.reportVersion}`, pageW - margin, margin - 6, {
      align: "right",
    });
  }
  doc.setDrawColor(...template.brand.primary);
  doc.line(margin, margin - 3, pageW - margin, margin - 3);
  doc.setTextColor(0);
}

function drawFooter(doc: jsPDF, template: ReportTemplate, metadata: ReportRunMetadata) {
  const margin = template.page.marginMm;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont(template.brand.fontFamily, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...template.brand.muted);
  doc.text(template.footer.note, margin, pageH - 8);
  if (template.footer.showPageNumbers) {
    const page = doc.getCurrentPageInfo().pageNumber;
    doc.text(`${metadata.createdBy} · Seite ${page}`, pageW - margin, pageH - 8, {
      align: "right",
    });
  }
  doc.setTextColor(0);
}

function tableColumnStyles(
  section: ReportTableSection,
  usableWidth: number,
): Record<number, { halign?: "right"; cellWidth?: number }> {
  const weights = section.columns.map((column) => Math.max(0.5, column.weight ?? 1));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const styles: Record<number, { halign?: "right"; cellWidth?: number }> = {};

  section.columns.forEach((column, index) => {
    styles[index] = {
      ...(column.align === "right" ? { halign: "right" as const } : {}),
      cellWidth: (usableWidth * weights[index]) / totalWeight,
    };
  });

  return styles;
}

export function renderPdf(
  document: ReportDocument,
  metadata: ReportRunMetadata,
  template: ReportTemplate,
): { blob: Blob; pages: number } {
  const margin = template.page.marginMm;
  const doc = new jsPDF({ unit: "mm", format: template.page.format }) as AutoTableDoc;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentTop = margin + CONTENT_TOP_OFFSET_MM;
  const contentBottom = pageH - CONTENT_BOTTOM_MM;
  const usableTableWidth = pageW - 2 * margin;

  const addContentPage = () => {
    doc.addPage();
    drawHeader(doc, template, metadata);
    drawFooter(doc, template, metadata);
    return contentTop;
  };

  const ensureSectionSpace = (cursor: number, minimum = MIN_SECTION_START_MM) => {
    if (cursor + minimum <= contentBottom) return cursor;
    return addContentPage();
  };

  /* ------------------------------ Deckblatt ------------------------------ */
  if (template.header.showLogo) {
    doc.setFillColor(...template.brand.primary);
    doc.rect(margin, margin, 20, 20, "F");
    doc.setTextColor(255);
    doc.setFont(template.brand.fontFamily, "bold");
    doc.setFontSize(12);
    doc.text(template.logoText, margin + 10, margin + 13, { align: "center" });
    doc.setTextColor(0);
  }
  doc.setFont(template.brand.fontFamily, "normal");
  doc.setFontSize(11);
  doc.text(template.organization, margin + 26, margin + 9);
  doc.setFontSize(8);
  doc.setTextColor(...template.brand.muted);
  doc.text(`${metadata.documentId} · V${metadata.reportVersion}`, margin + 26, margin + 15);
  doc.setTextColor(0);

  doc.setFont(template.brand.fontFamily, "bold");
  doc.setFontSize(22);
  const titleLines = doc.splitTextToSize(document.title, pageW - 2 * margin) as string[];
  doc.text(titleLines, margin, margin + 45);
  let y = margin + 45 + titleLines.length * 9;

  if (document.subtitle) {
    doc.setFont(template.brand.fontFamily, "normal");
    doc.setFontSize(11);
    doc.setTextColor(...template.brand.muted);
    const sub = doc.splitTextToSize(document.subtitle, pageW - 2 * margin) as string[];
    doc.text(sub, margin, y);
    y += sub.length * 6;
    doc.setTextColor(0);
  }

  y += 4;
  doc.setDrawColor(220);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: document.meta.map((m) => [m.label, m.value]),
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.4, overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 45, textColor: template.brand.muted },
      1: { fontStyle: "bold" },
    },
    didDrawPage: () => drawFooter(doc, template, metadata),
  });

  /* ------------------------------ Abschnitte ----------------------------- */
  // Das Deckblatt bleibt bewusst eigenständig. Ab hier fließen Abschnitte
  // kontinuierlich über die Folgeseiten; ein neuer Abschnitt erzeugt nicht
  // automatisch eine neue Seite.
  let cursor = addContentPage();

  for (const section of document.sections) {
    cursor = ensureSectionSpace(cursor);

    if (section.kind === "table") {
      doc.setFont(template.brand.fontFamily, "bold");
      doc.setFontSize(12);
      doc.setTextColor(...template.brand.primary);
      doc.text(section.title, margin, cursor);
      doc.setTextColor(0);
      cursor += 5;

      if (section.description) {
        doc.setFont(template.brand.fontFamily, "normal");
        doc.setFontSize(9);
        doc.setTextColor(...template.brand.muted);
        const desc = doc.splitTextToSize(section.description, pageW - 2 * margin) as string[];
        doc.text(desc, margin, cursor);
        cursor += desc.length * 4.4;
        doc.setTextColor(0);
      }

      autoTable(doc, {
        startY: cursor + 2,
        margin: { left: margin, right: margin, top: margin + 4, bottom: 16 },
        head: [section.columns.map((c) => c.label)],
        body: section.rows.length
          ? section.rows.map((r) => r.map((cell) => String(cell ?? "")))
          : [
              [
                section.emptyText ?? "Keine Daten im gewählten Umfang",
                ...Array(Math.max(0, section.columns.length - 1)).fill(""),
              ],
            ],
        theme: "grid",
        headStyles: {
          fillColor: template.brand.primary,
          textColor: template.brand.tableHeaderText,
          fontSize: 8.5,
          valign: "middle",
        },
        styles: {
          fontSize: 8,
          cellPadding: 1.6,
          overflow: "linebreak",
          valign: "middle",
        },
        columnStyles: tableColumnStyles(section, usableTableWidth),
        rowPageBreak: "avoid",
        didDrawPage: () => {
          drawHeader(doc, template, metadata);
          drawFooter(doc, template, metadata);
        },
      });
      cursor = (doc.lastAutoTable?.finalY ?? cursor) + SECTION_GAP_MM;
    } else if (section.kind === "kpi") {
      doc.setFont(template.brand.fontFamily, "bold");
      doc.setFontSize(12);
      doc.setTextColor(...template.brand.primary);
      doc.text(section.title, margin, cursor);
      doc.setTextColor(0);

      autoTable(doc, {
        startY: cursor + 4,
        margin: { left: margin, right: margin, top: margin + 4, bottom: 16 },
        head: [["Kennzahl", "Wert"]],
        body: section.items.map((i) => [i.label, String(i.value)]),
        theme: "striped",
        headStyles: {
          fillColor: template.brand.primary,
          textColor: template.brand.tableHeaderText,
          fontSize: 8.5,
          valign: "middle",
        },
        styles: { fontSize: 9, cellPadding: 1.8, valign: "middle" },
        columnStyles: { 1: { halign: "right", cellWidth: 34, fontStyle: "bold" } },
        didDrawPage: () => {
          drawHeader(doc, template, metadata);
          drawFooter(doc, template, metadata);
        },
      });
      cursor = (doc.lastAutoTable?.finalY ?? cursor) + SECTION_GAP_MM;
    } else {
      if (section.title) {
        doc.setFont(template.brand.fontFamily, "bold");
        doc.setFontSize(12);
        doc.setTextColor(...template.brand.primary);
        doc.text(section.title, margin, cursor);
        doc.setTextColor(0);
        cursor += 6;
      }

      doc.setFont(template.brand.fontFamily, "normal");
      doc.setFontSize(10);
      for (const paragraph of section.paragraphs) {
        const lines = doc.splitTextToSize(paragraph, pageW - 2 * margin) as string[];
        for (const line of lines) {
          if (cursor > contentBottom) {
            cursor = addContentPage();
          }
          doc.text(line, margin, cursor);
          cursor += 5;
        }
        cursor += 3;
      }
      cursor += SECTION_GAP_MM - 3;
    }
  }

  doc.setProperties({
    title: document.title,
    author: metadata.createdBy,
    subject: metadata.title,
    keywords: [metadata.documentId, metadata.reportId, `V${metadata.reportVersion}`].join(", "),
    creator: `${template.organization} Dashboard ${metadata.dashboardVersion}`,
  });

  const raw = doc.output("blob");
  const blob = raw.type === "application/pdf" ? raw : new Blob([raw], { type: "application/pdf" });
  return { blob, pages: doc.getNumberOfPages() };
}
