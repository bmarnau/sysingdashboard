import { describe, expect, it } from "vitest";
import { renderPdf } from "@/lib/report/renderers/pdf";
import { DEFAULT_TEMPLATE } from "@/lib/report/templates/default-provider";
import type { ReportDocument, ReportRunMetadata } from "@/lib/report/types";

const metadata: ReportRunMetadata = {
  reportId: "test-report",
  reportVersion: "1.0.0",
  title: "Testbericht",
  createdAt: "2026-08-21T07:30:00.000Z",
  createdBy: "Test User",
  format: "pdf",
  templateId: DEFAULT_TEMPLATE.id,
  templateSource: DEFAULT_TEMPLATE.source,
  dashboardVersion: "1.59.5",
  documentId: "TEST-001",
  period: "aktueller Stand",
};

describe("renderPdf pagination", () => {
  it("legt kleine Folgeabschnitte nicht jeweils auf eine eigene Seite", () => {
    const document: ReportDocument = {
      reportId: "test-report",
      title: "Kompakter Testbericht",
      subtitle: "Regressionstest für kontinuierliche Abschnittspaginierung",
      meta: [
        { label: "Umfang", value: "Test" },
        { label: "Erstellt von", value: "Test User" },
      ],
      sections: [
        {
          kind: "kpi",
          id: "kpi-1",
          title: "Projektstand",
          items: [
            { label: "Aufgaben", value: 3 },
            { label: "Gefährdet", value: 2 },
          ],
        },
        {
          kind: "table",
          id: "table-1",
          title: "Arbeitspakete",
          columns: [
            { key: "title", label: "Arbeitspaket", weight: 3 },
            { key: "status", label: "Status" },
          ],
          rows: [
            ["Netzplanung und Segmentierung", "erledigt"],
            ["Switch-Rollout Gebäude B", "gefährdet"],
          ],
        },
        {
          kind: "kpi",
          id: "kpi-2",
          title: "Verantwortung",
          items: [
            { label: "Mit Verantwortung", value: 3 },
            { label: "Ohne Verantwortung", value: 0 },
          ],
        },
      ],
    };

    const result = renderPdf(document, metadata, DEFAULT_TEMPLATE);

    expect(result.pages).toBe(2);
    expect(result.blob.type).toBe("application/pdf");
  });

  it("dimensioniert breite AVKK-Tabellen mit langen Wörtern kompakt", () => {
    const document: ReportDocument = {
      reportId: "test-report",
      title: "Tabellentest",
      meta: [{ label: "Umfang", value: "Test" }],
      sections: [
        {
          kind: "table",
          id: "wide-table",
          title: "Vorgänge nach Priorität",
          columns: [
            { key: "typ", label: "Typ" },
            { key: "aufgabe", label: "Aufgabe", weight: 3 },
            { key: "kontext", label: "Kontext", weight: 2 },
            { key: "status", label: "Status" },
            { key: "termin", label: "Termin" },
            { key: "verantwortung", label: "Verantwortung", align: "right" },
            { key: "kompetenz", label: "Kompetenz (fehlt/teilweise)", align: "right" },
            { key: "konsequenz", label: "Höchste Konsequenz" },
          ],
          rows: [
            [
              "Arbeitspaket",
              "Switch-Rollout Gebäude B",
              "Netzwerkmodernisierung Verwaltungsstandort",
              "gefährdet",
              "2026-08-27 (bald fällig)",
              1,
              "1/1",
              "hoch",
            ],
            [
              "Arbeitspaket",
              "Netzplanung und Segmentierung",
              "Netzwerkmodernisierung Verwaltungsstandort",
              "unvollständig",
              "2026-08-08 (überfällig)",
              1,
              "0/0",
              "gering",
            ],
          ],
        },
      ],
    };

    const result = renderPdf(document, metadata, DEFAULT_TEMPLATE);

    expect(result.pages).toBe(2);
    expect(result.blob.type).toBe("application/pdf");
  });
});
