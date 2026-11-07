/**
 * QS6-5: Exporte ohne `billing.view` enthalten keine Stundensätze, Beträge
 * oder Summen. Je Exportweg ein Fall mit und ohne Recht.
 */
import "../env/test-instance";
import { describe, expect, it } from "vitest";
import {
  createExportDTO,
  toExportActivity,
  type ExportConfiguration,
  type ExportData,
} from "@/lib/export-data";
import { buildAzureTable, buildCsv, buildJson } from "@/lib/text-export";
import {
  BILLING_REQUIRED_MESSAGE,
  BILLING_SCOPES,
  JsonExportService,
} from "@/lib/json-export-service";
import { PdfExportService } from "@/lib/pdf-export";
import { ROLE_PERMISSIONS, permissionsOf } from "@/lib/rbac/permissions";
import type { UserRole } from "@/lib/user-management";
import { makeActivity, makeEngineer, makeProject, makeWorkPackage } from "../fixtures/activities";

const cfg: ExportConfiguration = {
  format: "csv",
  month: "2026-01",
  fileName: "export",
  grouping: "customer-project-workpackage-task",
  sorting: ["date"],
  filter: { clientId: null, clientName: null, projectId: null, projectName: null },
};

const RATE = 137.5;

function context(includeBilling: boolean) {
  const project = makeProject({ id: "p-1", client: "Kunde Q" });
  const wp = makeWorkPackage({ id: "wp-1", projectId: "p-1" });
  const activities = [
    makeActivity({ id: "a-1", workPackageId: "wp-1", date: "2026-01-05", duration: 2 }),
    makeActivity({ id: "a-2", workPackageId: "wp-1", date: "2026-01-06", duration: 3 }),
  ].map((a) => ({ ...a, hourlyRate: RATE }));
  const engineer = makeEngineer();
  const exportData = createExportDTO(
    { projects: [project], workPackages: [wp], activities, engineer },
    cfg,
    { includeBilling },
  );
  return { engineer, projects: [project], workPackages: [wp], activities, exportData };
}

/** Sucht Satz (137.5) und Betrag (275, 412.5, 687.5) in jeder Schreibweise. */
const MONEY = /137[.,]5|275[.,]?0?0?\b|412[.,]5|687[.,]5/;

function amountsIn(data: ExportData): unknown[] {
  const found: unknown[] = [];
  const walk = (nodes: ExportData["groups"]) => {
    for (const n of nodes) {
      if ("amount" in n) found.push(n.amount);
      walk(n.children);
    }
  };
  walk(data.groups);
  if ("totalAmount" in data.summary) found.push(data.summary.totalAmount);
  return found;
}

describe("QS6-5 Datenaufbau (createExportDTO)", () => {
  it("ohne billing.view: keine Beträge in Gruppen und Summe, Stunden bleiben", () => {
    const { exportData } = context(false);
    expect(exportData.includeBilling).toBe(false);
    expect(amountsIn(exportData)).toEqual([]);
    expect(exportData.summary.totalHours).toBe(5);
    expect(exportData.groups[0].hours).toBe(5);
  });

  it("mit billing.view: Beträge unverändert", () => {
    const { exportData } = context(true);
    expect(exportData.summary.totalAmount).toBe(687.5);
    expect(exportData.groups[0].amount).toBe(687.5);
  });

  it("toExportActivity entfernt den Stundensatz nur ohne Recht", () => {
    const a = makeActivity({ hourlyRate: RATE });
    expect("hourlyRate" in toExportActivity(a, { includeBilling: false })).toBe(false);
    expect(toExportActivity(a, { includeBilling: true }).hourlyRate).toBe(RATE);
  });
});

describe("QS6-5 CSV", () => {
  it("ohne billing.view: keine Spalten hourlyRate und amountEur, keine Werte", () => {
    const res = buildCsv(context(false));
    const [header] = res.text.split("\r\n");
    expect(header).not.toMatch(/hourlyRate|amountEur/);
    expect(res.text).not.toMatch(MONEY);
    expect(header).toContain("durationHours");
  });

  it("mit billing.view: Spalten und Werte vorhanden", () => {
    const res = buildCsv(context(true));
    expect(res.text.split("\r\n")[0]).toContain("hourlyRate;amountEur");
    expect(res.text).toContain("275.00");
  });
});

describe("QS6-5 JSON (Export-Dialog)", () => {
  it("ohne billing.view: kein hourlyRate, amount oder totalAmount", () => {
    const res = buildJson(context(false));
    expect(res.text).not.toMatch(/hourlyRate|"amount"|totalAmount/);
    expect(res.text).not.toMatch(MONEY);
  });

  it("mit billing.view: Satz und Summe vorhanden", () => {
    const res = buildJson(context(true));
    expect(res.text).toContain('"hourlyRate": 137.5');
    expect(res.text).toContain('"totalAmount": 687.5');
  });
});

describe("QS6-5 Azure-Table (NDJSON)", () => {
  it("ohne billing.view: keine Felder HourlyRate und AmountEur", () => {
    const res = buildAzureTable(context(false));
    expect(res.text).not.toMatch(/HourlyRate|AmountEur/);
    expect(res.text).not.toMatch(MONEY);
  });

  it("mit billing.view: Felder vorhanden", () => {
    const res = buildAzureTable(context(true));
    expect(res.text).toContain('"HourlyRate":137.5');
    expect(res.text).toContain('"AmountEur":275');
  });
});

describe("QS6-5 PDF", () => {
  async function pdfText(includeBilling: boolean): Promise<string> {
    const { blob } = await PdfExportService.generatePdf(context(includeBilling));
    return new TextDecoder("latin1").decode(await blob.arrayBuffer());
  }

  it("ohne billing.view: keine Spalte Betrag, kein Gesamtbetrag", async () => {
    const text = await pdfText(false);
    expect(text).toContain("Gesamtstunden");
    expect(text).not.toContain("Betrag");
    expect(text).not.toMatch(/687,50|275,00|412,50/);
  });

  it("mit billing.view: Gesamtbetrag vorhanden", async () => {
    const text = await pdfText(true);
    expect(text).toContain("Gesamtbetrag");
  });
});

describe("QS6-5 Import / Export (JsonExportService)", () => {
  it("ohne billing.view: Gesamtexport wird verweigert", () => {
    expect(() =>
      JsonExportService.exportFullJson({ includeBilling: false, exportedBy: "t" }),
    ).toThrow(BILLING_REQUIRED_MESSAGE);
  });

  it.each(BILLING_SCOPES)("ohne billing.view: Teil-Export %s wird verweigert", (scope) => {
    expect(() =>
      JsonExportService.exportPartialJson(scope, { includeBilling: false, exportedBy: "t" }),
    ).toThrow(BILLING_REQUIRED_MESSAGE);
  });

  it("ohne billing.view: Teil-Export ohne Beträge (Projekte) bleibt möglich", () => {
    const res = JsonExportService.exportPartialJson("projects", {
      includeBilling: false,
      exportedBy: "t",
    });
    expect(JSON.stringify(res.document)).not.toContain("hourlyRate");
  });

  it("mit billing.view: Gesamtexport unverändert", () => {
    const res = JsonExportService.exportFullJson({ includeBilling: true, exportedBy: "t" });
    expect(res.document.exportType).toBe("full");
  });
});

describe("QS6-5 Invarianten der Rollenmatrix", () => {
  const roles = Object.keys(ROLE_PERMISSIONS) as UserRole[];

  it.each(["azure.export", "backup.restore"] as const)(
    "jede Rolle mit %s hat billing.view (Menü-Einstieg und Sicherung)",
    (perm) => {
      for (const role of roles) {
        if (permissionsOf(role).includes(perm)) {
          expect(permissionsOf(role)).toContain("billing.view");
        }
      }
    },
  );
});
