/**
 * Export-Test-Suite: JSON / CSV / (PDF minimal), Schema, Dateiname,
 * Sonderzeichen, leere Daten, große Datenmenge, Scope-Begrenzung.
 * Prompt 2A.6.
 */
import "../env/test-instance";
import { describe, expect, it } from "vitest";
import { JsonExportService, buildJsonFileName } from "@/lib/json-export-service";
import { JsonSchemaValidationService } from "@/lib/json-schema-validation-service";
import { buildCsv, buildJson, generateReportId, withReportIdInFileName } from "@/lib/text-export";
import { createExportDTO, type ExportConfiguration } from "@/lib/export-data";
import { makeActivity, makeEngineer, makeProject, makeWorkPackage } from "../fixtures/activities";

const cfg: ExportConfiguration = {
  format: "json",
  month: "2026-01",
  fileName: "export",
  grouping: "customer-project-workpackage-task",
  sorting: ["date"],
  filter: { clientId: null, clientName: null, projectId: null, projectName: null },
};

function bigContext(count: number) {
  const project = makeProject({ id: "p-big", client: "Kunde X" });
  const wp = makeWorkPackage({ id: "wp-big", projectId: "p-big" });
  const activities = Array.from({ length: count }, (_, i) =>
    makeActivity({
      id: `a-${i}`,
      workPackageId: "wp-big",
      date: `2026-01-${String((i % 27) + 1).padStart(2, "0")}`,
      duration: (i % 8) + 1,
      hourlyRate: 100,
    }),
  );
  const engineer = makeEngineer();
  const dto = createExportDTO(
    { projects: [project], workPackages: [wp], activities, engineer },
    cfg,
  );
  return { engineer, projects: [project], workPackages: [wp], activities, exportData: dto };
}

describe("JSON-Export (Schema & Struktur)", () => {
  it("erzeugt Voll-Export, dessen Document gegen das Schema validiert", async () => {
    const res = JsonExportService.exportFullJson({ exportedBy: "tester" });
    expect(res.byteLength).toBeGreaterThan(0);
    const text = await res.blob.text();
    const parsed = JSON.parse(text);
    const val = JsonSchemaValidationService.validate(parsed);
    expect(val.schemaValid).toBe(true);
    expect(parsed.schemaVersion).toBe(res.document.schemaVersion);
  });

  it("Dateiname folgt dem definierten Muster", () => {
    const name = buildJsonFileName("full", undefined, new Date("2026-02-03T04:05:06Z"));
    expect(name).toMatch(/^dashboard-backup_2026-02-03_/);
    expect(name.endsWith(".json")).toBe(true);
  });

  it("Teil-Export ('projects') begrenzt Inhalte auf Scope", () => {
    const res = JsonExportService.exportPartialJson("projects", { exportedBy: "tester" });
    expect(res.document.scopes).toEqual(["projects"]);
    expect(res.document.activities).toBeUndefined();
    expect(res.document.timeEntries).toBeUndefined();
  });

  it("entfernt sensible Felder aus dem Voll-Export", () => {
    const res = JsonExportService.exportFullJson({ exportedBy: "tester" });
    const text = JSON.stringify(res.document);
    expect(text.toLowerCase()).not.toMatch(/passwordhash|mfasecret|access_token/);
  });
});

describe("CSV-Export", () => {
  it("beginnt mit Header und trennt mit ';' / CRLF", () => {
    const ctx = bigContext(3);
    const res = buildCsv(ctx);
    expect(res.text.startsWith("reportId;date;engineer")).toBe(true);
    expect(res.text.includes("\r\n")).toBe(true);
    expect(res.mimeType).toBe("text/csv");
  });

  it("escapt Sonderzeichen (Anführungszeichen, Semikolon, Umlaute, Emoji)", () => {
    const project = makeProject({ id: "p1", client: 'Kunde "A;B" ÄÖÜ 🚀' });
    const wp = makeWorkPackage({ id: "wp1", projectId: "p1" });
    const act = makeActivity({
      id: "a1",
      workPackageId: "wp1",
      title: 'Task mit "quote"; und ; Semi',
      description: "Mehr\nText",
      date: "2026-01-05",
      duration: 2,
      hourlyRate: 90,
    });
    const dto = createExportDTO(
      { projects: [project], workPackages: [wp], activities: [act], engineer: makeEngineer() },
      cfg,
    );
    const res = buildCsv({
      projects: [project],
      workPackages: [wp],
      activities: [act],
      engineer: makeEngineer(),
      exportData: dto,
    });
    expect(res.text).toContain('"Kunde ""A;B"" ÄÖÜ 🚀"');
    expect(res.text).toContain('"Task mit ""quote""; und ; Semi"');
    expect(res.text).toContain("🚀");
  });

  it("liefert nur Header, wenn keine Aktivitäten existieren", () => {
    const dto = createExportDTO(
      { projects: [], workPackages: [], activities: [], engineer: makeEngineer() },
      cfg,
    );
    const res = buildCsv({
      projects: [],
      workPackages: [],
      activities: [],
      engineer: makeEngineer(),
      exportData: dto,
    });
    const lines = res.text.trim().split("\r\n");
    expect(lines.length).toBe(1);
  });

  it("verarbeitet 5.000 Aktivitäten in vertretbarer Zeit", () => {
    const ctx = bigContext(5000);
    const t0 = performance.now();
    const res = buildCsv(ctx);
    const dt = performance.now() - t0;
    expect(res.bytes).toBeGreaterThan(1000);
    // Grenzwert weich, nur Regressions-Schutz
    expect(dt).toBeLessThan(5000);
  });
});

describe("Report-ID und Dateiname", () => {
  it("Report-ID folgt Muster REP-YYYYMMDD-HHMMSS", () => {
    const id = generateReportId(new Date("2026-03-04T05:06:07Z"));
    expect(id).toMatch(/^REP-\d{8}-\d{6}$/);
  });

  it("hängt Report-ID vor die Dateiendung", () => {
    const name = withReportIdInFileName("dashboard.csv", "REP-1");
    expect(name).toBe("dashboard_REP-1.csv");
  });
});

describe("JSON-Text-Export (Round-Trip)", () => {
  it("parsen liefert identische Zeilen", () => {
    const ctx = bigContext(2);
    const res = buildJson(ctx);
    const parsed = JSON.parse(res.text);
    expect(parsed.activities.length).toBe(2);
    expect(parsed.reportId).toBe(res.reportId);
  });
});
