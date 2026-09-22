import type { PerformanceStatementSnapshot } from "@/lib/performance-statement/performance-statement-contract";
import { DEFAULT_TEMPLATE_ID } from "../templates/default-provider";
import type { ReportContext, ReportDefinition, ReportDocument } from "../types";

function hours(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function dateTime(value: string): string {
  return new Date(value).toLocaleString("de-DE");
}

export const performanceStatementReport: ReportDefinition<PerformanceStatementSnapshot> = {
  reportId: "performance-statement",
  title: "Leistungsnachweis",
  description:
    "Kundenbezogener Leistungsnachweis aus einem finalisierten, unveränderbaren Snapshot.",
  version: "1.0.0",
  dataSource: "customer_performance_statement.snapshot",
  permission: "performance.statement.manage",
  templateId: DEFAULT_TEMPLATE_ID,
  formats: ["pdf", "csv", "json"],
  fileNamePattern: "{docId}_{slug}_{period}_{version}_{timestamp}",
  documentId: "SYSING-104",
  metadata: {
    scope: "customer",
    billing: "performance-statement-not-invoice",
    provenance: "redacted",
  },
  build(input, ctx): ReportDocument {
    const billableItems = input.items
      .filter((item) => item.effectiveBillable)
      .sort((left, right) => left.position - right.position);

    return {
      reportId: this.reportId,
      title: this.title,
      subtitle: `${input.customerName} · ${input.periodStart} bis ${input.periodEnd}`,
      meta: [
        { label: "Kunde", value: input.customerName },
        { label: "Zeitraum", value: `${input.periodStart} bis ${input.periodEnd}` },
        { label: "Version", value: String(input.version) },
        { label: "Finalisiert am", value: dateTime(input.finalizedAt) },
        {
          label: "Datenstand",
          value: input.freshness.latestPublishedAt
            ? dateTime(input.freshness.latestPublishedAt)
            : "—",
        },
        { label: "Erstellt am", value: ctx.generatedAt.toLocaleString("de-DE") },
        { label: "Dokumenttyp", value: "Leistungsnachweis, keine Rechnung" },
      ],
      sections: [
        {
          kind: "text",
          id: "hinweis",
          paragraphs: [
            "Leistungsnachweis, keine Rechnung. Dieses Dokument enthält keine Preise, Steuern oder Zahlungsangaben.",
          ],
        },
        {
          kind: "kpi",
          id: "summen",
          title: "Leistungsumfang",
          items: [
            { label: "Abrechenbare Positionen", value: billableItems.length },
            { label: "Abrechenbare Stunden", value: hours(input.billableHours) },
          ],
        },
        {
          kind: "table",
          id: "leistungen",
          title: "Abrechenbare Leistungen",
          columns: [
            { key: "datum", label: "Datum" },
            { key: "leistung", label: "Leistung", weight: 3 },
            { key: "projekt", label: "Projekt", weight: 2 },
            { key: "arbeitspaket", label: "Arbeitspaket", weight: 2 },
            { key: "kategorie", label: "Kategorie", weight: 1.5 },
            { key: "stunden", label: "Stunden", align: "right" },
          ],
          rows: billableItems.map((item) => [
            item.date,
            item.title,
            item.project.name || "—",
            item.workPackage.title || "—",
            item.category.label || "—",
            hours(item.durationHours),
          ]),
          emptyText: "Keine abrechenbaren Leistungen im finalisierten Snapshot.",
        },
      ],
    };
  },
};
