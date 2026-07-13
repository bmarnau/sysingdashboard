import { test, expect } from "../fixtures/test-instance";

test.use({ role: "administrator" });

test.describe("Dashboard", () => {
  test("Startseite zeigt globale Suche", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("searchbox", { name: /Globale Suche/i })).toBeVisible();
  });

  test("Globale Suche akzeptiert Eingabe und Reset-Button erscheint", async ({ page }) => {
    await page.goto("/");
    const search = page.getByRole("searchbox", { name: /Globale Suche/i });
    await search.fill("Projekt");
    await expect(page.getByRole("button", { name: /Suche zurücksetzen/i })).toBeVisible();
  });

  test("Persistenz: Suchbegriff überlebt Reload NICHT (Session-only Feld)", async ({ page }) => {
    await page.goto("/");
    const search = page.getByRole("searchbox", { name: /Globale Suche/i });
    await search.fill("temp-e2e");
    await page.reload();
    // Regressions-Anker: Suche ist bewusst nicht persistiert.
    await expect(page.getByRole("searchbox", { name: /Globale Suche/i })).toHaveValue("");
  });

  test("Benutzer-Wechsel wird angezeigt (aktiver Benutzer im Header)", async ({ page }) => {
    await page.goto("/");
    // Der Benutzer-Button existiert; aria-label ist stabil.
    await expect(page.getByRole("button", { name: /Benutzer & Profile öffnen/i })).toBeVisible();
  });
});
