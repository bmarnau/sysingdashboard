import { test, expect } from "../../fixtures/test-instance";

/**
 * QS-06 (U7): Umsatz-Kachel und Reiter „Abrechnung“ im Dashboard nur mit `billing.view`.
 * Sichtbarkeitsebene; der Server liefert keine Beträge (QS6-4). Exporte: QS6-5 unten.
 */
const ALLOWED = ["systemadministrator", "administrator", "teamlead", "projectmanager"] as const;
const DENIED = ["engineer", "viewer", "customer"] as const;

for (const role of ALLOWED) {
  test.describe(`QS-06 billing.view ${role}`, () => {
    test.use({ role });
    test("zeigt Umsatz-Kachel und Reiter Abrechnung", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page.getByText("Umsatz gesamt", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Abrechnung", exact: true })).toBeVisible();
    });
  });
}

for (const role of DENIED) {
  test.describe(`QS-06 billing.view negativ ${role}`, () => {
    test.use({ role });
    test("blendet Umsatz-Kachel und Reiter Abrechnung aus", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page.getByText("Offene Arbeitspakete", { exact: true })).toBeVisible();
      await expect(page.getByText("Umsatz gesamt", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Abrechnung", exact: true })).toHaveCount(0);
    });
  });
}

/**
 * QS6-5: Der CSV-Export enthält Stundensatz und Betrag nur mit `billing.view`.
 * Startdaten: Tätigkeiten im Mai 2026 mit Sätzen 135 bis 145 €/h.
 */
async function exportCsv(page: import("@playwright/test").Page): Promise<string> {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Einstellungen und Services" }).click();
  await page.getByRole("button", { name: "Export…", exact: true }).click();
  await page.locator("#export-format").selectOption("csv");
  await page.locator("#export-month").fill("2026-05");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export vorbereiten" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

for (const role of ["viewer", "engineer"] as const) {
  test.describe(`QS6-5 Export ohne billing.view ${role}`, () => {
    test.use({ role });
    test("CSV ohne Stundensatz und Betrag", async ({ page }) => {
      const csv = await exportCsv(page);
      const [header] = csv.replace(/^﻿/, "").split("\r\n");
      expect(header).toContain("durationHours");
      expect(header).not.toMatch(/hourlyRate|amountEur/);
      expect(csv).not.toMatch(/;14[05];|;135;/);
    });
  });
}

test.describe("QS6-5 Export mit billing.view teamlead", () => {
  test.use({ role: "teamlead" });
  test("CSV mit Stundensatz und Betrag", async ({ page }) => {
    const csv = await exportCsv(page);
    expect(csv).toContain("hourlyRate;amountEur");
  });
});
