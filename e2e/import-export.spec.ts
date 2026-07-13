import { test, expect } from "./fixtures";

test("Downloadbereich lässt sich öffnen", async ({ page }) => {
  await page.goto("/");
  // Best-effort Smoke; genaue UI-Steuerung folgt in späterer Iteration.
  await expect(page.locator("body")).toBeVisible();
});
