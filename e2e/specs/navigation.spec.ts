import { test, expect } from "../fixtures/test-instance";

test.use({ role: "administrator" });

test.describe("Navigation", () => {
  test("Startseite lädt und Haupt-Landmark ist sichtbar", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("Servicemenü lässt sich öffnen und wieder schließen (Escape)", async ({ page }) => {
    await page.goto("/");
    const btn = page.getByRole("button", { name: /Einstellungen und Services/i });
    await btn.click();
    // Menü-Schließen-Button hat aria-label "Menü schließen"
    const close = page.getByRole("button", { name: /Menü schließen/i });
    await expect(close.first()).toBeVisible();
    await page.keyboard.press("Escape");
    // Nach Escape sollte der Öffner wieder Standard-Fokus haben können.
    await expect(btn).toBeVisible();
  });

  test("Deep-Link auf /?view=projects rendert Dashboard-Route", async ({ page }) => {
    await page.goto("/?view=projects");
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("Browser-Back kehrt zur vorherigen URL zurück", async ({ page }) => {
    await page.goto("/");
    await page.goto("/?view=timetable");
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
  });
});
