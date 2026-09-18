import { test, expect } from "../../fixtures/test-instance";
import {
  installProjectControllingServerFnMock,
  projectControllingResult,
  SH_A,
  SH_B,
  CUSTOMER_A,
  CUSTOMER_FOREIGN,
} from "../../fixtures/project-controlling-e2e";

test.describe("BSF-03A Projektcontrolling – Scope/IDOR/BOLA", () => {
  test.use({ role: "projectmanager" });

  test("fremdes Systemhaus liefert generische Ablehnung ohne Daten", async ({ page }) => {
    await installProjectControllingServerFnMock(page, {
      resolve: ({ filters }) =>
        filters.systemhouseId === SH_B
          ? {
              kind: "deny",
              message: "Projektcontrolling für diesen Scope nicht zulässig.",
            }
          : { kind: "ok", value: projectControllingResult(filters) },
    });

    await page.goto("/projektcontrolling");
    await page.getByLabel("Systemhaus").selectOption(SH_B);

    await expect(page.getByRole("alert")).toContainText("konnte nicht geladen werden");
    await expect(page.getByText("Kunde Alpha")).toHaveCount(0);
  });

  test("fremder Customer-Scope liefert keine fremden Daten", async ({ page }) => {
    await installProjectControllingServerFnMock(page, {
      resolve: ({ filters }) =>
        filters.systemhouseId === SH_A && filters.customerId === CUSTOMER_FOREIGN
          ? {
              kind: "deny",
              message: "Projektcontrolling für diesen Scope nicht zulässig.",
            }
          : { kind: "ok", value: projectControllingResult(filters) },
    });

    await page.goto("/projektcontrolling");
    await page.getByLabel("Systemhaus").selectOption(SH_A);
    await page.getByLabel("Kunde").selectOption(CUSTOMER_FOREIGN);

    await expect(page.getByRole("alert")).toContainText("konnte nicht geladen werden");
    await expect(page.getByText("Fremdkunde Geheim")).toHaveCount(0);
  });

  test("gleichartige Ablehnung verrät nicht, ob fremder Scope existiert", async ({ page }) => {
    const messages: string[] = [];
    await installProjectControllingServerFnMock(page, {
      resolve: ({ filters }) => {
        if (!filters.customerId || filters.customerId === CUSTOMER_A) {
          return { kind: "ok", value: projectControllingResult(filters) };
        }
        messages.push("Projektcontrolling für diesen Scope nicht zulässig.");
        return {
          kind: "deny",
          message: "Projektcontrolling für diesen Scope nicht zulässig.",
        };
      },
    });

    await page.goto("/projektcontrolling");
    await page.getByLabel("Systemhaus").selectOption(SH_A);
    await page.getByLabel("Kunde").selectOption(CUSTOMER_FOREIGN);

    await expect(page.getByRole("alert")).toContainText("konnte nicht geladen werden");
    expect(new Set(messages).size).toBe(1);
  });
});