import { test, expect } from "../fixtures/test-instance";
import { runAxe } from "../fixtures/axe";

test.use({ role: "kiosk" });

test.describe("Kiosk role", () => {
  test("restricts the account to /kiosk and keeps demo warning plus logout visible", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/kiosk(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Info-Kiosk" })).toBeVisible();
    await expect(page.getByText("DEMO-DATEN — KEINE LIVE-DATEN")).toBeVisible();
    await expect(page.getByRole("button", { name: "Abmelden" })).toBeVisible();
    await expect(page.getByText("Kiosk-Demodaten sind auf diesem Gerät nicht geladen.")).toBeVisible();
  });

  test("has no critical axe violations on the kiosk surface", async ({ page }) => {
    await page.goto("/kiosk");
    await expect(page.getByRole("heading", { name: "Info-Kiosk" })).toBeVisible();

    const result = await runAxe(page);
    const critical = result.violations.filter((violation) => violation.impact === "critical");

    expect(critical, `axe critical: ${JSON.stringify(critical)}`).toHaveLength(0);
  });
});
