import { describe, expect, it } from "vitest";
import type { PerformanceStatementSnapshot } from "@/lib/performance-statement/performance-statement-contract";
import { performanceStatementReport } from "@/lib/report/definitions/performance-statement";
import { renderReport } from "@/lib/report/facade";
import type { ReportContext } from "@/lib/report/types";

const SNAPSHOT: PerformanceStatementSnapshot = {
  id: "11111111-1111-4111-8111-111111111111",
  seriesId: "22222222-2222-4222-8222-222222222222",
  version: 2,
  systemhouseId: "33333333-3333-4333-8333-333333333333",
  customerId: "44444444-4444-4444-8444-444444444444",
  customerName: "Kunde Eins",
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
  status: "finalized",
  finalizedBy: "55555555-5555-4555-8555-555555555555",
  finalizedAt: "2026-09-30T12:00:00.000Z",
  freshness: {
    oldestPublishedAt: "2026-09-02T08:00:00.000Z",
    latestPublishedAt: "2026-09-29T09:00:00.000Z",
  },
  reviewFingerprint: "a".repeat(64),
  snapshotHash: "b".repeat(64),
  itemCount: 2,
  billableItemCount: 1,
  billableHours: 2.5,
  nonBillableHours: 1,
  replacesStatementId: null,
  supersededByStatementId: null,
  items: [
    {
      position: 1,
      activitySourceId: "ACT-1",
      sourceRevision: 3,
      sourceHash: "secret-source-hash-billable",
      sourcePublishedAt: "2026-09-02T08:00:00.000Z",
      sourceEngineerId: "secret-engineer-id",
      date: "2026-09-02",
      title: "Kundenanalyse",
      durationHours: 2.5,
      sourceBillable: true,
      effectiveBillable: true,
      billingStatus: "offen",
      project: { sourceId: "P-1", name: "Projekt Alpha" },
      workPackage: { sourceId: "WP-1", title: "Analyse" },
      category: { key: "regelbetrieb", label: "Regelbetrieb" },
    },
    {
      position: 2,
      activitySourceId: "ACT-2",
      sourceRevision: 1,
      sourceHash: "secret-source-hash-nonbillable",
      sourcePublishedAt: "2026-09-03T08:00:00.000Z",
      sourceEngineerId: "secret-engineer-id-2",
      date: "2026-09-03",
      title: "Interne Nacharbeit",
      durationHours: 1,
      sourceBillable: false,
      effectiveBillable: false,
      billingStatus: "offen",
      project: { sourceId: "P-1", name: "Projekt Alpha" },
      workPackage: { sourceId: "WP-1", title: "Analyse" },
      category: { key: "regelbetrieb", label: "Regelbetrieb" },
    },
  ],
};

const CONTEXT: ReportContext = {
  actor: {
    id: "66666666-6666-4666-8666-666666666666",
    displayName: "Teamlead",
    role: "teamlead",
  },
  generatedAt: new Date("2026-09-30T13:00:00.000Z"),
  period: "2026-09-01_2026-09-30",
};

describe("BSF-03B SYSING-104 Leistungsnachweis", () => {
  it("builds a customer document from the immutable snapshot and redacts internal provenance", () => {
    const document = performanceStatementReport.build(SNAPSHOT, CONTEXT);
    const serialized = JSON.stringify(document);

    expect(document.reportId).toBe("performance-statement");
    expect(serialized).toContain("Kundenanalyse");
    expect(serialized).not.toContain("Interne Nacharbeit");
    expect(serialized).not.toContain("secret-engineer-id");
    expect(serialized).not.toContain("secret-source-hash");
    expect(serialized).not.toContain("ACT-1");
    expect(serialized).not.toMatch(/€|Stundensatz|Umsatzsteuer|Netto|Brutto/);
    expect(serialized).toContain("Leistungsnachweis, keine Rechnung");
  });

  it("uses the same redacted document contract for PDF, CSV and JSON", async () => {
    const rendered = await Promise.all(
      (["pdf", "csv", "json"] as const).map((format) =>
        renderReport({
          reportId: "performance-statement",
          format,
          input: SNAPSHOT,
          context: CONTEXT,
        }),
      ),
    );

    expect(rendered.every((result) => result.blob.size > 0)).toBe(true);
    expect(rendered[0].document).toEqual(rendered[1].document);
    expect(rendered[1].document).toEqual(rendered[2].document);

    const serialized = JSON.stringify(rendered[0].document);
    expect(serialized).toContain("2,50");
    expect(serialized).not.toContain("Interne Nacharbeit");
  });
});
