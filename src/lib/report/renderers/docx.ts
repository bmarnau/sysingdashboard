/**
 * Word-Renderer (docx). Erzeugt dieselbe Dokumentstruktur wie PDF und Druck
 * aus dem neutralen `ReportDocument` — Kopfzeile, Fußzeile mit Seitenzahl,
 * Tabellen mit fester Spaltenbreite (DXA) und wiederholtem Kopf.
 */

import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
} from "docx";
import type { ReportDocument, ReportRunMetadata } from "../types";
import type { ReportTemplate } from "../templates/types";

/** US-Letter wird bewusst nicht genutzt: A4 ist der europäische Standard. */
const PAGE_WIDTH = 11906;
const MARGIN = 1134; // 2 cm
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

const hex = (c: [number, number, number]) =>
  c
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function columnWidths(count: number): number[] {
  const base = Math.floor(CONTENT_WIDTH / count);
  const widths = Array(count).fill(base);
  widths[count - 1] = CONTENT_WIDTH - base * (count - 1);
  return widths;
}

function textCell(
  text: string,
  width: number,
  opts: { bold?: boolean; fill?: string; color?: string; right?: boolean } = {},
) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    ...(opts.fill ? { shading: { fill: opts.fill, type: ShadingType.CLEAR } } : {}),
    children: [
      new Paragraph({
        alignment: opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [new TextRun({ text, bold: opts.bold, color: opts.color, size: 18 })],
      }),
    ],
  });
}

function buildTable(
  columns: Array<{ label: string; align?: "left" | "right" }>,
  rows: Array<Array<string | number>>,
  emptyText: string,
  primary: string,
): Table {
  const widths = columnWidths(columns.length);
  const header = new TableRow({
    tableHeader: true,
    children: columns.map((c, i) =>
      textCell(c.label, widths[i], {
        bold: true,
        fill: primary,
        color: "FFFFFF",
        right: c.align === "right",
      }),
    ),
  });
  const body = rows.length
    ? rows.map(
        (row) =>
          new TableRow({
            children: row.map((cell, i) =>
              textCell(String(cell ?? ""), widths[i], { right: columns[i]?.align === "right" }),
            ),
          }),
      )
    : [
        new TableRow({
          children: columns.map((_, i) => textCell(i === 0 ? emptyText : "", widths[i])),
        }),
      ];
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [header, ...body],
  });
}

export async function renderDocx(
  document: ReportDocument,
  metadata: ReportRunMetadata,
  template: ReportTemplate,
): Promise<Blob> {
  const primary = hex(template.brand.primary);
  const children: Array<Paragraph | Table> = [];

  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(document.title)] }),
  );
  if (document.subtitle) {
    children.push(
      new Paragraph({ children: [new TextRun({ text: document.subtitle, italics: true })] }),
    );
  }
  const metaWidths = columnWidths(2);
  children.push(
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: metaWidths,
      rows: document.meta.map(
        (m) =>
          new TableRow({
            children: [
              textCell(m.label, metaWidths[0]),
              textCell(m.value, metaWidths[1], { bold: true }),
            ],
          }),
      ),
    }),
  );

  for (const section of document.sections) {
    children.push(new Paragraph({ text: "" }));
    if (section.kind === "table") {
      children.push(
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(section.title)] }),
      );
      if (section.description) {
        children.push(new Paragraph({ children: [new TextRun(section.description)] }));
      }
      children.push(
        buildTable(
          section.columns,
          section.rows,
          section.emptyText ?? "Keine Daten im gewählten Umfang",
          primary,
        ),
      );
    } else if (section.kind === "kpi") {
      children.push(
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(section.title)] }),
      );
      children.push(
        buildTable(
          [{ label: "Kennzahl" }, { label: "Wert", align: "right" }],
          section.items.map((i) => [i.label, String(i.value)]),
          "Keine Kennzahlen",
          primary,
        ),
      );
    } else {
      if (section.title) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun(section.title)],
          }),
        );
      }
      for (const paragraph of section.paragraphs) {
        children.push(new Paragraph({ children: [new TextRun(paragraph)] }));
      }
    }
  }

  const doc = new Document({
    creator: metadata.createdBy,
    title: document.title,
    description: metadata.title,
    styles: {
      default: { document: { run: { font: "Arial", size: 20 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 32, bold: true, font: "Arial", color: primary },
          paragraph: { spacing: { before: 200, after: 200 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, font: "Arial", color: primary },
          paragraph: { spacing: { before: 180, after: 120 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: 16838 },
            margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: template.organization, bold: true, color: primary }),
                  new TextRun({
                    text: `   ${metadata.documentId} · V${metadata.reportVersion}`,
                    color: "808080",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `${template.footer.note} · Seite `, color: "808080" }),
                  new TextRun({ children: [PageNumber.CURRENT], color: "808080" }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  return buffer;
}
