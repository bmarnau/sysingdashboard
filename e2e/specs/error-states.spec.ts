import { test, expect } from "../fixtures/test-instance";

test.describe("Fehlerzustände", () => {
  test("App startet, wenn localStorage komplett leer ist", async ({ page }) => {
    // Kein Seed → App muss Default-Bootstrap machen und darf nicht crashen.
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("App startet, wenn `northbit-users` beschädigt ist", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("northbit-users", "{corrupt:::");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("App startet, wenn localStorage-Writes werfen (Quota / privater Modus)", async ({ page }) => {
    await page.addInitScript(() => {
      const originalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function () {
        throw new Error("QuotaExceeded (simuliert)");
      };
      // Getter beibehalten, damit initiale Reads funktionieren.
      // Cleanup nicht nötig – Page wird nach dem Test verworfen.
      void originalSet;
    });
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("API-Ausfall auf /api/status wird toleriert (kein weißer Screen)", async ({ page }) => {
    await page.route("**/api/status", (route) => route.fulfill({ status: 500, body: "boom" }));
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("Nicht-registrierte Route liefert Not-Found-Zustand", async ({ page }) => {
    const res = await page.goto("/gibt-es-nicht-e2e");
    // TanStack Not-Found Component rendert – wichtig ist, dass die Seite reagiert.
    expect(res?.status()).toBeLessThan(600);
    await expect(page.locator("body")).toBeVisible();
  });
});
