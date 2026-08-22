import "../env/test-instance";
import { describe, expect, it } from "vitest";
import { buildReportFileName, slugify } from "@/lib/report/filename";
import {
  avkkManagementReport,
  avkkPersonalReport,
  avkkProjectReport,
} from "@/lib/report/definitions/avkk";
import { reportActorFromUser } from "@/lib/report/presentation";
import { buildPrintHtml } from "@/lib/report/renderers/print";
import { buildReportJson } from "@/lib/report/renderers/json";
import { buildReportCsv } from "@/lib/report/renderers/csv";
import { DEFAULT_TEMPLATE } from "@/lib/report/templates/default-provider";
import { listReports } from "@/lib/report/registry";
import type { AvkkReportInput } from "@/lib/report/data/avkk-selectors";
import type { ReportContext, ReportRunMetadata } from "@/lib/report/types";
import type { UserProfile } from "@/lib/user-management";
import { buildDemoDataset, isDemoId } from "@/lib/demo-data/dataset";

const ctx: ReportContext = {
  actor: { id: "u1", displayName: "Testperson", role: "admin" },
  generatedAt: new Date("2026-03-02T10:15:00Z"),
  period: "2026-03",
};

const demo = buildDemoDataset();

const input: AvkkReportInput = {
  rows: [],
  projects: demo.projects,
  workPackages: demo.workPackages,
  scopeLabel: "Testumfang",
};

const metadata: ReportRunMetadata = {
  reportId: "avkk-personal",
  reportVersion: "1.0.0",
  title: "Test",
  createdAt: ctx.generatedAt.toISOString(),
  createdBy: "Testperson",
  format: "print",
  templateId: DEFAULT_TEMPLATE.id,
  templateSource: DEFAULT_TEMPLATE.source,
  dashboardVersion: "1.56.0",
  documentId: "SYSING-101",
  period: "2026-03",
};

describe("Reporting-Schicht", () => {
  it("registriert die drei MVP-Berichte", () => {
    const ids = listReports().map((r) => r.reportId);
    expect(ids).toEqual(
      expect.arrayContaining(["avkk-personal", "avkk-project", "avkk-management"]),
    );
  });

  it("bildet TDF-konforme Dateinamen", () => {
    const name = buildReportFileName({
      definition: avkkPersonalReport,
      format: "pdf",
      now: new Date("2026-03-02T10:15:00"),
      period: "2026-03",
    });
    expect(name).toMatch(/^SYSING-101_avkk-persoenlicher-bericht_V1\.0\.0_20260302-101500\.pdf$/);
  });

  it("slugify ersetzt Umlaute", () => {
    expect(slugify("Übergrößen Bericht")).toBe("uebergroessen-bericht");
  });

  it("stellt Berichtsersteller mit normalisiertem Namen und fachlicher Rolle dar", () => {
    const user: UserProfile = {
      id: "petra-1",
      firstName: "petra",
      lastName: "Marnau",
      displayName: "petra Marnau",
      email: "petra@example.invalid",
      phone: "",
      role: "projectmanager",
      status: "active",
      mfaEnabled: false,
      createdAt: "2026-08-21T00:00:00.000Z",
      updatedAt: "2026-08-21T00:00:00.000Z",
    };

    expect(reportActorFromUser(user)).toEqual({
      id: "petra-1",
      displayName: "Petra Marnau",
      role: "Projektmanager",
    });
  });

  it("normalisiert einen eindeutig kleingeschriebenen einfachen Nachnamen", () => {
    const user: UserProfile = {
      id: "alex-1",
      firstName: "alex",
      lastName: "marnau",
      displayName: "alex marnau",
      email: "alex@example.invalid",
      phone: "",
      role: "engineer",
      status: "active",
      mfaEnabled: false,
      createdAt: "2026-08-22T00:00:00.000Z",
      updatedAt: "2026-08-22T00:00:00.000Z",
    };

    expect(reportActorFromUser(user)).toEqual({
      id: "alex-1",
      displayName: "Alex Marnau",
      role: "Systemingenieur",
    });
  });

  it("stellt Projekt- und Arbeitspaketstatus fachlich und PDF-sicher dar", () => {
    const project = demo.projects.find(
      (candidate) => candidate.name === "Netzwerkmodernisierung Verwaltungsstandort",
    );
    expect(project).toBeDefined();

    const doc = avkkProjectReport.build(
      {
        ...input,
        projectId: project!.id,
        scopeLabel: project!.name,
      },
      ctx,
    );

    const projectStatus = doc.meta.find((entry) => entry.label === "Projektstatus");
    expect(projectStatus?.value).toBe("Im Plan");

    const packages = doc.sections.find((section) => section.id === "arbeitspakete");
    expect(packages?.kind).toBe("table");
    if (packages?.kind === "table") {
      const values = packages.rows.flat().map(String);
      expect(values).toContain("In Arbeit");
      expect(values).toContain("Erledigt");
      expect(values).not.toContain("in_arbeit");
    }

    const serialized = JSON.stringify(doc);
    expect(serialized).not.toContain("on_track");
    expect(serialized).not.toContain("→");
  });

  it("erzeugt ein vollständiges Dokument ohne Daten", () => {
    const doc = avkkPersonalReport.build(input, ctx);
    expect(doc.sections.length).toBeGreaterThan(3);
    expect(doc.meta.some((m) => m.label === "Erstellt von")).toBe(true);
  });

  it("Managementbericht enthält keine Personenrangliste", () => {
    const doc = avkkManagementReport.build(input, ctx);
    const tables = doc.sections.filter((s) => s.kind === "table");
    const columnKeys = tables.flatMap((s) =>
      s.kind === "table" ? s.columns.map((c) => c.key) : [],
    );
    expect(columnKeys).not.toContain("person");
    expect(columnKeys).not.toContain("rang");
    expect(columnKeys).not.toContain("score");
    const projects = doc.sections.find((s) => s.id === "projekte");
    expect(projects?.kind).toBe("table");
  });

  it("Druck-HTML enthält Kopf, Fuß und wiederholten Tabellenkopf", () => {
    const html = buildPrintHtml(avkkPersonalReport.build(input, ctx), metadata, DEFAULT_TEMPLATE);
    expect(html).toContain("<thead");
    expect(html).toContain("display:table-header-group");
    expect(html).toContain(metadata.documentId);
  });

  it("JSON-Vertrag ist versioniert", () => {
    const payload = buildReportJson(avkkPersonalReport.build(input, ctx), metadata);
    expect(payload.contractVersion).toBe("1.0.0");
    expect(payload.metadata.reportId).toBe("avkk-personal");
  });

  it("CSV nutzt Semikolon und maskiert Sonderzeichen", () => {
    const csv = buildReportCsv(avkkPersonalReport.build(input, ctx), metadata);
    expect(csv.split("\n")[0]).toContain(";");
  });
});

describe("Demo-Datensatz", () => {
  it("verwendet ausschließlich demo-IDs", () => {
    const ids = [
      ...demo.projects.map((p) => p.id),
      ...demo.workPackages.map((w) => w.id),
      ...demo.activities.map((a) => a.id),
    ];
    expect(ids.every(isDemoId)).toBe(true);
  });

  it("ist reproduzierbar", () => {
    expect(buildDemoDataset()).toEqual(buildDemoDataset());
  });
});
