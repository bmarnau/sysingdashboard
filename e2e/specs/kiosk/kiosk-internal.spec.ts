import { test, expect } from "../../fixtures/test-instance";
import { runAxe } from "../../fixtures/axe";
import {
  installInternalKioskServerFnMock,
  KIOSK_INTERNAL_SH_A,
  seedKioskHybridDemoDataset,
} from "../../fixtures/kiosk-internal-e2e";

test.use({ role: "projectmanager" });

test.describe("BSF-KIOSK-02 internal hybrid wallboard", () => {
  test.beforeEach(async ({ page }) => {
    await seedKioskHybridDemoDataset(page);
    await installInternalKioskServerFnMock(page);
  });

  test("shows internal performance aggregates next to clearly marked demo domains", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(`/kiosk?mode=internal&systemhouseId=${KIOSK_INTERNAL_SH_A}`);

    await expect(page.getByRole("heading", { name: "Info-Kiosk" })).toBeVisible();
    await expect(page.getByText("HYBRID — INTERNE DATEN + DEMO-DATEN")).toBeVisible();
    await expect(page.getByText("Zeitraum: 01.09.2026 – 19.09.2026")).toBeVisible();
    await expect(page.getByText("25 h")).toBeVisible();
    await expect(page.getByText("80 %")).toBeVisible();
    await expect(page.getByText("INTERN", { exact: true })).toHaveCount(3);
    await expect(page.getByText("DEMO", { exact: true })).toHaveCount(3);
    await expect(page.getByText("Quelle: synthetische Demo-Daten")).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Projektcontrolling öffnen" })).toBeVisible();

    for (const forbidden of ["Kunde Alpha", "Vertrauliche Tätigkeit", "engineer_id", "EUR", "€"]) {
      await expect(page.getByText(forbidden, { exact: false })).toHaveCount(0);
    }

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });

  test("has no critical accessibility violations in hybrid mode", async ({ page }) => {
    await page.goto(`/kiosk?mode=internal&systemhouseId=${KIOSK_INTERNAL_SH_A}`);
    await expect(page.getByText("HYBRID — INTERNE DATEN + DEMO-DATEN")).toBeVisible();

    const result = await runAxe(page);
    const critical = result.violations.filter((violation) => violation.impact === "critical");
    expect(critical).toHaveLength(0);
  });
});
