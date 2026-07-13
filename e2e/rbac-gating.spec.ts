import { test, expect } from "./fixtures";

test("Servicemenü ist im Standardzustand erreichbar", async ({ page }) => {
  await page.goto("/");
  const serviceButton = page.getByRole("button", { name: /Einstellungen|Service/i });
  await expect(serviceButton.first()).toBeVisible();
});
