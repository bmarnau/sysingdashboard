/**
 * Druck-Renderer: erzeugt eigenständiges HTML mit Corporate-Kopf-/Fußzeile,
 * Seitenumbruchregeln und Wiederholung der Tabellenköpfe.
 *
 * Bewusst ohne DOM-Zugriff — die Ausgabe ist ein String und damit testbar.
 */

import type { ReportDocument, ReportRunMetadata } from "../types";
import type { ReportTemplate } from "../templates/types";

function escapeHtml(value: string | number): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const rgb = (c: [number, number, number]) => `rgb(${c[0]},${c[1]},${c[2]})`;

export function buildPrintHtml(
  document: ReportDocument,
  metadata: ReportRunMetadata,
  template: ReportTemplate,
): string {
  const sections = document.sections
    .map((section) => {
      if (section.kind === "table") {
        const head = section.columns
          .map(
            (c) =>
              `<th style="text-align:${c.align === "right" ? "right" : "left"}">${escapeHtml(c.label)}</th>`,
          )
          .join("");
        const body = section.rows.length
          ? section.rows
              .map(
                (row) =>
                  `<tr>${row
                    .map((cell, i) => {
                      const align = section.columns[i]?.align === "right" ? "right" : "left";
                      return `<td style="text-align:${align}">${escapeHtml(cell)}</td>`;
                    })
                    .join("")}</tr>`,
              )
              .join("")
          : `<tr><td colspan="${section.columns.length}">${escapeHtml(section.emptyText ?? "Keine Daten")}</td></tr>`;
        return `<section class="block"><h2>${escapeHtml(section.title)}</h2>${
          section.description ? `<p class="desc">${escapeHtml(section.description)}</p>` : ""
        }<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></section>`;
      }
      if (section.kind === "kpi") {
        const items = section.items
          .map(
            (item) =>
              `<li><span class="kpi-value">${escapeHtml(item.value)}</span><span class="kpi-label">${escapeHtml(item.label)}</span></li>`,
          )
          .join("");
        return `<section class="block"><h2>${escapeHtml(section.title)}</h2><ul class="kpi">${items}</ul></section>`;
      }
      const paragraphs = section.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
      return `<section class="block">${
        section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ""
      }${paragraphs}</section>`;
    })
    .join("");

  const meta = document.meta
    .map(
      (entry) =>
        `<div class="meta-row"><span>${escapeHtml(entry.label)}</span><strong>${escapeHtml(entry.value)}</strong></div>`,
    )
    .join("");

  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8" />
<title>${escapeHtml(document.title)}</title>
<style>
  @page { size: A4; margin: ${template.page.marginMm}mm; }
  body { font-family: ${escapeHtml(template.brand.fontFamily)}, Arial, sans-serif; color:#111; font-size:11px; }
  header.doc { display:flex; align-items:center; gap:12px; border-bottom:2px solid ${rgb(template.brand.primary)}; padding-bottom:8px; }
  .logo { width:34px;height:34px;display:grid;place-items:center;background:${rgb(template.brand.primary)};color:#fff;font-weight:700;border-radius:4px; }
  h1 { font-size:20px; margin:16px 0 4px; }
  h2 { font-size:13px; color:${rgb(template.brand.primary)}; margin:0 0 6px; }
  .subtitle { color:${rgb(template.brand.muted)}; margin:0 0 12px; }
  .meta-row { display:flex; gap:8px; padding:2px 0; }
  .meta-row span { width:140px; color:${rgb(template.brand.muted)}; }
  .block { margin-top:16px; page-break-inside:avoid; }
  table { width:100%; border-collapse:collapse; }
  thead { display:table-header-group; }
  tr { page-break-inside:avoid; }
  th,td { border:1px solid #d4d4d8; padding:4px 6px; vertical-align:top; word-break:break-word; }
  th { background:${rgb(template.brand.primary)}; color:#fff; }
  ul.kpi { list-style:none; padding:0; display:flex; flex-wrap:wrap; gap:10px; }
  ul.kpi li { border:1px solid #d4d4d8; border-radius:6px; padding:6px 10px; min-width:110px; }
  .kpi-value { display:block; font-size:16px; font-weight:700; }
  .kpi-label { color:${rgb(template.brand.muted)}; }
  footer.doc { margin-top:20px; border-top:1px solid #d4d4d8; padding-top:6px; color:${rgb(template.brand.muted)}; display:flex; justify-content:space-between; }
</style></head>
<body>
<header class="doc">${template.header.showLogo ? `<div class="logo">${escapeHtml(template.logoText)}</div>` : ""}
<div><strong>${escapeHtml(template.organization)}</strong><div style="color:${rgb(template.brand.muted)}">${escapeHtml(
    template.header.showDocumentId ? metadata.documentId : "",
  )}</div></div></header>
<h1>${escapeHtml(document.title)}</h1>
${document.subtitle ? `<p class="subtitle">${escapeHtml(document.subtitle)}</p>` : ""}
${meta}
${sections}
<footer class="doc"><span>${escapeHtml(template.footer.note)}</span><span>${escapeHtml(
    `${metadata.documentId} · V${metadata.reportVersion} · ${metadata.createdBy}`,
  )}</span></footer>
</body></html>`;
}

export function renderPrint(
  document: ReportDocument,
  metadata: ReportRunMetadata,
  template: ReportTemplate,
): { html: string; blob: Blob } {
  const html = buildPrintHtml(document, metadata, template);
  return { html, blob: new Blob([html], { type: "text/html;charset=utf-8" }) };
}
