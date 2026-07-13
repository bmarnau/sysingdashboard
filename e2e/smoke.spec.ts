import { test, expect } from "./fixtures";

test("Dashboard-Startseite lädt und zeigt den Titel", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/.+/);
  // Rauchtest: erste sichtbare Überschrift oder Landmark
  const main = page.locator("main").first();
  await expect(main).toBeVisible();
});
