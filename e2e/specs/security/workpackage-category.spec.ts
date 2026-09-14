/**
 * BSF-03D (#103) — Arbeitspaket-Kategorien: Auswahl im AP-Dialog,
 * systemhausweite Pflege nur mit `referencedata.manage`, Viewer Write DENY,
 * keine Cross-Systemhouse-Vermischung im UI.
 *
 * UI-Gating ist UX; die Sicherheitsgrenze (Grants/RLS) prüft
 * `supabase/tests/bsf03d-workpackage-category.sql`.
 */
import { test, expect } from "../../fixtures/test-instance";
import { installWorkPackageCategoryMock } from "../../fixtures/workpackage-category-e2e";

async function openServiceMenu(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /Einstellungen und Services/i }).click();
}

test.describe("BSF-03D Kategorie im Arbeitspaket-Dialog", () => {
  test.use({ role: "projectmanager" });

  test("Default keine Kategorie; nur aktive Werte des eigenen Systemhauses wählbar", async ({
    page,
  }) => {
    await installWorkPackageCategoryMock(page);
    await page.goto("/dashboard");

    await page.getByRole("button", { name: /^Neu/ }).first().click();
    await page.getByRole("button", { name: "Neues Arbeitspaket" }).click();

    const select = page.getByLabel("Kategorie");
    await expect(select).toBeVisible();
    await expect(select).toHaveValue("");
    const options = await select.locator("option").allTextContents();
    expect(options).toContain("— Keine Kategorie —");
    expect(options).toContain("Netzwerk");
    expect(options).not.toContain("Altlast (deaktiviert)");
    expect(options.join("|")).not.toMatch(/Beta-Kategorie/);

    await select.selectOption("netzwerk");
    await expect(select).toHaveValue("netzwerk");
  });

  test("Mehrfach-Membership erzwingt explizite Systemhaus-Wahl", async ({ page }) => {
    await installWorkPackageCategoryMock(page, { multiSystemhouse: true });
    await page.goto("/dashboard");

    await page.getByRole("button", { name: /^Neu/ }).first().click();
    await page.getByRole("button", { name: "Neues Arbeitspaket" }).click();

    const category = page.getByLabel("Kategorie");
    await expect(category).toBeDisabled();
    await page.getByLabel(/^Systemhaus/).selectOption({ label: "Systemhaus Beta" });
    await expect(category).toBeEnabled();
    const options = await category.locator("option").allTextContents();
    expect(options).toContain("Beta-Kategorie");
    expect(options).not.toContain("Netzwerk");
  });
});

test.describe("BSF-03D Kategorienpflege (referencedata.manage)", () => {
  test.use({ role: "administrator" });

  test("Administrator legt Kategorie systemhausbezogen an und deaktiviert statt zu löschen", async ({
    page,
  }) => {
    const log = await installWorkPackageCategoryMock(page);
    await page.goto("/dashboard");

    await openServiceMenu(page);
    // Das Servicemenü ist bei 800px Höhe länger als der Viewport; der Eintrag
    // ist vorhanden/enabled, aber außerhalb — daher programmatischer Klick.
    const entry = page.getByRole("button", { name: /Arbeitspaket-Kategorien/ });
    await expect(entry).toBeVisible();
    await entry.dispatchEvent("click");
    const dialog = page.getByRole("dialog", { name: "Arbeitspaket-Kategorien" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Löschen/ })).toHaveCount(0);

    await dialog.getByLabel(/^Bezeichnung/).fill("Cloud Services");
    const create = dialog.getByRole("button", { name: /Anlegen/ });
    await expect(create).toBeEnabled();
    await create.click();
    await expect.poll(() => log.inserts.length).toBe(1);
    expect(log.inserts[0]).toMatchObject({
      key: "cloud_services",
      label: "Cloud Services",
      systemhouse_id: "77777777-7777-4777-8777-777777777771",
    });

    await dialog.getByRole("button", { name: "Deaktivieren: Netzwerk" }).click();
    await expect.poll(() => log.updates.length).toBe(1);
    expect(log.updates[0]).toMatchObject({ is_active: false });
  });
});

test.describe("BSF-03D Viewer DENY", () => {
  test.use({ role: "viewer" });

  test("Viewer sieht keinen Pflege-Eintrag und kein Arbeitspaket-Anlegen", async ({ page }) => {
    const log = await installWorkPackageCategoryMock(page);
    await page.goto("/dashboard");

    await openServiceMenu(page);
    await expect(page.getByRole("button", { name: /Arbeitspaket-Kategorien/ })).toHaveCount(0);
    await page.keyboard.press("Escape");

    await expect(page.getByRole("button", { name: "Neues Arbeitspaket" })).toHaveCount(0);
    expect(log.inserts).toHaveLength(0);
    expect(log.updates).toHaveLength(0);
  });
});
