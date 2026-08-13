/**
 * Erzeugt die verteilbaren Fassungen von SYSING-001 aus **einer** Quelle:
 * `docs/SYSING-001_*.md`. Ausgabe ist eine Word-Datei (docx). Die PDF-Fassung
 * wird aus derselben Word-Datei konvertiert (siehe docs/PROJECT-GOVERNANCE.md),
 * damit Inhalt, Reihenfolge und Statuskennzeichnungen zwingend identisch sind.
 *
 * Aufruf: node scripts/docs/build-sysing-001.mjs [--out <verzeichnis>]
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const DOCS_DIR = "docs";
const PRIMARY = "1F4E79";
const PAGE_WIDTH = 11906; // A4
const PAGE_HEIGHT = 16838;
const MARGIN = 1134; // 2 cm
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

function sourceFile() {
  const match = readdirSync(DOCS_DIR)
    .filter((f) => /^SYSING-001_.*\.md$/.test(f))
    .sort();
  if (match.length !== 1) {
    throw new Error(`Erwartet genau eine SYSING-001-Quelle, gefunden: ${match.length}`);
  }
  return join(DOCS_DIR, match[0]);
}

/** Markdown-Inline (**fett**, `code`) in docx-TextRuns übersetzen. */
function runs(text, base = {}) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(new TextRun({ text: token.slice(2, -2), bold: true, ...base }));
    } else {
      parts.push(new TextRun({ text: token.slice(1, -1), font: "Consolas", ...base }));
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(new TextRun({ text: text.slice(last), ...base }));
  return parts.length ? parts : [new TextRun({ text: "", ...base })];
}

function columnWidths(count, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => Math.floor((CONTENT_WIDTH * w) / total));
  widths[count - 1] = CONTENT_WIDTH - widths.slice(0, -1).reduce((a, b) => a + b, 0);
  return widths;
}

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function cell(text, width, opts = {}) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    ...(opts.fill ? { shading: { fill: opts.fill, type: ShadingType.CLEAR } } : {}),
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: runs(text, { size: 18, bold: opts.bold, color: opts.color }),
      }),
    ],
  });
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function buildTable(rows) {
  const header = splitRow(rows[0]);
  const body = rows.slice(2).map(splitRow);
  /* Spaltenbreite nach längstem Zellinhalt gewichten: verhindert, dass die
     schmale Spalte „Stufe" den breiten Fließtext erdrückt. */
  const weights = header.map((_, i) => {
    const max = Math.max(header[i].length, ...body.map((r) => (r[i] ?? "").length));
    return Math.min(Math.max(max, 6), 70);
  });
  const widths = columnWidths(header.length, weights);
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: header.map((h, i) => cell(h, widths[i], { bold: true, fill: PRIMARY, color: "FFFFFF" })),
      }),
      ...body.map(
        (r) => new TableRow({ children: widths.map((w, i) => cell(r[i] ?? "", w)) }),
      ),
    ],
  });
}

function markdownToChildren(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const children = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Codeblock (ASCII-Diagramme) — Monospace, keine Silbentrennung
    if (line.trim().startsWith("```")) {
      i += 1;
      const block = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        block.push(lines[i]);
        i += 1;
      }
      i += 1;
      block.forEach((raw, idx) => {
        children.push(
          new Paragraph({
            // Diagramm zusammenhalten: kein Seitenumbruch mitten im ASCII-Bild
            keepLines: true,
            keepNext: idx < block.length - 1,
            spacing: { before: 0, after: 0, line: 220, lineRule: "exact" },
            shading: { fill: "F4F6F8", type: ShadingType.CLEAR },
            children: [
              new TextRun({ text: raw.length ? raw : " ", font: "Consolas", size: 16 }),
            ],
          }),
        );
      });
      children.push(new Paragraph({ text: "" }));
      continue;
    }

    // Tabelle
    if (line.trim().startsWith("|")) {
      const block = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        block.push(lines[i]);
        i += 1;
      }
      children.push(buildTable(block));
      children.push(new Paragraph({ text: "" }));
      continue;
    }

    // Überschriften
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const map = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
      };
      children.push(new Paragraph({ heading: map[level], children: runs(heading[2]) }));
      i += 1;
      continue;
    }

    // Aufzählung / nummerierte Liste (inkl. Folgezeilen)
    const bullet = /^\s*-\s+(.*)$/.exec(line);
    const numbered = /^\s*(\d+)\.\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      let text = bullet ? bullet[1] : numbered[2];
      i += 1;
      while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*[-\d]/.test(lines[i].trim())) {
        text += " " + lines[i].trim();
        i += 1;
      }
      children.push(
        new Paragraph({
          numbering: { reference: bullet ? "sysing-bullets" : "sysing-numbers", level: 0 },
          children: runs(text),
        }),
      );
      continue;
    }

    // Fließtext (weiche Zeilenumbrüche der Quelle zusammenführen)
    let text = line.trim();
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*[-|#>]/.test(lines[i]) &&
      !/^\s*\d+\.\s/.test(lines[i]) &&
      !lines[i].trim().startsWith("```")
    ) {
      text += " " + lines[i].trim();
      i += 1;
    }
    children.push(new Paragraph({ spacing: { after: 120 }, children: runs(text) }));
  }

  return children;
}

function meta(markdown, key) {
  const m = new RegExp(`^- \\*\\*${key}:\\*\\* (.*)$`, "m").exec(markdown);
  return m ? m[1].trim() : "";
}

async function main() {
  const outIndex = process.argv.indexOf("--out");
  const outDir = outIndex > -1 ? process.argv[outIndex + 1] : "/mnt/documents";
  mkdirSync(outDir, { recursive: true });

  const src = sourceFile();
  const markdown = readFileSync(src, "utf8");
  const version = meta(markdown, "version");
  const documentId = meta(markdown, "document_id");
  const classification = meta(markdown, "classification");

  const doc = new Document({
    creator: "Sysing Dashboard",
    title: `${documentId} — Sysing Dashboard Produktübersicht`,
    description: `Erzeugt aus ${src}`,
    numbering: {
      config: [
        {
          reference: "sysing-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 500, hanging: 260 } } },
            },
          ],
        },
        {
          reference: "sysing-numbers",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 500, hanging: 260 } } },
            },
          ],
        },
      ],
    },
    styles: {
      default: { document: { run: { font: "Arial", size: 20 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 34, bold: true, font: "Arial", color: PRIMARY },
          paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, font: "Arial", color: PRIMARY },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 22, bold: true, font: "Arial", color: "333333" },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 },
        },
        {
          id: "Heading4",
          name: "Heading 4",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 20, bold: true, font: "Arial", color: "333333" },
          paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 3 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
            margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Sysing Dashboard", bold: true, color: PRIMARY, size: 18 }),
                  new TextRun({
                    text: `   ${documentId} · V${version} · ${classification}`,
                    color: "808080",
                    size: 18,
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
                  new TextRun({
                    text: "Erzeugt aus der Markdown-Quelle · Seite ",
                    color: "808080",
                    size: 16,
                  }),
                  new TextRun({ children: [PageNumber.CURRENT], color: "808080", size: 16 }),
                ],
              }),
            ],
          }),
        },
        children: markdownToChildren(markdown),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const name = `SYSING-001_Produktuebersicht_V${version}.docx`;
  const target = join(outDir, name);
  writeFileSync(target, buffer);
  process.stdout.write(`Quelle: ${src}\nWord:   ${target}\n`);
}

await main();
