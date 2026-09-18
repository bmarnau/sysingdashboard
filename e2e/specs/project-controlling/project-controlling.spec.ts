import { test, expect } from "../../fixtures/test-instance";
import {
  installProjectControllingServerFnMock,
  projectControllingResult,
  SH_A,
  CUSTOMER_A,
  PROJECT_A,
  WORK_PACKAGE_A,
} from "../../fixtures/project-controlling-e2e";

test.describe("BSF-03A Projektcontrolling – berechtigte Sicht", () => {
  test.use({ role: "projectmanager" });

  test("Projektmanager sieht KPI, Filter, Trend und Drill-down", async ({ page }) => {
    await installProjectControllingServerFnMock(page, {
      resolve: ({ filters }) => ({ kind: "ok", value: projectControllingResult(filters) }),
    });

    await page.goto("/projektcontrolling");

    await expect(page.getByRole("heading", { name: "Projektcontrolling", level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Kennzahlen" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Filter" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Täglicher Stundenverlauf" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Drill-down" })).toBeVisible();
    await expect(
      page.locator("[data-kpi]").filter({ hasText: "Gesamtstunden" }).getByText("25,00 h", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("Unbekannte Kategorie (legacy-key)")).toBeVisible();
  });

  test("abhängige Filter werden serverseitig neu geladen und bleiben identitätsbasiert", async ({
    page,
  }) => {
    await installProjectControllingServerFnMock(page, {
      resolve: ({ filters }) => ({ kind: "ok", value: projectControllingResult(filters) }),
    });

    await page.goto("/projektcontrolling");

    await page.getByLabel("Systemhaus").selectOption(SH_A);
    await expect(page.getByLabel("Kunde")).toBeEnabled();

    await page.getByLabel("Kunde").selectOption(CUSTOMER_A);
    await expect(page.getByLabel("Projekt")).toBeEnabled();
    await expect(page.getByLabel("Arbeitspaket")).toBeDisabled();

    await page.getByLabel("Projekt").selectOption(PROJECT_A);
    await expect(page.getByLabel("Arbeitspaket")).toBeEnabled();
    await page.getByLabel("Arbeitspaket").selectOption(WORK_PACKAGE_A);
    await page.getByLabel("AP-Kategorie").selectOption("wartung");

    await expect(page.getByLabel("Systemhaus")).toHaveValue(SH_A);
    await expect(page.getByLabel("Kunde")).toHaveValue(CUSTOMER_A);
    await expect(page.getByLabel("Projekt")).toHaveValue(PROJECT_A);
    await expect(page.getByLabel("Arbeitspaket")).toHaveValue(WORK_PACKAGE_A);
    await expect(page.getByLabel("AP-Kategorie")).toHaveValue("wartung");
  });

  test("Zeitraumfilter werden an die Servergrenze übergeben", async ({ page }) => {
    const seen: Array<{ from: string; to: string }> = [];
    await installProjectControllingServerFnMock(page, {
      resolve: ({ filters }) => {
        seen.push({ from: filters.from, to: filters.to });
        return { kind: "ok", value: projectControllingResult(filters) };
      },
    });

    await page.goto("/projektcontrolling");

    await page.getByLabel("Von").fill("2026-09-03");
    await expect(page.getByLabel("Von")).toHaveValue("2026-09-03");

    await page.getByLabel("Bis").fill("2026-09-10");
    await expect(page.getByLabel("Bis")).toHaveValue("2026-09-10");

    await expect.poll(() => seen.some((item) => item.from === "2026-09-03")).toBe(true);
    await expect.poll(() => seen.some((item) => item.to === "2026-09-10")).toBe(true);
  });

  test("Billable-Filter verändert Ergebnis reproduzierbar", async ({ page }) => {
    await installProjectControllingServerFnMock(page, {
      resolve: ({ filters }) => ({ kind: "ok", value: projectControllingResult(filters) }),
    });

    await page.goto("/projektcontrolling");
    await expect(
      page.locator("[data-kpi]").filter({ hasText: "Gesamtstunden" }).getByText("25,00 h", {
        exact: true,
      }),
    ).toBeVisible();

    await page.getByLabel("Abrechenbarkeit").selectOption("nonBillable");

    await expect(
      page.locator("[data-kpi]").filter({ hasText: "Gesamtstunden" }).getByText("5,00 h", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Abrechenbarkeit")).toHaveValue("nonBillable");
  });
});

for (const role of ["engineer", "viewer", "customer"] as const) {
  test.describe(`BSF-03A Projektcontrolling – Rolle ${role}`, () => {
    test.use({ role });

    test("erhält keine Controlling-Sicht", async ({ page }) => {
      await installProjectControllingServerFnMock(page, {
        resolve: () => ({
          kind: "deny",
          message: "Projektcontrolling für diesen Scope nicht zulässig.",
        }),
      });

      await page.goto("/projektcontrolling");

      await expect(page.getByRole("heading", { name: "Projektcontrolling", level: 1 })).toHaveCount(
        0,
      );
      await expect(page.getByRole("region", { name: "Kennzahlen" })).toHaveCount(0);
      await expect(page.getByText("25,00 h")).toHaveCount(0);
    });
  });
}
