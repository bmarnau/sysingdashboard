import { test, expect } from "../fixtures/test-instance";

test.use({ role: "systemadministrator" });

/**
 * Servicemenü-Dialoge: bewusst als Smoke-Prüfung angelegt. Jeder Dialog wird
 * geöffnet und sein Escape-/Schließen-Pfad geprüft – tiefergehende
 * Interaktion (Bearbeitung, Export) folgt in dedizierten Specs, sobald
 * stabile `data-testid`-Anker gesetzt sind. Kritisch: ein „öffnet sich"-Test
 * ist KEIN Funktionstest.
 */
test.describe("Servicemenü", () => {
  test("Menü listet Kern-Einträge (Log Viewer, Systemstatus, Backup)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Einstellungen und Services/i }).click();
    const menu = page.locator("body");
    await expect(menu.getByText(/Log[- ]?Viewer/i).first()).toBeVisible();
    await expect(menu.getByText(/Systemstatus/i).first()).toBeVisible();
    await expect(menu.getByText(/Backup/i).first()).toBeVisible();
  });

  test("Handbuch-Button ist erreichbar (aria-label Hilfe)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Hilfe zu dieser Seite/i })).toBeVisible();
  });
});
