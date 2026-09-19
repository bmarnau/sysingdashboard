import { test, expect } from "../../fixtures/test-instance";
import {
  installInternalKioskServerFnMock,
  KIOSK_INTERNAL_SH_FOREIGN,
  seedKioskHybridDemoDataset,
} from "../../fixtures/kiosk-internal-e2e";

for (const role of ["engineer", "viewer", "customer"] as const) {
  test.describe(`BSF-KIOSK-02 internal deny: ${role}`, () => {
    test.use({ role });

    test("redirects a normal session without project.controlling.view", async ({ page }) => {
      await page.goto("/kiosk?mode=internal");
      await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
      await expect(page.getByText("HYBRID — INTERNE DATEN + DEMO-DATEN")).toHaveCount(0);
    });
  });
}

test.describe("BSF-KIOSK-02 technical kiosk isolation", () => {
  test.use({ role: "kiosk" });

  test("does not fall back to demo performance values for manipulated internal mode", async ({
    page,
  }) => {
    await seedKioskHybridDemoDataset(page);
    await installInternalKioskServerFnMock(page, { denyAll: true });

    await page.goto("/kiosk?mode=internal");

    await expect(page.getByText("INTERNE DATEN")).toBeVisible();
    await expect(page.getByText("DEMO-DATEN — KEINE LIVE-DATEN")).toHaveCount(0);
    await expect(page.getByRole("alert")).toContainText("Kiosk-Daten konnten nicht geladen werden");
    await expect(page.getByRole("heading", { name: "Projekte" })).toHaveCount(0);
  });
});

test.describe("BSF-KIOSK-02 cross-systemhouse isolation", () => {
  test.use({ role: "projectmanager" });

  test("keeps a manipulated foreign systemhouse fail-closed", async ({ page }) => {
    await seedKioskHybridDemoDataset(page);
    await installInternalKioskServerFnMock(page, { denyForeignScope: true });

    await page.goto(`/kiosk?mode=internal&systemhouseId=${KIOSK_INTERNAL_SH_FOREIGN}`);

    await expect(page.getByText("INTERNE DATEN")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("Kiosk-Daten konnten nicht geladen werden");
    await expect(page.getByText("25 h")).toHaveCount(0);
  });
});
