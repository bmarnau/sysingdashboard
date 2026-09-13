import { test, expect } from "../../fixtures/test-instance";
import {
  P5_CUSTOMER_A,
  P5_CUSTOMER_B,
  P5_USER_B,
  installResponsibilityManagementMock,
} from "../../fixtures/customer-responsibility-management-e2e";

const URL = "/kundenverantwortung";

test.describe("BSF-03 P5 Kundenverantwortung", () => {
  test.use({ role: "teamlead" });

  test("Manager sieht systemhausweite Kundenverwaltung einschließlich unzugeordnetem Kunden", async ({
    page,
  }) => {
    await installResponsibilityManagementMock(page);
    await page.goto(URL);

    await expect(
      page.getByRole("heading", { name: "Kundenverantwortung", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("Alpha GmbH")).toBeVisible();
    await expect(page.getByText("Anna Admin")).toBeVisible();
    await expect(page.getByText("Beta AG")).toBeVisible();
    await expect(page.getByText("Nicht zugeordnet")).toBeVisible();
    await expect(page.getByText(/Projekte|Arbeitspakete|Tätigkeiten/)).toHaveCount(0);
  });

  test("Zuweisen und Wechseln verwendet nur die datensparsame Kandidatenliste", async ({
    page,
  }) => {
    await installResponsibilityManagementMock(page);
    await page.goto(URL);

    await page.getByRole("button", { name: /Beta AG zuweisen/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Berta Engineer");
    await expect(dialog).not.toContainText(/@|Telefon|MFA/);
    await dialog.getByLabel("Verantwortlicher Systemingenieur").selectOption(P5_USER_B);
    await dialog.getByRole("button", { name: "Zuweisen" }).click();
    await expect(page.getByText("Berta Engineer")).toBeVisible();

    await page.getByRole("button", { name: /Alpha GmbH ändern/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("Beenden macht den Kunden verwaltbar, aber unzugeordnet", async ({ page }) => {
    await installResponsibilityManagementMock(page);
    await page.goto(URL);

    await page.getByRole("button", { name: /Alpha GmbH beenden/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(/Verantwortung beenden/);
    await dialog.getByRole("button", { name: "Verantwortung beenden" }).click();

    const row = page.getByTestId(`responsibility-row-${P5_CUSTOMER_A}`);
    await expect(row).toContainText("Nicht zugeordnet");
  });

  test("serverseitige Ablehnung bleibt datenarm", async ({ page }) => {
    await installResponsibilityManagementMock(page, { denied: true });
    await page.goto(URL);

    await expect(page.getByRole("alert")).toContainText(/nicht verfügbar|keine Berechtigung/i);
    await expect(page.getByText("Alpha GmbH")).toHaveCount(0);
    await expect(page.getByText(P5_CUSTOMER_B)).toHaveCount(0);
  });
});
