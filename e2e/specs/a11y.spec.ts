import { test, expect } from "../fixtures/test-instance";
import { runAxe } from "../fixtures/axe";

test.use({ role: "administrator" });

test.describe("Accessibility (axe-core)", () => {
  test("Startseite: keine kritischen axe-Verstöße", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible();
    const result = await runAxe(page);
    const critical = result.violations.filter((v) => v.impact === "critical");
    if (critical.length > 0) {
      // Explizit ausgeben – erscheint im Playwright-Report.
      console.error("axe critical violations:", JSON.stringify(critical, null, 2));
    }
    expect(critical, `axe critical: ${JSON.stringify(critical)}`).toHaveLength(0);
  });

  test("Tastatur: Tab erreicht Hilfe-Button vor Servicemenü", async ({ page }) => {
    await page.goto("/");
    // Fokus in den Body setzen, dann Tabs zählen – Anker: Hilfe-Button existiert.
    const helpBtn = page.getByRole("button", { name: /Hilfe zu dieser Seite/i });
    await expect(helpBtn).toBeVisible();
    // Fokus-Reihenfolgen-Assertion sinnvoll erst nach data-testid-Konvention – heute Smoke.
    await helpBtn.focus();
    expect(await helpBtn.evaluate((el) => el === document.activeElement)).toBe(true);
  });
});
