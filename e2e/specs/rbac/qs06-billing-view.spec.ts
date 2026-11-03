import { test, expect } from "../../fixtures/test-instance";

/**
 * QS-06 (U7): Umsatz-Kachel und Reiter „Abrechnung“ im Dashboard nur mit `billing.view`.
 * Sichtbarkeitsebene; Beträge liefert der Server weiter aus (QS6-4, offen).
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
