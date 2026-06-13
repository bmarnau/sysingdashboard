import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  ExportConfiguration,
  ExportData,
  ExportGroupNode,
  GroupingId,
  SortKey,
} from "@/lib/export-data";
import type { Activity, Engineer, Project, WorkPackage } from "@/lib/dashboard-data";

/* ------------------------------- Typen --------------------------------- */

export interface ReportMetadata {
  reportId: string;
  createdAt: string; // ISO
  createdBy: string;
  exportFormat: string;
  dashboardVersion: string;
  grouping: string;
  sorting: string[];
}

export interface PdfPreview {
  blob: Blob;
  url: string; // object URL
  fileName: string;
  pages: number;
  sizeBytes: number;
  metadata: ReportMetadata;
}

export interface PdfExportContext {
  engineer: Engineer;
  projects: Project[];
  workPackages: WorkPackage[];
  activities: Activity[];
  exportData: ExportData;
}

/* ------------------------------ Konstanten ----------------------------- */

const DASHBOARD_VERSION = "1.0.0";

const MONTH_NAMES_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const GROUPING_LABEL: Record<GroupingId, string> = {
  "customer-project-workpackage-task": "Kunde > Projekt > Arbeitspaket > Tätigkeit",
  "project-workpackage-task": "Projekt > Arbeitspaket > Tätigkeit",
  "employee-project-task": "Mitarbeiter > Projekt > Tätigkeit",
  "customer-month-project": "Kunde > Monat > Projekt",
};

const SORT_LABEL: Record<SortKey, string> = {
  date: "Datum aufsteigend",
  "date-desc": "Datum absteigend",
  project: "Projektname",
  customer: "Kunde",
  employee: "Mitarbeiter",
  duration: "Dauer",
};

/* --------------------------- Formatter --------------------------------- */

const HOURS_FMT = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const CURRENCY_FMT = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});
const DATE_FMT = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const DATETIME_FMT = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const fmtHours = (n: number) => `${HOURS_FMT.format(n)} h`;
const fmtCurrency = (n: number) => CURRENCY_FMT.format(n);
const fmtDate = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : DATE_FMT.format(d);
};
const fmtMonth = (m: string) => {
  const [y, mm] = m.split("-").map(Number);
  if (!y || !mm) return m;
  return `${MONTH_NAMES_DE[mm - 1]} ${y}`;
};

function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ---------------------------- Service ---------------------------------- */

export const PdfExportService = {
  generateReportId(now: Date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `REP-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  },

  generateFileName(cfg: ExportConfiguration, now: Date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const client = slugify(cfg.filter.clientName ?? "");
    const project = slugify(cfg.filter.projectName ?? "");
    const base =
      client && project
        ? `${client}_${project}_${cfg.month}_leistungsnachweis_${ts}`
        : client
          ? `${client}_${cfg.month}_leistungsnachweis_${ts}`
          : project
            ? `${project}_${cfg.month}_leistungsnachweis_${ts}`
            : `leistungsnachweis_${cfg.month}_${ts}`;
    return `${base}.pdf`;
  },

  generateReportMetadata(cfg: ExportConfiguration, engineer: Engineer): ReportMetadata {
    const now = new Date();
    return {
      reportId: this.generateReportId(now),
      createdAt: now.toISOString(),
      createdBy: engineer.name,
      exportFormat: "pdf",
      dashboardVersion: DASHBOARD_VERSION,
      grouping: GROUPING_LABEL[cfg.grouping] ?? cfg.grouping,
      sorting: cfg.sorting.map((k) => SORT_LABEL[k] ?? k),
    };
  },

  async generatePdf(ctx: PdfExportContext): Promise<{ blob: Blob; pages: number; metadata: ReportMetadata }> {
    const { engineer, exportData } = ctx;
    const cfg = exportData.configuration;

    const metadata = this.generateReportMetadata(cfg, engineer);

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 18;

    /* ---------------------- Seite 1: Deckblatt ---------------------- */
    // "Logo" placeholder
    doc.setFillColor(30, 64, 175);
    doc.rect(margin, margin, 24, 24, "F");
    doc.setTextColor(255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(engineer.initials || "EC", margin + 12, margin + 15, { align: "center" });
    doc.setTextColor(0);

    // Firmenname
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(engineer.company || "", margin + 30, margin + 10);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`${engineer.name} · ${engineer.role}`, margin + 30, margin + 16);
    doc.setTextColor(0);

    // Titel
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("Leistungsnachweis", margin, margin + 55);

    // Trennlinie
    doc.setDrawColor(220);
    doc.line(margin, margin + 60, pageW - margin, margin + 60);

    // Deckblatt-Felder
    const coverFields: Array<[string, string]> = [
      ["Kunde", cfg.filter.clientName ?? "Alle Kunden"],
      ["Projekt", cfg.filter.projectName ?? "Alle Projekte"],
      ["Zeitraum", fmtMonth(cfg.month)],
      ["Erstellt von", metadata.createdBy],
      ["Erstellt am", DATETIME_FMT.format(new Date(metadata.createdAt))],
      ["Report-ID", metadata.reportId],
    ];

    doc.setFontSize(10);
    let y = margin + 72;
    for (const [label, value] of coverFields) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120);
      doc.text(label, margin, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text(value, margin + 45, y);
      y += 8;
    }

    // Stammdatenbereich
    y += 6;
    drawSectionTitle(doc, "Stammdaten", margin, y);
    y += 6;

    const projectOfFilter = cfg.filter.projectId
      ? ctx.projects.find((p) => p.id === cfg.filter.projectId)
      : undefined;

    const masterRows: Array<[string, string]> = [
      ["Kunde", cfg.filter.clientName ?? "—"],
      ["Projektname", projectOfFilter?.name ?? "—"],
      ["Projektleiter", projectOfFilter?.lead ?? "—"],
      ["Projekt-Status", projectOfFilter?.status ?? "—"],
      ["Exportformat", "PDF"],
      ["Monat", fmtMonth(cfg.month)],
      ["Gruppierung", metadata.grouping],
      ["Sortierung", metadata.sorting.join(" > ") || "keine"],
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [],
      body: masterRows,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 45, textColor: [110, 110, 110] },
        1: { fontStyle: "bold" },
      },
    });

    /* ----------------------- Seite 2+: Tätigkeitsreport ----------------------- */
    doc.addPage();
    drawPageHeader(doc, "Tätigkeitsreport", metadata.reportId, margin, pageW);

    const wpById = new Map(ctx.workPackages.map((w) => [w.id, w]));
    const projectById = new Map(ctx.projects.map((p) => [p.id, p]));

    // Activities sorted by date for the flat table
    const activityRows = [...ctx.exportData ? collectActivities(exportData.groups, ctx) : []]
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .map((a) => {
        const wp = a.workPackageId ? wpById.get(a.workPackageId) : undefined;
        const project = wp?.projectId ? projectById.get(wp.projectId) : undefined;
        return [
          fmtDate(a.date),
          engineer.name,
          project?.name ?? "—",
          wp?.title ?? "—",
          a.title || "—",
          fmtHours(a.duration),
          a.description ?? "",
        ];
      });

    autoTable(doc, {
      startY: margin + 14,
      margin: { left: margin, right: margin },
      head: [["Datum", "Mitarbeiter", "Projekt", "Arbeitspaket", "Tätigkeit", "Stunden", "Kommentar"]],
      body: activityRows.length
        ? activityRows
        : [["—", "—", "—", "—", "Keine Tätigkeiten im Zeitraum", "0 h", ""]],
      theme: "striped",
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 1.5, overflow: "linebreak" },
      columnStyles: {
        0: { cellWidth: 20 },
        5: { halign: "right", cellWidth: 18 },
      },
      didDrawPage: () => drawPageFooter(doc, metadata, margin, pageW, pageH),
    });

    /* ----------------------- Seite N: Gruppierungen ----------------------- */
    doc.addPage();
    drawPageHeader(doc, "Gruppierte Auswertung", metadata.reportId, margin, pageW);

    const groupRows: Array<{ depth: number; label: string; hours: number; amount: number; level: string }> = [];
    const walk = (nodes: ExportGroupNode[], depth: number) => {
      for (const n of nodes) {
        groupRows.push({
          depth,
          label: n.label,
          hours: n.hours,
          amount: n.amount,
          level: n.level,
        });
        if (n.children.length) walk(n.children, depth + 1);
      }
    };
    walk(exportData.groups, 0);

    autoTable(doc, {
      startY: margin + 14,
      margin: { left: margin, right: margin },
      head: [["Ebene", "Bezeichnung", "Stunden", "Betrag"]],
      body: groupRows.length
        ? groupRows.map((g) => [
            g.level,
            `${"   ".repeat(g.depth)}${g.label}`,
            fmtHours(g.hours),
            fmtCurrency(g.amount),
          ])
        : [["—", "Keine Daten", "0 h", fmtCurrency(0)]],
      theme: "grid",
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 26, textColor: [110, 110, 110] },
        2: { halign: "right", cellWidth: 22 },
        3: { halign: "right", cellWidth: 28 },
      },
      didParseCell: (data) => {
        const row = groupRows[data.row.index];
        if (!row) return;
        if (row.depth === 0) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [240, 244, 255];
        }
      },
      didDrawPage: () => drawPageFooter(doc, metadata, margin, pageW, pageH),
    });

    /* ------------------------ Zusammenfassung ----------------------- */
    const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? margin + 30;
    let sumY = lastY + 10;
    if (sumY > pageH - 70) {
      doc.addPage();
      drawPageHeader(doc, "Zusammenfassung", metadata.reportId, margin, pageW);
      sumY = margin + 18;
    } else {
      drawSectionTitle(doc, "Zusammenfassung", margin, sumY);
      sumY += 6;
    }

    const s = exportData.summary;
    autoTable(doc, {
      startY: sumY,
      margin: { left: margin, right: margin },
      head: [],
      body: [
        ["Gesamtstunden", fmtHours(s.totalHours)],
        ["Billable Stunden", fmtHours(s.billableHours)],
        ["Non-Billable Stunden", fmtHours(s.nonBillableHours)],
        ["Gesamtbetrag", fmtCurrency(s.totalAmount)],
        ["Anzahl Tätigkeiten", String(s.activities)],
        ["Anzahl Zeitbuchungen", String(s.timeEntries)],
      ],
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 60, textColor: [110, 110, 110] },
        1: { fontStyle: "bold", halign: "right", cellWidth: 50 },
      },
      didDrawPage: () => drawPageFooter(doc, metadata, margin, pageW, pageH),
    });

    // PDF-Metadaten ins Dokument schreiben
    doc.setProperties({
      title: `Leistungsnachweis ${fmtMonth(cfg.month)}`,
      author: engineer.name,
      subject: cfg.filter.projectName ?? cfg.filter.clientName ?? "Leistungsnachweis",
      keywords: ["Leistungsnachweis", "Report", metadata.reportId].join(", "),
      creator: `${engineer.company} Dashboard ${DASHBOARD_VERSION}`,
    });

    const blob = doc.output("blob");
    const pages = doc.getNumberOfPages();
    return { blob, pages, metadata };
  },

  async createPreview(ctx: PdfExportContext): Promise<PdfPreview> {
    const { blob, pages, metadata } = await this.generatePdf(ctx);
    // Erzwinge korrekten MIME-Type — sonst zeigt Chrome im iframe ggf. nichts an.
    const typedBlob = blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
    const url = URL.createObjectURL(typedBlob);
    const fileName = this.generateFileName(ctx.exportData.configuration, new Date(metadata.createdAt));
    return { blob: typedBlob, url, fileName, pages, sizeBytes: typedBlob.size, metadata };
  },
};

/* --------------------------- Helpers ----------------------------------- */

function drawSectionTitle(doc: jsPDF, title: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 64, 175);
  doc.text(title, x, y);
  doc.setTextColor(0);
}

function drawPageHeader(doc: jsPDF, title: string, reportId: string, margin: number, pageW: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 64, 175);
  doc.text(title, margin, margin);
  doc.setTextColor(150);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(reportId, pageW - margin, margin, { align: "right" });
  doc.setDrawColor(220);
  doc.line(margin, margin + 3, pageW - margin, margin + 3);
  doc.setTextColor(0);
}

function drawPageFooter(
  doc: jsPDF,
  metadata: ReportMetadata,
  margin: number,
  pageW: number,
  pageH: number,
) {
  const page = doc.getCurrentPageInfo().pageNumber;
  const total = doc.getNumberOfPages();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`${metadata.reportId} · ${metadata.createdBy}`, margin, pageH - 8);
  doc.text(`Seite ${page} / ${total}`, pageW - margin, pageH - 8, { align: "right" });
  doc.setTextColor(0);
}

/** Sammelt eindeutige Aktivitäten aus dem Gruppen-Baum. */
function collectActivities(
  groups: ExportGroupNode[],
  ctx: PdfExportContext,
): Activity[] {
  const ids = new Set<string>();
  const visit = (nodes: ExportGroupNode[]) => {
    for (const n of nodes) {
      if (n.activityIds) n.activityIds.forEach((id) => ids.add(id));
      if (n.children.length) visit(n.children);
    }
  };
  visit(groups);
  if (ids.size === 0) {
    // Falls Leaf-Ebene keine Aktivitäten-IDs hat (z.B. Gruppierung endet auf Projekt),
    // fallback auf die volle Activity-Liste, gefiltert über Monat/Filter aus dem DTO.
    return ctx.activities;
  }
  return ctx.activities.filter((a) => ids.has(a.id));
}
